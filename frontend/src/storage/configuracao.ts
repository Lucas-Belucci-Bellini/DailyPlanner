/**
 * Preferências locais: tema e integração com o Kizeo.
 *
 * Regra dura: **nenhuma credencial mora aqui**. A integração é feita por
 * navegação do usuário e `postMessage`, não por chamada autenticada de API, e
 * por isso não existe token, senha nem chave para guardar. `normalizarBaseUrl`
 * remove ativamente usuário, senha, query e fragmento da URL configurada — se
 * alguém colar `https://user:senha@host/?token=…`, o segredo não é persistido.
 */

import { escreverBruto, lerBruto } from "./local.ts";

const CHAVE = "daily-planner.configuracao.v1";

export type Tema = "light" | "dark";

export interface ConfiguracaoIntegracao {
  /** Desligada, a agenda não mostra nenhuma ação de relatório. */
  ativa: boolean;
  /** Origem do Kizeo, sem caminho de aplicação. Vazio = integração inutilizável. */
  baseUrl: string;
  abrirEmNovaAba: boolean;
}

export interface Configuracao {
  tema: Tema;
  integracao: ConfiguracaoIntegracao;
}

export const CONFIGURACAO_PADRAO: Configuracao = {
  tema: "light",
  integracao: {
    ativa: false,
    baseUrl: "",
    abrirEmNovaAba: true,
  },
};

export interface UrlNormalizada {
  url: string;
  /** `true` quando algo foi descartado da URL informada (credencial, query, hash). */
  sanitizada: boolean;
}

/**
 * Reduz a URL informada à sua origem + caminho. Devolve `null` se não for uma
 * URL http(s) utilizável.
 */
export function normalizarBaseUrl(valor: string): UrlNormalizada | null {
  const texto = valor.trim();
  if (!texto) return { url: "", sanitizada: false };

  let analisada: URL;
  try {
    analisada = new URL(texto);
  } catch {
    return null;
  }
  if (analisada.protocol !== "https:" && analisada.protocol !== "http:") return null;

  const sanitizada = Boolean(
    analisada.username || analisada.password || analisada.search || analisada.hash,
  );
  analisada.username = "";
  analisada.password = "";
  analisada.search = "";
  analisada.hash = "";

  const caminho = analisada.pathname.replace(/\/+$/, "");
  return { url: `${analisada.origin}${caminho}`, sanitizada };
}

/** A origem (esquema + host + porta) da URL configurada — o alvo aceito no `postMessage`. */
export function origemDe(baseUrl: string): string | null {
  if (!baseUrl) return null;
  try {
    return new URL(baseUrl).origin;
  } catch {
    return null;
  }
}

function isTema(valor: unknown): valor is Tema {
  return valor === "light" || valor === "dark";
}

/** Tema salvo, ou a preferência do sistema na primeira visita. */
export function temaInicial(salvo: Tema | null): Tema {
  if (salvo) return salvo;
  const prefereEscuro =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefereEscuro ? "dark" : "light";
}

export function carregarConfiguracao(): Configuracao {
  const bruto = lerBruto(CHAVE);
  let salvo: unknown = null;
  if (bruto) {
    try {
      salvo = JSON.parse(bruto);
    } catch {
      salvo = null;
    }
  }

  const objeto = (salvo && typeof salvo === "object" ? salvo : {}) as Record<string, unknown>;
  const integracaoBruta = (
    objeto.integracao && typeof objeto.integracao === "object" ? objeto.integracao : {}
  ) as Record<string, unknown>;

  const baseUrl =
    typeof integracaoBruta.baseUrl === "string"
      ? (normalizarBaseUrl(integracaoBruta.baseUrl)?.url ?? "")
      : "";

  return {
    tema: temaInicial(isTema(objeto.tema) ? objeto.tema : null),
    integracao: {
      // Sem endereço configurado a integração não pode estar ativa.
      ativa: integracaoBruta.ativa === true && baseUrl !== "",
      baseUrl,
      abrirEmNovaAba: integracaoBruta.abrirEmNovaAba !== false,
    },
  };
}

export function salvarConfiguracao(configuracao: Configuracao): void {
  escreverBruto(CHAVE, JSON.stringify(configuracao));
}
