import { test } from "node:test";
import assert from "node:assert/strict";
import {
  atendeCriterios,
  contarPorCategoria,
  CRITERIOS_PADRAO,
  filtrarAgenda,
  temFiltroAtivo,
} from "../src/domain/agenda.ts";
import { type Compromisso, criarCompromisso } from "../src/domain/compromisso.ts";
import { lerExportacao, mesclarImportacao, montarExportacao } from "../src/storage/agenda.ts";

function fazer(sobrescritas: Partial<Compromisso> = {}): Compromisso {
  return {
    ...criarCompromisso({
      title: "Monitoria de Algoritmos",
      description: "sala 12",
      date: "2026-09-03",
      startTime: "14:00",
      endTime: "16:00",
      category: "monitoria",
      priority: "normal",
    }),
    ...sobrescritas,
  };
}

const lista: Compromisso[] = [
  fazer({ id: "1", title: "Aula de Cálculo", description: "prova na semana que vem", category: "aula", startTime: "08:00", endTime: "09:40" }),
  fazer({ id: "2", title: "Monitoria de Algoritmos", description: "sala 12", category: "monitoria" }),
  fazer({ id: "3", title: "Academia", description: "", category: "pessoal", startTime: "19:00", endTime: "20:00", completed: true }),
];

test("o filtro de status separa pendentes e concluídos", () => {
  assert.deepEqual(
    filtrarAgenda(lista, { ...CRITERIOS_PADRAO, status: "pendentes" }).map((item) => item.id),
    ["1", "2"],
  );
  assert.deepEqual(
    filtrarAgenda(lista, { ...CRITERIOS_PADRAO, status: "concluidos" }).map((item) => item.id),
    ["3"],
  );
});

test("o filtro 'sem relatório' ignora categorias que não geram registro", () => {
  const resultado = filtrarAgenda(lista, { ...CRITERIOS_PADRAO, status: "sem-relatorio" });
  assert.deepEqual(resultado.map((item) => item.id), ["1", "2"]);
});

test("o filtro por categoria isola uma categoria", () => {
  assert.deepEqual(
    filtrarAgenda(lista, { ...CRITERIOS_PADRAO, categoria: "aula" }).map((item) => item.id),
    ["1"],
  );
});

test("a busca ignora acento e caixa", () => {
  for (const termo of ["cálculo", "calculo", "CÁLCULO", "  Calculo "]) {
    assert.deepEqual(
      filtrarAgenda(lista, { ...CRITERIOS_PADRAO, busca: termo }).map((item) => item.id),
      ["1"],
      `falhou para "${termo}"`,
    );
  }
});

test("a busca alcança observação e nome da categoria", () => {
  assert.deepEqual(
    filtrarAgenda(lista, { ...CRITERIOS_PADRAO, busca: "sala 12" }).map((item) => item.id),
    ["2"],
  );
  assert.deepEqual(
    filtrarAgenda(lista, { ...CRITERIOS_PADRAO, busca: "pessoal" }).map((item) => item.id),
    ["3"],
  );
});

test("os critérios se combinam", () => {
  const resultado = filtrarAgenda(lista, {
    status: "pendentes",
    categoria: "monitoria",
    busca: "algoritmos",
  });
  assert.deepEqual(resultado.map((item) => item.id), ["2"]);
  assert.equal(
    atendeCriterios(lista[0], { status: "pendentes", categoria: "monitoria", busca: "" }),
    false,
  );
});

test("busca vazia não filtra nada", () => {
  assert.equal(filtrarAgenda(lista, CRITERIOS_PADRAO).length, 3);
  assert.equal(temFiltroAtivo(CRITERIOS_PADRAO), false);
  assert.equal(temFiltroAtivo({ ...CRITERIOS_PADRAO, busca: "  " }), false);
  assert.equal(temFiltroAtivo({ ...CRITERIOS_PADRAO, categoria: "aula" }), true);
});

test("contarPorCategoria conta por categoria", () => {
  const contagem = contarPorCategoria(lista);
  assert.equal(contagem.get("aula"), 1);
  assert.equal(contagem.get("monitoria"), 1);
  assert.equal(contagem.get("pessoal"), 1);
  assert.equal(contagem.get("estudo"), undefined);
});

test("exportar e reimportar preserva os compromissos (ida e volta)", () => {
  const relido = lerExportacao(montarExportacao(lista));
  assert.equal(relido?.length, 3);
  assert.deepEqual(
    relido?.map((item) => `${item.id}:${item.title}:${item.category}:${item.startTime}`).sort(),
    lista.map((item) => `${item.id}:${item.title}:${item.category}:${item.startTime}`).sort(),
  );
});

test("lerExportacao aceita o array cru do formato antigo", () => {
  const antigo = JSON.stringify([
    {
      id: "velho-1",
      title: "Aula antiga",
      description: "",
      date: "2026-09-03",
      startTime: "8:00",
      endTime: "9:40",
      completed: false,
      createdAt: "2026-09-01T00:00:00.000Z",
    },
  ]);
  const relido = lerExportacao(antigo);
  assert.equal(relido?.length, 1);
  assert.equal(relido?.[0].startTime, "08:00");
  assert.equal(relido?.[0].category, "outro");
});

test("lerExportacao recusa lixo", () => {
  assert.equal(lerExportacao("não é json"), null);
  assert.equal(lerExportacao("[]"), null);
  assert.equal(lerExportacao('{"versao":2,"compromissos":[]}'), null);
  assert.equal(lerExportacao('[{"title":"sem data"}]'), null);
});

test("importar mesclando não apaga a agenda nem duplica id conhecido", () => {
  const novos = [fazer({ id: "9", title: "Novo", startTime: "10:00", endTime: "11:00" })];
  const resultado = mesclarImportacao(lista, [...lista, ...novos], "mesclar");

  assert.equal(resultado.compromissos.length, 4, "os três existentes continuam lá");
  assert.equal(resultado.adicionados, 1);
  assert.equal(resultado.ignorados, 3);
});

test("importar substituindo troca a agenda inteira, mas só quando pedido", () => {
  const novos = [fazer({ id: "9", title: "Novo" })];
  const resultado = mesclarImportacao(lista, novos, "substituir");
  assert.deepEqual(resultado.compromissos.map((item) => item.id), ["9"]);
  assert.equal(resultado.adicionados, 1);
});
