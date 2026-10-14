import { test } from "node:test";
import assert from "node:assert/strict";
import {
  expandirRecorrencia,
  isRecorrencia,
  LIMITE_OCORRENCIAS,
  type Recorrencia,
  validarRecorrencia,
} from "../src/domain/recorrencia.ts";
import { isWeekday } from "../src/domain/datetime.ts";

function regra(sobrescritas: Partial<Recorrencia> = {}): Recorrencia {
  return { frequencia: "semanal", intervalo: 1, ate: "2026-09-30", ...sobrescritas };
}

test("a série sempre inclui a data inicial", () => {
  const datas = expandirRecorrencia("2026-09-03", regra());
  assert.equal(datas[0], "2026-09-03");
});

test("semanal repete de sete em sete dias e para no limite", () => {
  const datas = expandirRecorrencia("2026-09-03", regra({ ate: "2026-09-24" }));
  assert.deepEqual(datas, ["2026-09-03", "2026-09-10", "2026-09-17", "2026-09-24"]);
});

test("semanal com intervalo 2 pula uma semana", () => {
  const datas = expandirRecorrencia("2026-09-03", regra({ intervalo: 2, ate: "2026-10-01" }));
  assert.deepEqual(datas, ["2026-09-03", "2026-09-17", "2026-10-01"]);
});

test("diária cobre todos os dias, inclusive fim de semana", () => {
  const datas = expandirRecorrencia("2026-09-03", regra({ frequencia: "diaria", ate: "2026-09-07" }));
  assert.deepEqual(datas, ["2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07"]);
});

test("dias-uteis descarta sábado e domingo", () => {
  // 03/09/2026 é quinta; 05 e 06 caem no fim de semana.
  const datas = expandirRecorrencia("2026-09-03", regra({ frequencia: "dias-uteis", ate: "2026-09-09" }));
  assert.deepEqual(datas, ["2026-09-03", "2026-09-04", "2026-09-07", "2026-09-08", "2026-09-09"]);
  for (const data of datas) assert.equal(isWeekday(data), true);
});

test("dias-uteis mantém a data inicial mesmo caindo no fim de semana", () => {
  // Foi o usuário quem escolheu esse dia: a regra filtra o que a série gera,
  // não o que ele pediu explicitamente.
  const datas = expandirRecorrencia("2026-09-05", regra({ frequencia: "dias-uteis", ate: "2026-09-09" }));
  assert.equal(datas[0], "2026-09-05");
  assert.deepEqual(datas.slice(1), ["2026-09-07", "2026-09-08", "2026-09-09"]);
});

test("nenhuma data ultrapassa o fim declarado", () => {
  for (const frequencia of ["diaria", "dias-uteis", "semanal"] as const) {
    const datas = expandirRecorrencia("2026-09-03", regra({ frequencia, ate: "2026-09-20" }));
    for (const data of datas) assert.ok(data <= "2026-09-20", `${frequencia}: ${data} passou do limite`);
  }
});

test("as datas saem em ordem crescente e sem repetição", () => {
  const datas = expandirRecorrencia("2026-01-01", regra({ frequencia: "diaria", ate: "2026-03-01" }));
  assert.deepEqual([...datas].sort(), datas);
  assert.equal(new Set(datas).size, datas.length);
});

test("a série respeita o teto de ocorrências", () => {
  const datas = expandirRecorrencia("2026-01-01", regra({ frequencia: "diaria", ate: "2026-12-30" }));
  assert.ok(datas.length <= LIMITE_OCORRENCIAS, `gerou ${datas.length}`);
});

test("validarRecorrencia recusa fim anterior ao início e horizonte grande demais", () => {
  assert.ok(validarRecorrencia("2026-09-03", regra({ ate: "2026-09-01" })));
  assert.ok(validarRecorrencia("2026-01-01", regra({ ate: "2028-01-01" })));
  assert.equal(validarRecorrencia("2026-09-03", regra()), null);
});

test("regra inválida não expande: devolve só a data inicial", () => {
  const datas = expandirRecorrencia("2026-09-03", regra({ ate: "2026-09-01" }));
  assert.deepEqual(datas, ["2026-09-03"]);
});

test("isRecorrencia valida a forma da regra", () => {
  assert.equal(isRecorrencia(regra()), true);
  assert.equal(isRecorrencia(null), false);
  assert.equal(isRecorrencia({ ...regra(), frequencia: "mensal" }), false);
  assert.equal(isRecorrencia({ ...regra(), intervalo: 0 }), false);
  assert.equal(isRecorrencia({ ...regra(), intervalo: 1.5 }), false);
  assert.equal(isRecorrencia({ ...regra(), ate: "2026-02-30" }), false);
});
