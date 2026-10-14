/**
 * DailyPlanner — ponto de entrada.
 *
 * A agenda responde a uma pergunta só: **quando?** Ela guarda horários,
 * compromissos e o mínimo para saber se um deles ainda precisa virar relatório.
 * O que aconteceu durante a atividade é do Kizeo Forms, e a agenda nunca guarda
 * uma cópia disso.
 *
 * Este arquivo é apenas fiação: estado, renderização e eventos. Regra de negócio
 * mora em `domain/`, persistência em `storage/`, e a fronteira com o Kizeo em
 * `integration/`.
 */

import {
  CRITERIOS_PADRAO,
  type CriteriosAgenda,
  contarPorCategoria,
  FILTROS,
  type FiltroStatus,
  filtrarAgenda,
  temFiltroAtivo,
} from "./domain/agenda.ts";
import { tipoRelatorioDe } from "./domain/categoria.ts";
import {
  aguardandoRelatorio,
  type Compromisso,
  compromissosDoDia,
  compromissosNoIntervalo,
  criarCompromisso,
  ordenarCompromissos,
  resumirDia,
  validarCompromisso,
} from "./domain/compromisso.ts";
import {
  formatDuration,
  formatLongDate,
  formatShortDate,
  shiftDate,
  startOfWeek,
  todayISO,
  weekDays,
} from "./domain/datetime.ts";
import {
  criarIntegrationId,
  ORIGEM,
  type ContextoRelatorio,
  type ReferenciaRelatorio,
  type RespostaRelatorio,
  VERSAO_CONTRATO,
} from "./domain/integracao.ts";
import { expandirRecorrencia, novoIdSerie, validarRecorrencia } from "./domain/recorrencia.ts";
import {
  carregarAgenda,
  lerExportacao,
  mesclarImportacao,
  montarExportacao,
  salvarAgenda,
} from "./storage/agenda.ts";
import {
  carregarConfiguracao,
  type Configuracao,
  normalizarBaseUrl,
  origemDe,
  salvarConfiguracao,
  type Tema,
} from "./storage/configuracao.ts";
import { armazenamentoDisponivel } from "./storage/local.ts";
import { abrirRegistro, esquecerJanela, iniciarEscuta, limparJanelasFechadas } from "./integration/kizeo.ts";
import {
  avisoRelatorios,
  cartaoCompromisso,
  cartaoProximo,
  colunaSemana,
  estadoVazio,
  filtrosCategoria,
  linhaResumo,
} from "./ui/componentes.ts";
import { htmlConfiguracoes, lerConfiguracoes } from "./ui/configuracoes.ts";
import { htmlFormulario, lerFormulario } from "./ui/formulario.ts";
import { classes, escaparHtml } from "./ui/html.ts";
import "./style.css";

type Visao = "dia" | "semana";

const raiz = document.querySelector<HTMLDivElement>("#app");
if (!raiz) throw new Error("Não foi possível montar o Daily Planner.");
const app: HTMLDivElement = raiz;

const carga = carregarAgenda();
let compromissos: Compromisso[] = carga.compromissos;
let configuracao: Configuracao = carregarConfiguracao();
let dataSelecionada = todayISO();
let criterios: CriteriosAgenda = { ...CRITERIOS_PADRAO };
let visao: Visao = "dia";
let temporizadorAviso: number | undefined;

// ---------------------------------------------------------------- persistência

function persistir(): void {
  const resultado = salvarAgenda(compromissos);
  if (!resultado.ok) {
    avisar(resultado.motivo ?? "Não foi possível salvar a agenda.", "erro");
  }
}

// ------------------------------------------------------------------------ tema

function aplicarTema(): void {
  document.documentElement.dataset.theme = configuracao.tema;
  document.documentElement.style.colorScheme = configuracao.tema;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", configuracao.tema === "dark" ? "#10251e" : "#162a24");
}

function alternarTema(): void {
  const proximo: Tema = configuracao.tema === "dark" ? "light" : "dark";
  configuracao = { ...configuracao, tema: proximo };
  salvarConfiguracao(configuracao);
  aplicarTema();
  renderizar();
  avisar(proximo === "dark" ? "Modo escuro ativado." : "Modo claro ativado.");
}

