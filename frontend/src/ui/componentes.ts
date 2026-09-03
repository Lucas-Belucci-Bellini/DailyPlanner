/**
 * Fragmentos reutilizáveis da interface. Recebem dados, devolvem HTML.
 * Nenhum acesso a `document` — quem monta e escuta eventos é o `main.ts`.
 */

import { CATEGORIAS, corCategoria, geraRelatorio, rotuloCategoria } from "../domain/categoria.ts";
import type { Compromisso } from "../domain/compromisso.ts";
import {
  durationInMinutes,
  formatDayOfMonth,
  formatDuration,
  formatShortDate,
  formatTime,
  formatWeekday,
} from "../domain/datetime.ts";
import { precisaRegistro, rotuloReferencia } from "../domain/integracao.ts";
import { classes, escaparCor, escaparHtml } from "./html.ts";

/**
 * A ação de relatório só existe quando a integração está ligada E a categoria
 * permite.
 *
 * Enquanto o relatório ainda cobra ação — não criado, rascunho, pendente ou com
 * erro — a ação é sempre o **handoff**, nunca um link direto. É o handoff que
 * refaz o aperto de mão, e sem ele o Kizeo não teria para onde devolver o novo
 * status: um rascunho ficaria marcado como rascunho para sempre na agenda.
 *
 * Só quando o relatório está concluído o link direto passa a fazer sentido.
 */
function acaoRelatorio(compromisso: Compromisso, integracaoAtiva: boolean): string {
  if (!integracaoAtiva || !geraRelatorio(compromisso.category)) return "";

  const referencia = compromisso.report;

  if (precisaRegistro(referencia)) {
    const rotulo = referencia?.status === "rascunho" ? "Continuar relatório" : "Registrar relatório";
    return `<button class="button subtle acao-relatorio" type="button"
      data-acao="registrar" data-id="${compromisso.id}">${rotulo}</button>`;
  }

  if (referencia?.reportUrl) {
    return `<a class="button subtle acao-relatorio" href="${escaparHtml(referencia.reportUrl)}"
      target="_blank" rel="noopener noreferrer">Ver relatório</a>`;
  }
  return `<button class="button subtle acao-relatorio" type="button"
    data-acao="registrar" data-id="${compromisso.id}">Abrir relatório</button>`;
}

function selo(compromisso: Compromisso, integracaoAtiva: boolean): string {
  if (!integracaoAtiva || !geraRelatorio(compromisso.category)) return "";
  const status = compromisso.report?.status ?? null;
  const tom = status === "enviado" || status === "criado" ? "ok" : status === "erro" ? "erro" : "aviso";
  return `<span class="selo-relatorio ${tom}">${escaparHtml(rotuloReferencia(compromisso.report))}</span>`;
}

export function cartaoCompromisso(compromisso: Compromisso, integracaoAtiva: boolean): string {
  const observacao = compromisso.description
    ? `<p class="task-description">${escaparHtml(compromisso.description)}</p>`
    : "";
  const status = compromisso.completed
    ? '<span class="status-pill done">Concluído</span>'
    : '<span class="status-pill pending">Pendente</span>';
  const prioridade =
    compromisso.priority === "normal"
      ? ""
      : `<span class="status-pill prioridade-${compromisso.priority}">${
          compromisso.priority === "alta" ? "Prioridade alta" : "Prioridade baixa"
        }</span>`;
  const serie = compromisso.seriesId
    ? '<span class="status-pill serie" title="Faz parte de uma série repetida">Repetido</span>'
    : "";
  const acoes = acaoRelatorio(compromisso, integracaoAtiva);

  return `
    <article class="${classes("task-card", compromisso.completed && "is-complete")}"
      data-task-id="${compromisso.id}"
      style="--cor-categoria: ${escaparCor(corCategoria(compromisso.category))}">
      <div class="task-time">
        <strong>${formatTime(compromisso.startTime)}</strong>
        <span>${formatTime(compromisso.endTime)}</span>
        <small>${formatDuration(durationInMinutes(compromisso.startTime, compromisso.endTime))}</small>
      </div>
      <div class="task-main">
        <div class="task-heading">
          <h3>${escaparHtml(compromisso.title)}</h3>
          <span class="etiqueta-categoria">${escaparHtml(rotuloCategoria(compromisso.category))}</span>
          ${status}${prioridade}${serie}
        </div>
        ${observacao}
        <div class="task-rodape">${selo(compromisso, integracaoAtiva)}${acoes}</div>
      </div>
      <div class="task-actions" aria-label="Ações para ${escaparHtml(compromisso.title)}">
        <button class="icon-button" type="button" data-acao="concluir" data-id="${compromisso.id}"
          aria-label="${compromisso.completed ? "Reabrir" : "Concluir"} compromisso"
          title="${compromisso.completed ? "Reabrir" : "Concluir"}">${compromisso.completed ? "↶" : "✓"}</button>
        <button class="icon-button" type="button" data-acao="editar" data-id="${compromisso.id}"
          aria-label="Editar compromisso" title="Editar">✎</button>
        <button class="icon-button danger" type="button" data-acao="excluir" data-id="${compromisso.id}"
          aria-label="Excluir compromisso" title="Excluir">⌫</button>
      </div>
    </article>`;
}

