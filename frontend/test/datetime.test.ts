import { test } from "node:test";
import assert from "node:assert/strict";
import {
  daysBetween,
  durationInMinutes,
  formatDuration,
  isISODate,
  isTime,
  isWeekday,
  normalizeTime,
  shiftDate,
  startOfWeek,
  toISODate,
  weekDays,
} from "../src/domain/datetime.ts";

test("toISODate usa a data local, não UTC", () => {
  // 23:30 local em qualquer fuso continua sendo o mesmo dia local.
  assert.equal(toISODate(new Date(2026, 0, 15, 23, 30)), "2026-01-15");
  assert.equal(toISODate(new Date(2026, 0, 15, 0, 30)), "2026-01-15");
});

test("shiftDate atravessa mês, ano e o fim de fevereiro bissexto", () => {
  assert.equal(shiftDate("2026-01-31", 1), "2026-02-01");
  assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftDate("2024-02-28", 1), "2024-02-29");
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDate("2026-01-01", -1), "2025-12-31");
});

test("shiftDate é reversível", () => {
  for (const dias of [1, 7, 30, 365]) {
    assert.equal(shiftDate(shiftDate("2026-06-15", dias), -dias), "2026-06-15");
  }
});

test("daysBetween conta dias inteiros mesmo com horário de verão no meio", () => {
  assert.equal(daysBetween("2026-01-01", "2026-01-31"), 30);
  assert.equal(daysBetween("2026-01-01", "2027-01-01"), 365);
  assert.equal(daysBetween("2026-02-10", "2026-02-10"), 0);
});

test("startOfWeek devolve a segunda-feira, inclusive a partir de domingo", () => {
  // 2026-09-03 é uma quinta-feira; a segunda dessa semana é 2026-08-31.
  assert.equal(startOfWeek("2026-09-03"), "2026-08-31");
  assert.equal(startOfWeek("2026-08-31"), "2026-08-31");
  // Domingo pertence à semana que começou na segunda anterior, não à seguinte.
  assert.equal(startOfWeek("2026-09-06"), "2026-08-31");
});

test("weekDays devolve sete dias consecutivos começando na segunda", () => {
  const dias = weekDays("2026-09-03");
  assert.equal(dias.length, 7);
  assert.equal(dias[0], "2026-08-31");
  assert.equal(dias[6], "2026-09-06");
  for (let indice = 1; indice < dias.length; indice += 1) {
    assert.equal(daysBetween(dias[indice - 1], dias[indice]), 1);
  }
});

test("isWeekday separa dias úteis de fim de semana", () => {
  assert.equal(isWeekday("2026-08-31"), true); // segunda
  assert.equal(isWeekday("2026-09-04"), true); // sexta
  assert.equal(isWeekday("2026-09-05"), false); // sábado
  assert.equal(isWeekday("2026-09-06"), false); // domingo
});

test("normalizeTime completa zeros e rejeita horário impossível", () => {
  assert.equal(normalizeTime("9:5"), "09:05");
  assert.equal(normalizeTime("09:05:00"), "09:05");
  assert.equal(normalizeTime(" 7:30 "), "07:30");
  assert.equal(normalizeTime("24:00"), null);
  assert.equal(normalizeTime("10:75"), null);
  assert.equal(normalizeTime("meio-dia"), null);
});

test("horários normalizados ordenam corretamente por string", () => {
  // É a razão de normalizar: "9:00" > "10:00" na comparação de string crua.
  assert.equal("9:00" < "10:00", false);
  assert.equal(normalizeTime("9:00")! < normalizeTime("10:00")!, true);
});

test("isISODate recusa data inexistente", () => {
  assert.equal(isISODate("2026-09-03"), true);
  assert.equal(isISODate("2026-02-30"), false);
  assert.equal(isISODate("2026-13-01"), false);
  assert.equal(isISODate("03/09/2026"), false);
});

test("isTime aceita apenas HH:MM de 24 horas", () => {
  assert.equal(isTime("00:00"), true);
  assert.equal(isTime("23:59"), true);
  assert.equal(isTime("24:00"), false);
  assert.equal(isTime("9:00"), false);
});

test("durationInMinutes e formatDuration", () => {
  assert.equal(durationInMinutes("09:00", "10:30"), 90);
  assert.equal(durationInMinutes("14:00", "16:00"), 120);
  assert.equal(formatDuration(90), "1h30");
  assert.equal(formatDuration(120), "2h");
  assert.equal(formatDuration(45), "45min");
  assert.equal(formatDuration(0), "0min");
});