// -------------------------------------------------------------------- avisos

function avisar(mensagem: string, tom: "sucesso" | "erro" = "sucesso"): void {
  const regiao = document.querySelector<HTMLDivElement>("#toast-region");
  if (!regiao) return;
  window.clearTimeout(temporizadorAviso);
  regiao.innerHTML = `<div class="toast ${tom}">${tom === "sucesso" ? "✓" : "!"} ${escaparHtml(mensagem)}</div>`;
  temporizadorAviso = window.setTimeout(() => {
    regiao.innerHTML = "";
  }, 4200);
}

// -------------------------------------------------------------- renderização

function baseDaVisao(): Compromisso[] {
  return visao === "dia"
    ? compromissosDoDia(compromissos, dataSelecionada)
    : compromissosNoIntervalo(
        compromissos,
        startOfWeek(dataSelecionada),
        shiftDate(startOfWeek(dataSelecionada), 6),
      );
}

function htmlLista(): string {
  const base = baseDaVisao();
  const visiveis = filtrarAgenda(base, criterios);
  const integracaoAtiva = configuracao.integracao.ativa;

  if (visao === "semana") {
    const hoje = todayISO();
    const colunas = weekDays(dataSelecionada)
      .map((data) =>
        colunaSemana(
          data,
          visiveis.filter((compromisso) => compromisso.date === data),
          data === dataSelecionada,
          hoje,
        ),
      )
      .join("");
    return `<div class="grade-semana">${colunas}</div>`;
  }

  if (!visiveis.length) return estadoVazio(base.length > 0);
  return visiveis.map((compromisso) => cartaoCompromisso(compromisso, integracaoAtiva)).join("");
}

/** Redesenha só a lista e os contadores — usado pela busca, para não perder o cursor. */
function renderizarLista(): void {
  const lista = app.querySelector<HTMLDivElement>("#task-list");
  if (!lista) {
    renderizar();
    return;
  }
  lista.innerHTML = htmlLista();
  atualizarContadores();
}

function atualizarContadores(): void {
  const base = baseDaVisao();
  const resumo = resumirDia(base);
  const contagens: Record<FiltroStatus, number> = {
    todos: base.length,
    pendentes: resumo.pendentes,
    concluidos: resumo.concluidos,
    "sem-relatorio": resumo.relatoriosPendentes,
  };
  for (const filtro of FILTROS) {
    const alvo = app.querySelector<HTMLSpanElement>(`[data-filtro="${filtro.id}"] span`);
    if (alvo) alvo.textContent = String(contagens[filtro.id]);
  }
}

function proximoCompromisso(): Compromisso | null {
  const agora = new Date();
  const hora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  const hoje = todayISO();
  return (
    ordenarCompromissos(compromissos).find(
      (compromisso) =>
        !compromisso.completed &&
        (compromisso.date > hoje || (compromisso.date === hoje && compromisso.endTime >= hora)),
    ) ?? null
  );
}

function pendentesDeRelatorio(): Compromisso[] {
  if (!configuracao.integracao.ativa) return [];
  const hoje = todayISO();
  return ordenarCompromissos(
    compromissos.filter((compromisso) => compromisso.date <= hoje && aguardandoRelatorio(compromisso)),
  ).reverse();
}

