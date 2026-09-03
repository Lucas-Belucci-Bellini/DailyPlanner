import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acharConflito,
  aguardandoRelatorio,
  type Compromisso,
  compromissosDoDia,
  conflitam,
  criarCompromisso,
  normalizarCompromisso,
  ordenarCompromissos,
  type RascunhoCompromisso,
  resumirDia,
  validarCompromisso,
} from "../src/domain/compromisso.ts";

function rascunho(sobrescritas: Partial<RascunhoCompromisso> = {}): RascunhoCompromisso {
  return {
    title: "Monitoria",
    description: "",
    date: "2026-09-03",
    startTime: "14:00",
    endTime: "16:00",
    category: "monitoria",
    priority: "normal",
    ...sobrescritas,
  };
}

function compromisso(sobrescritas: Partial<Compromisso> = {}): Compromisso {
  return { ...criarCompromisso(rascunho()), ...sobrescritas };
}

test("criarCompromisso apara espaços e nasce pendente e sem relatório", () => {
  const criado = criarCompromisso(rascunho({ title: "  Aula  ", description: "  nota  " }));
  assert.equal(criado.title, "Aula");
  assert.equal(criado.description, "nota");
  assert.equal(criado.completed, false);
  assert.equal(criado.report, null);
  assert.equal(criado.seriesId, null);
  assert.ok(criado.id.length > 0);
});

test("validarCompromisso recusa término anterior ou igual ao início", () => {
  assert.equal(validarCompromisso(rascunho({ endTime: "13:00" }), [])?.campo, "endTime");
  assert.equal(validarCompromisso(rascunho({ endTime: "14:00" }), [])?.campo, "endTime");
  assert.equal(validarCompromisso(rascunho(), []), null);
});

test("validarCompromisso exige título, data e horários válidos", () => {
  assert.equal(validarCompromisso(rascunho({ title: "   " }), [])?.campo, "title");
  assert.equal(validarCompromisso(rascunho({ date: "2026-02-30" }), [])?.campo, "date");
  assert.equal(validarCompromisso(rascunho({ startTime: "" }), [])?.campo, "startTime");
  assert.equal(validarCompromisso(rascunho({ title: "x".repeat(121) }), [])?.campo, "title");
});

test("conflitam trata bordas encostadas como livres", () => {
  const manha = { date: "2026-09-03", startTime: "09:00", endTime: "10:00" };
  const seguinte = { date: "2026-09-03", startTime: "10:00", endTime: "11:00" };
  const sobreposto = { date: "2026-09-03", startTime: "09:30", endTime: "10:30" };
  const contido = { date: "2026-09-03", startTime: "09:15", endTime: "09:45" };
  const outroDia = { date: "2026-09-04", startTime: "09:30", endTime: "10:30" };

  assert.equal(conflitam(manha, seguinte), false);
  assert.equal(conflitam(manha, sobreposto), true);
  assert.equal(conflitam(manha, contido), true);
  assert.equal(conflitam(contido, manha), true, "a sobreposição é simétrica");
  assert.equal(conflitam(manha, outroDia), false);
});

test("validarCompromisso bloqueia conflito e libera o próprio item em edição", () => {
  const existente = compromisso({ id: "a", startTime: "14:00", endTime: "16:00" });
  const colidindo = rascunho({ startTime: "15:00", endTime: "17:00" });

  assert.equal(validarCompromisso(colidindo, [existente])?.campo, "startTime");
  assert.equal(
    validarCompromisso(colidindo, [existente], "a"),
    null,
    "editar o próprio compromisso não deve conflitar consigo mesmo",
  );
});

test("acharConflito devolve o compromisso que ocupa o horário", () => {
  const existente = compromisso({ id: "a", title: "Aula", startTime: "08:00", endTime: "09:40" });
  const encontrado = acharConflito(
    { date: "2026-09-03", startTime: "09:00", endTime: "10:00" },
    [existente],
  );
  assert.equal(encontrado?.title, "Aula");
  assert.equal(acharConflito({ date: "2026-09-03", startTime: "10:00", endTime: "11:00" }, [existente]), null);
});