export function estadoVazio(temCompromissosNoDia: boolean): string {
  if (!temCompromissosNoDia) {
    return `<div class="empty-state">
      <div class="empty-icon">✦</div>
      <h3>Seu dia começa por aqui</h3>
      <p>Adicione um compromisso para transformar seus planos em uma agenda possível.</p>
      <button class="button primary" type="button" data-acao="novo">Adicionar compromisso</button>
    </div>`;
  }
  return `<div class="empty-state compact">
    <div class="empty-icon">⌕</div>
    <h3>Nada encontrado</h3>
    <p>Tente mudar a busca ou selecionar outro filtro.</p>
    <button class="button subtle" type="button" data-acao="limpar-filtros">Limpar filtros</button>
  </div>`;
}

/** Coluna de um dia na visão semanal. */
export function colunaSemana(
  data: string,
  compromissos: Compromisso[],
  selecionado: boolean,
  hoje: string,
): string {
  const itens = compromissos.length
    ? compromissos
        .map(
          (compromisso) => `
      <button class="${classes("chip-semana", compromisso.completed && "is-complete")}" type="button"
        data-acao="abrir-dia" data-data="${compromisso.date}" data-id="${compromisso.id}"
        style="--cor-categoria: ${escaparCor(corCategoria(compromisso.category))}"
        title="${escaparHtml(compromisso.title)} — ${escaparHtml(rotuloCategoria(compromisso.category))}">
        <strong>${formatTime(compromisso.startTime)}</strong>
        <span>${escaparHtml(compromisso.title)}</span>
      </button>`,
        )
        .join("")
    : '<p class="semana-vazia">Livre</p>';

  return `
    <div class="${classes("coluna-semana", selecionado && "is-selected", data === hoje && "is-today")}">
      <button class="cabecalho-semana" type="button" data-acao="abrir-dia" data-data="${data}">
        <span>${escaparHtml(formatWeekday(data))}</span>
        <strong>${formatDayOfMonth(data)}</strong>
      </button>
      <div class="itens-semana">${itens}</div>
    </div>`;
}

export function opcoesCategoria(selecionada: string): string {
  return CATEGORIAS.map(
    (categoria) =>
      `<option value="${categoria.id}"${categoria.id === selecionada ? " selected" : ""}>${escaparHtml(categoria.rotulo)}</option>`,
  ).join("");
}

export function filtrosCategoria(selecionada: string | null, contagem: Map<string, number>): string {
  const todas = `<button class="${classes("chip-categoria", selecionada === null && "active")}"
    type="button" data-categoria="">Todas</button>`;
  const demais = CATEGORIAS.filter((categoria) => contagem.get(categoria.id))
    .map(
      (categoria) => `<button class="${classes("chip-categoria", selecionada === categoria.id && "active")}"
        type="button" data-categoria="${categoria.id}"
        style="--cor-categoria: ${escaparCor(categoria.cor)}">${escaparHtml(categoria.rotulo)}
        <span>${contagem.get(categoria.id)}</span></button>`,
    )
    .join("");
  return todas + demais;
}

export function linhaResumo(rotulo: string, valor: string): string {
  return `<div class="summary-row"><span>${escaparHtml(rotulo)}</span><strong>${escaparHtml(valor)}</strong></div>`;
}

export function cartaoProximo(compromisso: Compromisso | null): string {
  if (!compromisso) {
    return '<p class="proximo-vazio">Nada mais marcado para hoje.</p>';
  }
  return `<button class="proximo" type="button" data-acao="abrir-dia" data-data="${compromisso.date}">
    <span class="proximo-hora">${formatTime(compromisso.startTime)}</span>
    <span class="proximo-titulo">${escaparHtml(compromisso.title)}</span>
    <span class="proximo-categoria" style="--cor-categoria: ${escaparCor(corCategoria(compromisso.category))}">
      ${escaparHtml(rotuloCategoria(compromisso.category))}</span>
  </button>`;
}

export function avisoRelatorios(pendentes: Compromisso[]): string {
  if (!pendentes.length) return "";
  const lista = pendentes
    .slice(0, 4)
    .map(
      (compromisso) => `<li><button type="button" data-acao="abrir-dia" data-data="${compromisso.date}">
        ${escaparHtml(formatShortDate(compromisso.date))} · ${escaparHtml(compromisso.title)}</button></li>`,
    )
    .join("");
  const resto =
    pendentes.length > 4 ? `<li class="resto">e mais ${pendentes.length - 4}…</li>` : "";
  return `<section class="aviso-relatorios">
    <div class="section-label">RELATÓRIOS A REGISTRAR</div>
    <ul>${lista}${resto}</ul>
  </section>`;
}