function renderizar(): void {
  const base = baseDaVisao();
  const resumo = resumirDia(base);
  const hoje = todayISO();
  const contagemCategorias = contarPorCategoria(base);
  const rotuloProgresso = resumo.total === 0 ? "Comece a planejar" : `${resumo.percentual}% concluído`;
  const semanaInicio = startOfWeek(dataSelecionada);
  const tituloConteudo =
    visao === "dia"
      ? formatLongDate(dataSelecionada)
      : `Semana de ${formatShortDate(semanaInicio)} a ${formatShortDate(shiftDate(semanaInicio, 6))}`;

  const contagens: Record<FiltroStatus, number> = {
    todos: base.length,
    pendentes: resumo.pendentes,
    concluidos: resumo.concluidos,
    "sem-relatorio": resumo.relatoriosPendentes,
  };

  app.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <button class="brand" type="button" data-acao="hoje" aria-label="Ir para hoje">
          <span class="brand-mark">DP</span>
          <span>
            <span class="eyebrow">PLANEJAMENTO PESSOAL</span>
            <strong>Daily Planner</strong>
          </span>
        </button>
        <div class="header-actions">
          <button class="button subtle" type="button" data-acao="exportar">Exportar</button>
          <label class="button subtle import-button">
            Importar
            <input id="import-file" type="file" accept="application/json,.json" />
          </label>
          <button class="button subtle" type="button" data-acao="configuracoes">Configurações</button>
          <button class="button subtle theme-toggle" type="button" data-acao="tema"
            aria-pressed="${configuracao.tema === "dark"}">
            <span aria-hidden="true">${configuracao.tema === "dark" ? "☼" : "◐"}</span>
            <span>${configuracao.tema === "dark" ? "Modo claro" : "Modo escuro"}</span>
          </button>
          <button class="button primary" type="button" data-acao="novo">+ Novo compromisso</button>
        </div>
      </header>

      <section class="welcome-panel">
        <div>
          <span class="eyebrow light">${dataSelecionada === hoje ? "SEU FOCO DE HOJE" : "VISÃO DA AGENDA"}</span>
          <h1>Um dia de cada vez.</h1>
          <p>Organize o que importa e deixe espaço para o que surgir.</p>
        </div>
        <div class="welcome-stamp" aria-hidden="true">
          <span>${String(resumo.total).padStart(2, "0")}</span>
          <small>${visao === "dia" ? "itens no dia" : "itens na semana"}</small>
        </div>
      </section>

      <main class="workspace">
        <aside class="sidebar">
          <section class="date-card">
            <div class="section-label">NAVEGAR</div>
            <div class="date-navigation">
              <button class="icon-button" type="button" data-passo="-1"
                aria-label="${visao === "dia" ? "Dia anterior" : "Semana anterior"}">←</button>
              <div class="selected-date">
                <strong>${formatShortDate(dataSelecionada)}</strong>
                <span>${dataSelecionada === hoje ? "Hoje" : "Data selecionada"}</span>
              </div>
              <button class="icon-button" type="button" data-passo="1"
                aria-label="${visao === "dia" ? "Próximo dia" : "Próxima semana"}">→</button>
            </div>
            <label class="date-picker-label" for="date-picker">Escolher outra data</label>
            <input id="date-picker" class="date-picker" type="date" value="${dataSelecionada}" />
            <button class="button full subtle" type="button" data-acao="hoje">Voltar para hoje</button>
          </section>

          <section class="sidebar-section">
            <div class="section-label">PRÓXIMO COMPROMISSO</div>
            ${cartaoProximo(proximoCompromisso())}
          </section>

          <section class="sidebar-section">
            <div class="section-label">RESUMO ${visao === "dia" ? "DO DIA" : "DA SEMANA"}</div>
            <div class="summary-list">
              ${linhaResumo("Total", String(resumo.total))}
              ${linhaResumo("Pendentes", String(resumo.pendentes))}
              ${linhaResumo("Concluídos", String(resumo.concluidos))}
              ${linhaResumo("Tempo ocupado", formatDuration(resumo.minutos))}
            </div>
            <div class="progress-block">
              <div><span>Progresso</span><strong>${rotuloProgresso}</strong></div>
              <div class="progress-track" role="progressbar" aria-valuenow="${resumo.percentual}"
                aria-valuemin="0" aria-valuemax="100" aria-label="${rotuloProgresso}">
                <span style="width: ${resumo.percentual}%"></span>
              </div>
            </div>
          </section>

          ${avisoRelatorios(pendentesDeRelatorio())}
        </aside>

        <section class="agenda-content" aria-labelledby="agenda-heading">
          <div class="content-heading">
            <div>
              <span class="eyebrow">${dataSelecionada === hoje && visao === "dia" ? "AGENDA DE HOJE" : "AGENDA"}</span>
              <h2 id="agenda-heading">${escaparHtml(tituloConteudo)}</h2>
            </div>
            <div class="search-box">
              <span aria-hidden="true">⌕</span>
              <label class="sr-only" for="search">Buscar compromissos</label>
              <input id="search" type="search" placeholder="Buscar compromisso"
                value="${escaparHtml(criterios.busca)}" />
            </div>
          </div>

          <div class="barra-visao" role="tablist" aria-label="Modo de visualização">
            <button class="${classes("botao-visao", visao === "dia" && "active")}" type="button"
              role="tab" aria-selected="${visao === "dia"}" data-visao="dia">Dia</button>
            <button class="${classes("botao-visao", visao === "semana" && "active")}" type="button"
              role="tab" aria-selected="${visao === "semana"}" data-visao="semana">Semana</button>
          </div>

          <div class="filter-row" role="toolbar" aria-label="Filtrar compromissos">
            ${FILTROS.map(
              (filtro) => `<button class="${classes("filter-button", criterios.status === filtro.id && "active")}"
                type="button" data-filtro="${filtro.id}">${filtro.rotulo} <span>${contagens[filtro.id]}</span></button>`,
            ).join("")}
          </div>

          <div class="categoria-row" aria-label="Filtrar por categoria">
            ${filtrosCategoria(criterios.categoria, contagemCategorias)}
            ${
              temFiltroAtivo(criterios)
                ? '<button class="chip-categoria limpar" type="button" data-acao="limpar-filtros">Limpar filtros</button>'
                : ""
            }
          </div>

          <div class="agenda-list ${visao === "semana" ? "modo-semana" : ""}" id="task-list">${htmlLista()}</div>

          <p class="storage-note">
            <span>●</span>
            ${
              armazenamentoDisponivel()
                ? "Seus dados ficam salvos neste navegador."
                : "Este navegador bloqueou o armazenamento: os dados não serão salvos."
            }
          </p>
        </section>
      </main>
      <div id="dialog-root"></div>
      <div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div>
    </div>`;
}

// ------------------------------------------------------------------- diálogos

function fecharDialogo(): void {
  const raizDialogo = document.querySelector<HTMLDivElement>("#dialog-root");
  if (raizDialogo) raizDialogo.innerHTML = "";
}

function abrirFormulario(compromisso?: Compromisso): void {
  const raizDialogo = document.querySelector<HTMLDivElement>("#dialog-root");
  if (!raizDialogo) return;
  raizDialogo.innerHTML = htmlFormulario(dataSelecionada, compromisso);

  const dialogo = raizDialogo.querySelector<HTMLDialogElement>("#task-dialog");
  const form = raizDialogo.querySelector<HTMLFormElement>("#task-form");
  if (!dialogo || !form) return;
  dialogo.showModal();
  dialogo.addEventListener("close", fecharDialogo);
  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });
  form.querySelectorAll<HTMLElement>("[data-fechar]").forEach((botao) => {
    botao.addEventListener("click", () => dialogo.close());
  });

  const marcadorRepetir = form.querySelector<HTMLInputElement>('[name="repetir"]');
  const camposRepeticao = form.querySelector<HTMLDivElement>(".repeticao-campos");
  marcadorRepetir?.addEventListener("change", () => {
    if (camposRepeticao) camposRepeticao.hidden = !marcadorRepetir.checked;
  });

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    submeterFormulario(form, dialogo, compromisso);
  });
}

function mostrarErroFormulario(form: HTMLFormElement, campo: string, mensagem: string): void {
  const caixa = form.querySelector<HTMLDivElement>("#form-error");
  const especifico = form.querySelector<HTMLElement>(`#error-${campo}`);
  if (especifico) {
    especifico.textContent = mensagem;
    especifico.classList.add("visible");
  } else if (caixa) {
    caixa.textContent = mensagem;
  }
  form.querySelector<HTMLElement>(`[name="${campo}"]`)?.focus();
}