test("ordenarCompromissos ordena por data, depois hora, depois título", () => {
  const lista = [
    compromisso({ id: "3", date: "2026-09-04", startTime: "08:00", endTime: "09:00", title: "C" }),
    compromisso({ id: "2", date: "2026-09-03", startTime: "10:00", endTime: "11:00", title: "B" }),
    compromisso({ id: "1", date: "2026-09-03", startTime: "08:00", endTime: "09:00", title: "A" }),
  ];
  assert.deepEqual(ordenarCompromissos(lista).map((item) => item.id), ["1", "2", "3"]);
});

test("compromissosDoDia isola a data pedida", () => {
  const lista = [
    compromisso({ id: "1", date: "2026-09-03" }),
    compromisso({ id: "2", date: "2026-09-04", startTime: "08:00", endTime: "09:00" }),
  ];
  assert.deepEqual(compromissosDoDia(lista, "2026-09-03").map((item) => item.id), ["1"]);
  assert.deepEqual(compromissosDoDia(lista, "2026-09-05"), []);
});

test("resumirDia soma tempo, conclusões e percentual", () => {
  const lista = [
    compromisso({ id: "1", startTime: "08:00", endTime: "09:00", completed: true, category: "pessoal" }),
    compromisso({ id: "2", startTime: "10:00", endTime: "11:30", completed: false, category: "pessoal" }),
  ];
  const resumo = resumirDia(lista);
  assert.equal(resumo.total, 2);
  assert.equal(resumo.concluidos, 1);
  assert.equal(resumo.pendentes, 1);
  assert.equal(resumo.minutos, 150);
  assert.equal(resumo.percentual, 50);
});

test("resumirDia conta relatórios pendentes só de categorias que geram relatório", () => {
  const lista = [
    compromisso({ id: "1", category: "monitoria" }),
    compromisso({ id: "2", category: "aula", startTime: "08:00", endTime: "09:00" }),
    compromisso({ id: "3", category: "estudo", startTime: "17:00", endTime: "18:00" }),
    compromisso({ id: "4", category: "pessoal", startTime: "19:00", endTime: "20:00" }),
  ];
  assert.equal(resumirDia(lista).relatoriosPendentes, 2);
});

test("aguardandoRelatorio deixa de valer quando o relatório já existe", () => {
  const registrado = compromisso({
    category: "monitoria",
    report: {
      integrationId: "dailyplanner:x:MONITORIA",
      status: "enviado",
      reportId: "r-1",
      reportUrl: null,
      reportType: "MONITORIA",
      updatedAt: "2026-09-03T12:00:00.000Z",
      message: null,
    },
  });
  assert.equal(aguardandoRelatorio(registrado), false);

  const comErro = compromisso({
    category: "monitoria",
    report: { ...registrado.report!, status: "erro", reportId: null },
  });
  assert.equal(aguardandoRelatorio(comErro), true, "um erro volta para a fila de pendências");
});

test("normalizarCompromisso conserta dado antigo e recusa dado quebrado", () => {
  const antigo = normalizarCompromisso({
    id: "a",
    title: "Aula",
    description: "x",
    date: "2026-09-03",
    startTime: "9:00",
    endTime: "10:30",
    completed: false,
    createdAt: "2026-09-01T10:00:00.000Z",
  });
  assert.equal(antigo?.startTime, "09:00", "horário sem zero é normalizado");
  assert.equal(antigo?.category, "outro", "registro sem categoria recebe o padrão");
  assert.equal(antigo?.priority, "normal");
  assert.equal(antigo?.report, null);

  assert.equal(normalizarCompromisso(null), null);
  assert.equal(normalizarCompromisso({ title: "sem data" }), null);
  assert.equal(
    normalizarCompromisso({ title: "invertido", date: "2026-09-03", startTime: "10:00", endTime: "09:00" }),
    null,
  );
});

test("normalizarCompromisso preserva uma referência de relatório válida", () => {
  const normalizado = normalizarCompromisso({
    title: "Monitoria",
    date: "2026-09-03",
    startTime: "14:00",
    endTime: "16:00",
    category: "monitoria",
    report: { integrationId: "dailyplanner:a:MONITORIA", status: "rascunho", reportId: "r-9" },
  });
  assert.equal(normalizado?.report?.status, "rascunho");
  assert.equal(normalizado?.report?.reportId, "r-9");
  assert.equal(normalizado?.report?.reportUrl, null);
});
