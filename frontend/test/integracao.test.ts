import { test } from "node:test";
import assert from "node:assert/strict";
import {
  criarIntegrationId,
  isRespostaRelatorio,
  precisaRegistro,
  type ReferenciaRelatorio,
  rotuloReferencia,
} from "../src/domain/integracao.ts";
import { geraRelatorio, tipoRelatorioDe } from "../src/domain/categoria.ts";
import { montarUrlHandoff, ROTA_NOVO_RELATORIO } from "../src/integration/kizeo.ts";
import { normalizarBaseUrl, origemDe } from "../src/storage/configuracao.ts";

function referencia(sobrescritas: Partial<ReferenciaRelatorio> = {}): ReferenciaRelatorio {
  return {
    integrationId: "dailyplanner:a-1:MONITORIA",
    status: "pendente",
    reportId: null,
    reportUrl: null,
    reportType: "MONITORIA",
    updatedAt: "2026-09-03T12:00:00.000Z",
    message: null,
    ...sobrescritas,
  };
}

test("apenas categorias de registro geram relatório", () => {
  assert.equal(geraRelatorio("aula"), true);
  assert.equal(geraRelatorio("monitoria"), true);
  assert.equal(geraRelatorio("reuniao"), true);
  assert.equal(geraRelatorio("projeto"), true);
  // Regra 28: estudo pessoal, compromisso privado e categoria indefinida não vão ao Kizeo.
  assert.equal(geraRelatorio("estudo"), false);
  assert.equal(geraRelatorio("pessoal"), false);
  assert.equal(geraRelatorio("outro"), false);
});

test("cada categoria mapeia para um tipo do catálogo do Kizeo", () => {
  assert.equal(tipoRelatorioDe("aula"), "AULA");
  assert.equal(tipoRelatorioDe("monitoria"), "MONITORIA");
  assert.equal(tipoRelatorioDe("projeto"), "ATIVIDADE");
  assert.equal(tipoRelatorioDe("reuniao"), "REUNIAO");
  assert.equal(tipoRelatorioDe("pessoal"), null);
  assert.equal(tipoRelatorioDe("categoria-que-nao-existe"), null);
});

test("integrationId é determinístico — reenviar não duplica", () => {
  const primeira = criarIntegrationId("agenda-1", "MONITORIA");
  const segunda = criarIntegrationId("agenda-1", "MONITORIA");
  assert.equal(primeira, segunda);
  assert.equal(primeira, "dailyplanner:agenda-1:MONITORIA");
});

test("trocar o tipo de relatório produz outra chave — é outro registro", () => {
  assert.notEqual(
    criarIntegrationId("agenda-1", "MONITORIA"),
    criarIntegrationId("agenda-1", "AULA"),
  );
  assert.notEqual(
    criarIntegrationId("agenda-1", "AULA"),
    criarIntegrationId("agenda-2", "AULA"),
  );
});

test("precisaRegistro distingue o que ainda cobra ação do usuário", () => {
  assert.equal(precisaRegistro(null), true);
  assert.equal(precisaRegistro(referencia({ status: "pendente" })), true);
  assert.equal(precisaRegistro(referencia({ status: "erro" })), true);
  assert.equal(precisaRegistro(referencia({ status: "rascunho" })), true);
  assert.equal(precisaRegistro(referencia({ status: "criado" })), false);
  assert.equal(precisaRegistro(referencia({ status: "enviado" })), false);
});

test("sem referência a agenda mostra 'não criado'", () => {
  assert.equal(rotuloReferencia(null), "Relatório não criado");
  assert.equal(rotuloReferencia(referencia({ status: "enviado" })), "Relatório enviado");
});

