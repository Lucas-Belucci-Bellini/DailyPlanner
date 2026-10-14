/**
 * Diálogo de criação e edição de compromisso.
 *
 * O formulário é **curto de propósito**: título, horário, categoria, prioridade,
 * repetição e uma observação. Campo de relatório não mora aqui — quem descreve o
 * que aconteceu é o Kizeo. A regra está escrita no contrato de integração e esta
 * tela é onde ela é mais fácil de violar por acidente.
 */

import { CATEGORIA_PADRAO } from "../domain/categoria.ts";
import {
  type Compromisso,
  LIMITE_DESCRICAO,
  LIMITE_TITULO,
  PRIORIDADES,
  type Prioridade,
  type RascunhoCompromisso,
} from "../domain/compromisso.ts";
import { shiftDate } from "../domain/datetime.ts";
import { FREQUENCIAS, type FrequenciaRecorrencia, type Recorrencia } from "../domain/recorrencia.ts";
import { opcoesCategoria } from "./componentes.ts";
import { escaparHtml } from "./html.ts";

export interface DadosFormulario {
  rascunho: RascunhoCompromisso;
  recorrencia: Recorrencia | null;
}

function opcoesPrioridade(selecionada: Prioridade): string {
  return PRIORIDADES.map(
    (prioridade) =>
      `<option value="${prioridade.id}"${prioridade.id === selecionada ? " selected" : ""}>${prioridade.rotulo}</option>`,
  ).join("");
}

function opcoesFrequencia(): string {
  return FREQUENCIAS.map(
    (frequencia) => `<option value="${frequencia.id}">${escaparHtml(frequencia.rotulo)}</option>`,
  ).join("");
}

export function htmlFormulario(dataPadrao: string, compromisso?: Compromisso): string {
  const editando = Boolean(compromisso);
  const rascunho: RascunhoCompromisso = compromisso
    ? {
        title: compromisso.title,
        description: compromisso.description,
        date: compromisso.date,
        startTime: compromisso.startTime,
        endTime: compromisso.endTime,
        category: compromisso.category,
        priority: compromisso.priority,
      }
    : {
        title: "",
        description: "",
        date: dataPadrao,
        startTime: "09:00",
        endTime: "10:00",
        category: CATEGORIA_PADRAO,
        priority: "normal",
      };

  // Repetição só faz sentido ao criar: a série é materializada uma vez.
  const blocoRepeticao = editando
    ? ""
    : `
      <fieldset class="field full-field repeticao">
        <legend>Repetir</legend>
        <label class="linha-check">
          <input name="repetir" type="checkbox" />
          <span>Criar este compromisso mais de uma vez</span>
        </label>
        <div class="repeticao-campos" hidden>
          <label class="field">Frequência
            <select name="frequencia">${opcoesFrequencia()}</select>
          </label>
          <label class="field">A cada
            <input name="intervalo" type="number" min="1" max="52" value="1" />
          </label>
          <label class="field">Até
            <input name="ate" type="date" value="${shiftDate(rascunho.date, 28)}" />
          </label>
        </div>
      </fieldset>`;

  return `
    <dialog class="task-dialog" id="task-dialog" aria-labelledby="dialog-title">
      <form id="task-form" method="dialog" novalidate>
        <div class="dialog-heading">
          <div>
            <span class="eyebrow">${editando ? "EDITAR PLANO" : "NOVO PLANO"}</span>
            <h2 id="dialog-title">${editando ? "Ajustar compromisso" : "O que você quer realizar?"}</h2>
          </div>
          <button class="icon-button" type="button" data-fechar aria-label="Fechar">×</button>
        </div>
        <div id="form-error" class="form-error" role="alert"></div>
        <div class="form-grid">
          <label class="field full-field">Título <span>*</span>
            <input name="title" type="text" maxlength="${LIMITE_TITULO}"
              placeholder="Ex.: Monitoria de Algoritmos" value="${escaparHtml(rascunho.title)}" autofocus />
            <small id="error-title"></small>
          </label>
          <label class="field">Categoria <span>*</span>
            <select name="category">${opcoesCategoria(rascunho.category)}</select>
          </label>
          <label class="field">Prioridade
            <select name="priority">${opcoesPrioridade(rascunho.priority)}</select>
          </label>
          <label class="field">Data <span>*</span>
            <input name="date" type="date" value="${rascunho.date}" />
            <small id="error-date"></small>
          </label>
          <div class="field time-range">
            <label id="rotulo-horario">Horário <span>*</span></label>
            <div class="time-inputs">
              <input name="startTime" type="time" value="${rascunho.startTime}" aria-label="Horário de início" />
              <span>até</span>
              <input name="endTime" type="time" value="${rascunho.endTime}" aria-label="Horário de término" />
            </div>
            <small id="error-startTime"></small>
            <small id="error-endTime"></small>
          </div>
          <label class="field full-field">Observação rápida
            <small class="counter-hint">opcional · o relatório completo vai no Kizeo</small>
            <textarea name="description" maxlength="${LIMITE_DESCRICAO}" rows="2"
              placeholder="Uma linha para lembrar o essencial">${escaparHtml(rascunho.description)}</textarea>
            <small id="error-description"></small>
          </label>
          ${blocoRepeticao}
        </div>
        <div class="dialog-actions">
          <button class="button subtle" type="button" data-fechar>Cancelar</button>
          <button class="button primary" type="submit">${editando ? "Salvar alterações" : "Adicionar à agenda"}</button>
        </div>
      </form>
    </dialog>`;
}

/** Lê o formulário. A validação de domínio acontece depois, em `validarCompromisso`. */
export function lerFormulario(form: HTMLFormElement): DadosFormulario {
  const dados = new FormData(form);
  const texto = (campo: string): string => String(dados.get(campo) ?? "");

  const rascunho: RascunhoCompromisso = {
    title: texto("title"),
    description: texto("description"),
    date: texto("date"),
    startTime: texto("startTime"),
    endTime: texto("endTime"),
    category: texto("category") as RascunhoCompromisso["category"],
    priority: texto("priority") as Prioridade,
  };

  const repetir = dados.get("repetir") === "on";
  const recorrencia: Recorrencia | null = repetir
    ? {
        frequencia: texto("frequencia") as FrequenciaRecorrencia,
        intervalo: Math.max(1, Number(texto("intervalo")) || 1),
        ate: texto("ate"),
      }
    : null;

  return { rascunho, recorrencia };
}
