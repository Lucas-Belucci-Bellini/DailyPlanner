/**
 * Diálogo de configurações.
 *
 * A seção de integração pede exatamente três coisas: ligar/desligar, o endereço
 * do Kizeo e se abre em nova aba. **Não existe campo de token, senha ou chave** —
 * e não é esquecimento: o handoff é navegação do usuário, então não há segredo
 * a guardar. Um campo desses no frontend público seria credencial exposta.
 */

import type { Configuracao } from "../storage/configuracao.ts";
import { escaparHtml } from "./html.ts";

export function htmlConfiguracoes(configuracao: Configuracao): string {
  const { integracao } = configuracao;
  return `
    <dialog class="task-dialog" id="config-dialog" aria-labelledby="config-title">
      <form id="config-form" method="dialog" novalidate>
        <div class="dialog-heading">
          <div>
            <span class="eyebrow">PREFERÊNCIAS</span>
            <h2 id="config-title">Configurações</h2>
          </div>
          <button class="icon-button" type="button" data-fechar aria-label="Fechar">×</button>
        </div>
        <div id="config-error" class="form-error" role="alert"></div>

        <fieldset class="bloco-config">
          <legend>Integração com o Kizeo Forms</legend>
          <p class="ajuda">
            A agenda guarda apenas <strong>horários</strong>. Quando um compromisso precisar de um
            relatório, ela envia o contexto do horário para o Kizeo — que continua sendo o dono do
            relatório. A agenda funciona normalmente com a integração desligada.
          </p>

          <label class="linha-check">
            <input name="ativa" type="checkbox" ${integracao.ativa ? "checked" : ""} />
            <span>Ativar integração</span>
          </label>

          <label class="field">Endereço do Kizeo
            <input name="baseUrl" type="url" inputmode="url" placeholder="https://kizeo.exemplo.com"
              value="${escaparHtml(integracao.baseUrl)}" />
            <small class="counter-hint">Somente o endereço do site. Nunca inclua senha ou token.</small>
          </label>

          <label class="linha-check">
            <input name="abrirEmNovaAba" type="checkbox" ${integracao.abrirEmNovaAba ? "checked" : ""} />
            <span>Abrir relatórios em uma nova aba</span>
          </label>
        </fieldset>

        <div class="dialog-actions">
          <button class="button subtle" type="button" data-fechar>Cancelar</button>
          <button class="button primary" type="submit">Salvar configurações</button>
        </div>
      </form>
    </dialog>`;
}

export interface LeituraConfiguracoes {
  ativa: boolean;
  baseUrl: string;
  abrirEmNovaAba: boolean;
}

export function lerConfiguracoes(form: HTMLFormElement): LeituraConfiguracoes {
  const dados = new FormData(form);
  return {
    ativa: dados.get("ativa") === "on",
    baseUrl: String(dados.get("baseUrl") ?? ""),
    abrirEmNovaAba: dados.get("abrirEmNovaAba") === "on",
  };
}