test("isRespostaRelatorio recusa carga malformada vinda de fora", () => {
  const valida = {
    integrationId: "dailyplanner:a:AULA",
    status: "enviado",
    reportId: "r-1",
    reportUrl: "https://kizeo.example/#/relatorios/r-1",
    reportType: "AULA",
  };
  assert.equal(isRespostaRelatorio(valida), true);

  assert.equal(isRespostaRelatorio(null), false);
  assert.equal(isRespostaRelatorio("enviado"), false);
  assert.equal(isRespostaRelatorio({ ...valida, integrationId: "" }), false);
  assert.equal(isRespostaRelatorio({ ...valida, status: "qualquer-coisa" }), false);
  assert.equal(isRespostaRelatorio({ ...valida, reportId: 42 }), false);
  const { status: _semStatus, ...faltando } = valida;
  assert.equal(isRespostaRelatorio(faltando), false);
});

test("a URL de handoff carrega só contexto de horário, dentro do hash", () => {
  const url = montarUrlHandoff("https://kizeo.example", {
    v: 1,
    source: "dailyplanner",
    integrationId: "dailyplanner:a-1:MONITORIA",
    reportType: "MONITORIA",
    schedule: {
      id: "a-1",
      date: "2026-09-03",
      start: "14:00",
      end: "16:00",
      title: "Monitoria de Algoritmos",
      category: "monitoria",
      notes: "Sala 12",
    },
  });

  assert.ok(url.startsWith(`https://kizeo.example/${ROTA_NOVO_RELATORIO}?`));

  const consulta = new URLSearchParams(url.slice(url.indexOf("?") + 1));
  assert.equal(consulta.get("tipo"), "MONITORIA");
  assert.equal(consulta.get("data"), "2026-09-03");
  assert.equal(consulta.get("inicio"), "14:00");
  assert.equal(consulta.get("fim"), "16:00");
  assert.equal(consulta.get("iid"), "dailyplanner:a-1:MONITORIA");
  assert.equal(consulta.get("titulo"), "Monitoria de Algoritmos");
  assert.equal(consulta.get("obs"), "Sala 12");
});

test("a URL de handoff não inventa campos de relatório", () => {
  const url = montarUrlHandoff("https://kizeo.example/", {
    v: 1,
    source: "dailyplanner",
    integrationId: "dailyplanner:a-1:AULA",
    reportType: "AULA",
    schedule: {
      id: "a-1",
      date: "2026-09-03",
      start: "08:00",
      end: "09:40",
      title: "Aula",
      category: "aula",
    },
  });
  const consulta = new URLSearchParams(url.slice(url.indexOf("?") + 1));
  const enviados = [...consulta.keys()].sort();
  assert.deepEqual(enviados, [
    "categoria", "data", "fim", "iid", "inicio", "sid", "src", "tipo", "titulo", "v",
  ]);
  assert.equal(consulta.get("obs"), null, "sem observação, o campo nem é enviado");
});

test("normalizarBaseUrl remove credencial, query e fragmento", () => {
  const comSegredo = normalizarBaseUrl("https://usuario:senha@kizeo.example/app?token=abc#/x");
  assert.equal(comSegredo?.url, "https://kizeo.example/app");
  assert.equal(comSegredo?.sanitizada, true);

  const limpa = normalizarBaseUrl("https://kizeo.example/");
  assert.equal(limpa?.url, "https://kizeo.example");
  assert.equal(limpa?.sanitizada, false);
});

test("normalizarBaseUrl recusa esquema que não seja http(s)", () => {
  assert.equal(normalizarBaseUrl("javascript:alert(1)"), null);
  assert.equal(normalizarBaseUrl("ftp://kizeo.example"), null);
  assert.equal(normalizarBaseUrl("nao é url"), null);
  assert.deepEqual(normalizarBaseUrl("   "), { url: "", sanitizada: false });
});

test("origemDe extrai a origem usada para validar o postMessage", () => {
  assert.equal(origemDe("https://kizeo.example/app"), "https://kizeo.example");
  assert.equal(origemDe("http://localhost:5174/"), "http://localhost:5174");
  assert.equal(origemDe(""), null);
  assert.equal(origemDe("nao-url"), null);
});