function submeterFormulario(
  form: HTMLFormElement,
  dialogo: HTMLDialogElement,
  compromisso?: Compromisso,
): void {
  form.querySelectorAll<HTMLElement>(".field small").forEach((elemento) => {
    elemento.textContent = "";
    elemento.classList.remove("visible");
  });
  const caixa = form.querySelector<HTMLDivElement>("#form-error");
  if (caixa) caixa.textContent = "";

  const { rascunho, recorrencia } = lerFormulario(form);
  const erro = validarCompromisso(rascunho, compromissos, compromisso?.id);
  if (erro) {
    mostrarErroFormulario(form, erro.campo, erro.message);
    return;
  }

  if (compromisso) {
    aplicarEdicao(compromisso, rascunho);
    dialogo.close();
    dataSelecionada = rascunho.date;
    persistir();
    renderizar();
    avisar("Compromisso atualizado.");
    return;
  }

  if (recorrencia) {
    const erroRegra = validarRecorrencia(rascunho.date, recorrencia);
    if (erroRegra) {
      mostrarErroFormulario(form, "ate", erroRegra.message);
      const caixaErro = form.querySelector<HTMLDivElement>("#form-error");
      if (caixaErro) caixaErro.textContent = erroRegra.message;
      return;
    }
  }

  const criados = criarSerie(rascunho, recorrencia);
  if (!criados.aceitos.length) {
    const caixaErro = form.querySelector<HTMLDivElement>("#form-error");
    if (caixaErro) caixaErro.textContent = "Todas as datas da repetição conflitam com a agenda.";
    return;
  }

  compromissos = ordenarCompromissos([...compromissos, ...criados.aceitos]);
  dataSelecionada = rascunho.date;
  dialogo.close();
  persistir();
  renderizar();
  avisar(
    criados.recusados
      ? `${criados.aceitos.length} compromisso(s) adicionado(s). ${criados.recusados} data(s) em conflito foram puladas.`
      : criados.aceitos.length > 1
        ? `${criados.aceitos.length} compromissos adicionados à agenda.`
        : "Compromisso adicionado à agenda.",
    criados.recusados ? "erro" : "sucesso",
  );
}

