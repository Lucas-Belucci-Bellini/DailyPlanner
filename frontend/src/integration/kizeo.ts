/**
 * Adaptador de integração com o Kizeo Forms — a única parte do DailyPlanner que
 * sabe *como* o contexto atravessa a fronteira.
 *
 * Nada aqui conhece a estrutura interna do Kizeo. O transporte é:
 *
 *   1. a agenda abre uma janela no Kizeo com o contexto do horário na URL;
 *   2. o Kizeo anuncia `kizeo:pronto` (sem carga útil — não vaza nada);
 *   3. a agenda responde `planner:ola` **para a origem configurada**;
 *   4. o Kizeo passa a conhecer a origem de resposta e, ao salvar, devolve a
 *      referência do relatório por `postMessage`;
 *   5. a agenda valida origem, janela e formato antes de aceitar.
 *
 * Por que um aperto de mão em vez de a agenda simplesmente mandar a origem de
 * retorno na URL: assim o Kizeo nunca responde para um endereço que apareceu
 * num parâmetro — só para quem realmente falou com ele. E a agenda nunca aceita
 * uma resposta de uma janela que não foi ela quem abriu.
 *
 * Não há credencial em lugar nenhum deste fluxo — é navegação do usuário.
 */

import {
  type ContextoRelatorio,
  isRespostaRelatorio,
  ORIGEM,
  type RespostaRelatorio,
  VERSAO_CONTRATO,
} from "../domain/integracao.ts";
import { origemDe } from "../storage/configuracao.ts";

/** Caminho da tela de novo relatório no Kizeo. Faz parte do contrato publicado. */
export const ROTA_NOVO_RELATORIO = "#/relatorios/novo";

export const MENSAGEM_PRONTO = "kizeo:pronto";
export const MENSAGEM_OLA = "planner:ola";
export const MENSAGEM_REFERENCIA = "kizeo:referencia";

/**
 * Monta a URL de handoff.
 *
 * Os parâmetros ficam **dentro do hash** para que hospedagem estática não
 * precise de rota no servidor, e para que o contexto não apareça no log de
 * acesso do provedor — o que vem depois do `#` não é enviado ao servidor.
 */
export function montarUrlHandoff(baseUrl: string, contexto: ContextoRelatorio): string {
  const parametros = new URLSearchParams({
    v: String(contexto.v),
    src: contexto.source,
    iid: contexto.integrationId,
    sid: contexto.schedule.id,
    tipo: contexto.reportType,
    data: contexto.schedule.date,
    inicio: contexto.schedule.start,
    fim: contexto.schedule.end,
    titulo: contexto.schedule.title,
    categoria: contexto.schedule.category,
  });
  if (contexto.schedule.notes) parametros.set("obs", contexto.schedule.notes);

  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/${ROTA_NOVO_RELATORIO}?${parametros.toString()}`;
}

export interface PedidoRegistro {
  baseUrl: string;
  abrirEmNovaAba: boolean;
  contexto: ContextoRelatorio;
}

export type ResultadoAbertura = { ok: true } | { ok: false; motivo: string };

/** Janelas abertas por esta aba, para validar a procedência das respostas. */
const janelasAbertas = new Map<string, Window>();

export function abrirRegistro(pedido: PedidoRegistro): ResultadoAbertura {
  const destino = origemDe(pedido.baseUrl);
  if (!destino) {
    return { ok: false, motivo: "Configure o endereço do Kizeo antes de registrar relatórios." };
  }

  const url = montarUrlHandoff(pedido.baseUrl, pedido.contexto);
  const janela = window.open(
    url,
    pedido.abrirEmNovaAba ? "_blank" : "kizeo-registro",
    "noopener=no,noreferrer=no",
  );

  if (!janela) {
    return {
      ok: false,
      motivo: "O navegador bloqueou a janela do Kizeo. Permita pop-ups para este site.",
    };
  }

  janelasAbertas.set(pedido.contexto.integrationId, janela);
  return { ok: true };
}

export type AoReceberReferencia = (resposta: RespostaRelatorio) => void;

/**
 * Passa a escutar respostas do Kizeo. Devolve a função que encerra a escuta.
 *
 * `origemEsperada` é lida a cada mensagem (e não capturada uma vez) porque o
 * usuário pode trocar o endereço do Kizeo nas configurações com a agenda aberta.
 */
export function iniciarEscuta(
  origemEsperada: () => string | null,
  aoReceber: AoReceberReferencia,
): () => void {
  function tratar(evento: MessageEvent): void {
    const esperada = origemEsperada();
    if (!esperada || evento.origin !== esperada) return;

    const dados = evento.data;
    if (!dados || typeof dados !== "object") return;
    const mensagem = dados as { type?: unknown; v?: unknown; payload?: unknown };
    if (mensagem.v !== VERSAO_CONTRATO) return;

    if (mensagem.type === MENSAGEM_PRONTO) {
      // O Kizeo carregou. Só agora ele descobre para onde responder — e descobre
      // pela origem desta mensagem, não por um parâmetro de URL.
      const janela = evento.source as Window | null;
      if (!janela || !conheceJanela(janela)) return;
      janela.postMessage({ type: MENSAGEM_OLA, v: VERSAO_CONTRATO, source: ORIGEM }, esperada);
      return;
    }

    if (mensagem.type === MENSAGEM_REFERENCIA) {
      const janela = evento.source as Window | null;
      if (!janela || !conheceJanela(janela)) return;
      if (!isRespostaRelatorio(mensagem.payload)) return;
      const resposta = mensagem.payload;
      if (!janelasAbertas.has(resposta.integrationId)) return;
      aoReceber(resposta);
    }
  }

  window.addEventListener("message", tratar);
  return () => window.removeEventListener("message", tratar);
}

function conheceJanela(janela: Window): boolean {
  for (const aberta of janelasAbertas.values()) {
    if (aberta === janela) return true;
  }
  return false;
}

/** Esquece uma janela já resolvida ou abandonada. */
export function esquecerJanela(integrationId: string): void {
  janelasAbertas.delete(integrationId);
}

/** Limpa as referências de janelas que o usuário já fechou. */
export function limparJanelasFechadas(): void {
  for (const [chave, janela] of janelasAbertas) {
    if (janela.closed) janelasAbertas.delete(chave);
  }
}