/**
 * Editar um compromisso pode invalidar a referência de relatório: se a categoria
 * mudou, o tipo de relatório mudou junto, e a referência antiga aponta para um
 * registro de outro tipo. Nesse caso a referência é descartada — a agenda passa
 * a mostrar "não criado" em vez de mentir sobre um relatório que não corresponde.
 */
function aplicarEdicao(compromisso: Compromisso, rascunho: ReturnType<typeof lerFormulario>["rascunho"]): void {
  const trocouCategoria = compromisso.category !== rascunho.category;
  compromissos = compromissos.map((item) =>
    item.id === compromisso.id
      ? {
          ...item,
          ...rascunho,
          title: rascunho.title.trim(),
          description: rascunho.description.trim(),
          report: trocouCategoria ? null : item.report,
        }
      : item,
  );
}

interface SerieCriada {
  aceitos: Compromisso[];
  recusados: number;
}

/** Materializa a série, pulando as datas que colidiriam com algo já marcado. */
function criarSerie(
  rascunho: ReturnType<typeof lerFormulario>["rascunho"],
  recorrencia: ReturnType<typeof lerFormulario>["recorrencia"],
): SerieCriada {
  if (!recorrencia) {
    return { aceitos: [criarCompromisso(rascunho)], recusados: 0 };
  }

  const serieId = novoIdSerie();
  const datas = expandirRecorrencia(rascunho.date, recorrencia);
  const aceitos: Compromisso[] = [];
  let recusados = 0;

  for (const data of datas) {
    const candidato = { ...rascunho, date: data };
    if (validarCompromisso(candidato, [...compromissos, ...aceitos])) {
      recusados += 1;
      continue;
    }
    aceitos.push(criarCompromisso(rascunho, { date: data, seriesId: serieId }));
  }

  return { aceitos, recusados };
}

function abrirConfiguracoes(): void {
  const raizDialogo = document.querySelector<HTMLDivElement>("#dialog-root");
  if (!raizDialogo) return;
  raizDialogo.innerHTML = htmlConfiguracoes(configuracao);

  const dialogo = raizDialogo.querySelector<HTMLDialogElement>("#config-dialog");
  const form = raizDialogo.querySelector<HTMLFormElement>("#config-form");
  if (!dialogo || !form) return;
  dialogo.showModal();
  dialogo.addEventListener("close", fecharDialogo);
  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });
  form.querySelectorAll<HTMLElement>("[data-fechar]").forEach((botao) => {
    botao.addEventListener("click", () => dialogo.close());
  });

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const leitura = lerConfiguracoes(form);
    const caixa = form.querySelector<HTMLDivElement>("#config-error");

    const normalizada = normalizarBaseUrl(leitura.baseUrl);
    if (!normalizada) {
      if (caixa) caixa.textContent = "Informe um endereço http(s) válido, ou deixe o campo vazio.";
      return;
    }
    if (leitura.ativa && !normalizada.url) {
      if (caixa) caixa.textContent = "Informe o endereço do Kizeo para ativar a integração.";
      return;
    }

    configuracao = {
      ...configuracao,
      integracao: {
        ativa: leitura.ativa && normalizada.url !== "",
        baseUrl: normalizada.url,
        abrirEmNovaAba: leitura.abrirEmNovaAba,
      },
    };
    salvarConfiguracao(configuracao);
    dialogo.close();
    renderizar();
    avisar(
      normalizada.sanitizada
        ? "Configurações salvas. Credenciais e parâmetros foram removidos do endereço."
        : "Configurações salvas.",
    );
  });
}

// -------------------------------------------------------------- integração

/** Anexa ou atualiza a referência de relatório de um compromisso. */
function atualizarReferencia(id: string, referencia: ReferenciaRelatorio | null): void {
  compromissos = compromissos.map((item) => (item.id === id ? { ...item, report: referencia } : item));
  persistir();
}

function registrarRelatorio(compromisso: Compromisso): void {
  const { integracao } = configuracao;
  if (!integracao.ativa) {
    avisar("Ative a integração com o Kizeo nas configurações.", "erro");
    return;
  }
  const tipo = tipoRelatorioDe(compromisso.category);
  if (!tipo) {
    avisar("Esta categoria não gera relatório no Kizeo.", "erro");
    return;
  }

  const integrationId = criarIntegrationId(compromisso.id, tipo);
  const contexto: ContextoRelatorio = {
    v: VERSAO_CONTRATO,
    source: ORIGEM,
    integrationId,
    reportType: tipo,
    schedule: {
      id: compromisso.id,
      date: compromisso.date,
      start: compromisso.startTime,
      end: compromisso.endTime,
      title: compromisso.title,
      category: compromisso.category,
      ...(compromisso.description ? { notes: compromisso.description } : {}),
    },
  };

  // A intenção é registrada ANTES de abrir a janela: se o usuário estiver
  // offline, fechar a aba ou o navegador bloquear o pop-up, o compromisso
  // continua marcado como pendente e reaparece na lista de "a registrar".
  atualizarReferencia(compromisso.id, {
    integrationId,
    status: "pendente",
    reportId: compromisso.report?.reportId ?? null,
    reportUrl: compromisso.report?.reportUrl ?? null,
    reportType: tipo,
    updatedAt: new Date().toISOString(),
    message: null,
  });

  const resultado = abrirRegistro({
    baseUrl: integracao.baseUrl,
    abrirEmNovaAba: integracao.abrirEmNovaAba,
    contexto,
  });

  if (!resultado.ok) {
    atualizarReferencia(compromisso.id, {
      integrationId,
      status: "erro",
      reportId: null,
      reportUrl: null,
      reportType: tipo,
      updatedAt: new Date().toISOString(),
      message: resultado.motivo,
    });
    renderizar();
    avisar(resultado.motivo, "erro");
    return;
  }

  renderizar();
  avisar("Contexto enviado ao Kizeo. Preencha o relatório na janela aberta.");
}

function receberReferencia(resposta: RespostaRelatorio): void {
  const alvo = compromissos.find(
    (compromisso) => compromisso.report?.integrationId === resposta.integrationId,
  );
  if (!alvo) return;

  atualizarReferencia(alvo.id, {
    integrationId: resposta.integrationId,
    status: resposta.status,
    reportId: resposta.reportId,
    reportUrl: resposta.reportUrl,
    reportType: resposta.reportType ?? alvo.report?.reportType ?? null,
    updatedAt: new Date().toISOString(),
    message: null,
  });

  if (resposta.status !== "pendente" && resposta.status !== "erro") {
    esquecerJanela(resposta.integrationId);
  }
  renderizar();
  avisar(
    resposta.status === "enviado"
      ? "Relatório enviado no Kizeo."
      : resposta.status === "rascunho"
        ? "Rascunho salvo no Kizeo."
        : "Relatório registrado no Kizeo.",
  );
}

// -------------------------------------------------------- exportar / importar

function exportar(): void {
  if (!compromissos.length) {
    avisar("Adicione pelo menos um compromisso antes de exportar.", "erro");
    return;
  }
  const blob = new Blob([montarExportacao(compromissos)], { type: "application/json" });
  const endereco = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = endereco;
  link.download = `daily-planner-${todayISO()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  // Revogar imediatamente cancelava o download em alguns navegadores.
  window.setTimeout(() => URL.revokeObjectURL(endereco), 30_000);
  avisar("Agenda exportada com sucesso.");
}

function importar(arquivo: File): void {
  const leitor = new FileReader();
  leitor.addEventListener("error", () => avisar("Não foi possível ler o arquivo.", "erro"));
  leitor.addEventListener("load", () => {
    const importados = lerExportacao(String(leitor.result));
    if (!importados) {
      avisar("Não foi possível importar este arquivo JSON.", "erro");
      return;
    }

    const substituir =
      compromissos.length > 0 &&
      window.confirm(
        `Foram encontrados ${importados.length} compromisso(s).\n\n` +
          "OK — substituir toda a agenda atual.\n" +
          "Cancelar — juntar com o que já existe (recomendado).",
      );

    const resultado = mesclarImportacao(
      compromissos,
      importados,
      substituir ? "substituir" : "mesclar",
    );
    compromissos = resultado.compromissos;
    persistir();
    if (compromissos.length) dataSelecionada = compromissos[0].date;
    renderizar();
    avisar(
      resultado.ignorados
        ? `${resultado.adicionados} compromisso(s) importado(s). ${resultado.ignorados} já existia(m).`
        : `${resultado.adicionados} compromisso(s) importado(s).`,
    );
  });
  leitor.readAsText(arquivo);
}

// ---------------------------------------------------------------- ações

function acaoCompromisso(acao: string, id: string): void {
  const compromisso = compromissos.find((item) => item.id === id);
  if (!compromisso) return;

  if (acao === "concluir") {
    compromissos = compromissos.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item,
    );
    persistir();
    renderizar();
    avisar(compromisso.completed ? "Compromisso reaberto." : "Compromisso concluído.");
    return;
  }

  if (acao === "editar") {
    abrirFormulario(compromisso);
    return;
  }

  if (acao === "registrar") {
    registrarRelatorio(compromisso);
    return;
  }

  if (acao === "excluir") {
    excluir(compromisso);
  }
}

function excluir(compromisso: Compromisso): void {
  const naSerie = compromisso.seriesId
    ? compromissos.filter((item) => item.seriesId === compromisso.seriesId).length
    : 0;

  if (naSerie > 1) {
    const serieInteira = window.confirm(
      `“${compromisso.title}” faz parte de uma série com ${naSerie} ocorrências.\n\n` +
        "OK — excluir a série inteira.\n" +
        "Cancelar — excluir apenas esta ocorrência.",
    );
    if (serieInteira) {
      compromissos = compromissos.filter((item) => item.seriesId !== compromisso.seriesId);
      persistir();
      renderizar();
      avisar(`Série excluída (${naSerie} compromissos).`);
      return;
    }
  } else if (!window.confirm(`Excluir “${compromisso.title}”?`)) {
    return;
  }

  compromissos = compromissos.filter((item) => item.id !== compromisso.id);
  persistir();
  renderizar();
  avisar("Compromisso excluído.");
}

// ---------------------------------------------------------------- eventos

/**
 * Um ouvinte por tipo de evento, na raiz. Antes, cada `render()` reanexava
 * dezenas de ouvintes — o que também obrigava a redesenhar tudo a cada tecla da
 * busca, e por isso o cursor precisava ser recolocado na mão.
 */
function ligarEventos(): void {
  app.addEventListener("click", (evento) => {
    const alvo = evento.target as HTMLElement | null;
    if (!alvo) return;

    const passo = alvo.closest<HTMLElement>("[data-passo]");
    if (passo) {
      const dias = Number(passo.dataset.passo ?? 0) * (visao === "semana" ? 7 : 1);
      dataSelecionada = shiftDate(dataSelecionada, dias);
      renderizar();
      return;
    }

    const visaoAlvo = alvo.closest<HTMLElement>("[data-visao]");
    if (visaoAlvo) {
      visao = visaoAlvo.dataset.visao === "semana" ? "semana" : "dia";
      renderizar();
      return;
    }

    const filtro = alvo.closest<HTMLElement>("[data-filtro]");
    if (filtro) {
      criterios = { ...criterios, status: (filtro.dataset.filtro ?? "todos") as FiltroStatus };
      renderizar();
      return;
    }

    const categoria = alvo.closest<HTMLElement>("[data-categoria]");
    if (categoria) {
      const valor = categoria.dataset.categoria ?? "";
      criterios = { ...criterios, categoria: valor === "" ? null : valor };
      renderizar();
      return;
    }

    const acaoElemento = alvo.closest<HTMLElement>("[data-acao]");
    if (!acaoElemento) return;
    const acao = acaoElemento.dataset.acao ?? "";
    const id = acaoElemento.dataset.id;

    switch (acao) {
      case "novo":
        abrirFormulario();
        break;
      case "hoje":
        dataSelecionada = todayISO();
        renderizar();
        break;
      case "abrir-dia": {
        const data = acaoElemento.dataset.data;
        if (data) {
          dataSelecionada = data;
          visao = "dia";
          renderizar();
        }
        break;
      }
      case "exportar":
        exportar();
        break;
      case "configuracoes":
        abrirConfiguracoes();
        break;
      case "tema":
        alternarTema();
        break;
      case "limpar-filtros":
        criterios = { ...CRITERIOS_PADRAO };
        renderizar();
        break;
      default:
        if (id) acaoCompromisso(acao, id);
    }
  });

  app.addEventListener("input", (evento) => {
    const alvo = evento.target as HTMLElement | null;
    if (alvo?.id === "search") {
      criterios = { ...criterios, busca: (alvo as HTMLInputElement).value };
      renderizarLista();
    }
  });

  app.addEventListener("change", (evento) => {
    const alvo = evento.target as HTMLInputElement | null;
    if (!alvo) return;

    if (alvo.id === "date-picker" && alvo.value) {
      dataSelecionada = alvo.value;
      renderizar();
      return;
    }

    if (alvo.id === "import-file") {
      const arquivo = alvo.files?.[0];
      // Zerar o campo permite reimportar o mesmo arquivo depois; sem isso o
      // segundo `change` nunca dispara.
      alvo.value = "";
      if (arquivo) importar(arquivo);
    }
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key !== "n" || evento.ctrlKey || evento.metaKey || evento.altKey) return;
    const ativo = document.activeElement;
    const digitando =
      ativo instanceof HTMLInputElement ||
      ativo instanceof HTMLTextAreaElement ||
      ativo instanceof HTMLSelectElement;
    if (digitando || document.querySelector("dialog[open]")) return;
    evento.preventDefault();
    abrirFormulario();
  });

  window.addEventListener("focus", limparJanelasFechadas);
}

// ------------------------------------------------------------------- boot

aplicarTema();
ligarEventos();
iniciarEscuta(() => origemDe(configuracao.integracao.baseUrl), receberReferencia);
renderizar();

if (carga.migrado) {
  avisar("Agenda migrada para o novo formato. Nada foi perdido.");
}
