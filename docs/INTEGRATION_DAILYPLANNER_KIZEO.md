# Contrato de integração — DailyPlanner ↔ Kizeo Forms

> **Este arquivo é espelhado nos dois repositórios e deve ser mantido idêntico.**
> Ele é a fonte única do formato que atravessa a fronteira. Mudou aqui, mude no
> outro repositório no mesmo passo — ou a integração passa a ter duas verdades.
>
> - `DailyPlanner/docs/INTEGRATION_DAILYPLANNER_KIZEO.md`
> - `Kizeo-Forms/docs/INTEGRATION_DAILYPLANNER_KIZEO.md`
>
> Versão do contrato: **1**

## 1. A regra

```text
DailyPlanner = horários.        Kizeo Forms = relatórios.
"Quando?"                       "O que aconteceu?"
```

O DailyPlanner entrega **contexto de horário**. O Kizeo devolve **uma
referência**. Nenhum conteúdo de relatório volta para a agenda; nenhum
compromisso vira relatório sozinho.

## 2. Fluxo completo

```text
1.  Usuário cria um horário no DailyPlanner
       14:00–16:00 · Monitoria

2.  Categoria "Monitoria" gera relatório → aparece [Registrar relatório]
       (categorias Estudo, Pessoal e Outro NÃO mostram o botão)

3.  Usuário clica
       → a agenda grava a intenção localmente (status "pendente")
       → abre o Kizeo com o contexto na URL

4.  Kizeo reconhece o handoff
       → procura relatório existente com o mesmo integrationId
       → achou: abre aquele.  não achou: abre o formulário MONITORIA prefilled

5.  Usuário preenche e salva

6.  Kizeo devolve por postMessage: { reportId, reportUrl, status }

7.  DailyPlanner guarda SOMENTE a referência
       → o cartão passa a mostrar [Ver relatório]
```

## 3. `PlannerSchedule` — o horário exportado

```ts
type PlannerSchedule = {
  id: string;        // id do compromisso na agenda
  date: string;      // YYYY-MM-DD
  start: string;     // HH:MM
  end: string;       // HH:MM
  title: string;
  category: string;  // categoria da agenda
  notes?: string;    // observação curta, quando existir
};
```

## 4. `integrationId` — idempotência

```text
integrationId = "dailyplanner:" + scheduleId + ":" + TIPO
```

Determinístico. Reenviar depois de um *timeout*, de uma aba fechada ou de um
clique repetido produz a mesma chave, e o Kizeo **reabre o relatório existente**
em vez de criar outro.

Trocar o tipo produz outra chave de propósito — é outro registro.

> O Kizeo **deve** procurar por `integrationId` antes de criar um relatório
> vindo de handoff. É onde a não-duplicação é garantida.

## 5. Ida — a URL de handoff

```text
{BASE_KIZEO}/#/relatorios/novo?v=1&src=dailyplanner&iid=…&sid=…&tipo=…
                              &data=…&inicio=…&fim=…&titulo=…&categoria=…[&obs=…]
```

| Parâmetro | Conteúdo | Obrigatório |
| --- | --- | --- |
| `v` | versão do contrato (`1`) | sim |
| `src` | `dailyplanner` | sim |
| `iid` | `integrationId` | sim |
| `sid` | `PlannerSchedule.id` | sim |
| `tipo` | tipo de relatório (§7) | sim |
| `data` | `YYYY-MM-DD` | sim |
| `inicio`, `fim` | `HH:MM` | sim |
| `titulo` | título do compromisso | sim |
| `categoria` | categoria da agenda | sim |
| `obs` | observação curta | não |

Os parâmetros ficam **dentro do hash**: hospedagem estática não precisa de rota
no servidor, e o que vem depois do `#` não é enviado ao servidor — o contexto
não aparece no log de acesso do provedor.

> Um parâmetro desconhecido deve ser **ignorado**, nunca causar erro. É assim
> que a versão 2 poderá acrescentar campos sem quebrar um Kizeo antigo.

## 6. Volta — `postMessage`

Aperto de mão em três tempos:

```text
Kizeo   →  { type: "kizeo:pronto",     v: 1 }                    para "*"
Planner →  { type: "planner:ola",      v: 1, source: … }         para a origem do Kizeo
Kizeo   →  { type: "kizeo:referencia", v: 1, payload: … }        para a origem gravada no passo 2
```

**Por quê.** O Kizeo poderia receber a origem de retorno na URL. Não recebe: ele
grava a origem **da mensagem que recebeu**, então nunca responde para um
endereço que apareceu num parâmetro. E a agenda só aceita mensagem cuja origem
seja o Kizeo configurado **e** cuja janela ela mesma tenha aberto.

`kizeo:pronto` vai para `"*"` porque não carrega dado nenhum — só anuncia que a
página carregou.

### O `payload`

```ts
type RespostaRelatorio = {
  integrationId: string;
  status: "pendente" | "rascunho" | "criado" | "enviado" | "erro";
  reportId: string | null;
  reportUrl: string | null;
  reportType: string | null;
};
```

O receptor **deve** validar o formato antes de aceitar. Os dois lados fazem isso
(`isRespostaRelatorio`, `isMensagemOla`).

### Status

| Status | Significado | Ainda cobra ação? |
| --- | --- | --- |
| `pendente` | intenção registrada, nada criado no Kizeo | sim |
| `rascunho` | relatório começado, não finalizado | **sim** |
| `criado` | relatório existe | não |
| `enviado` | relatório finalizado | não |
| `erro` | falhou | sim |

`rascunho` continua pendente de propósito: um rascunho é um relatório começado e
**não** terminado, e sumir da lista de pendências é exatamente o contrário do que
o usuário precisa.

> O estado oficial do relatório é do **Kizeo**. A agenda guarda um espelho que
> pode estar desatualizado, e não se comporta como se fosse a verdade.

## 7. Catálogo de tipos de relatório

O catálogo é do **Kizeo**. A agenda só informa qual tipo o contexto sugere.

| Tipo | Categoria da agenda que o origina |
| --- | --- |
| `AULA` | Aula |
| `MONITORIA` | Monitoria |
| `ATIVIDADE` | Projeto |
| `REUNIAO` | Reunião |
| `OCORRENCIA` | — (só direto no Kizeo) |
| `ACOMPANHAMENTO` | — (só direto no Kizeo) |
| `OUTRO` | — (só direto no Kizeo) |

Categorias **Estudo**, **Pessoal** e **Outro** não geram relatório. Estudo
pessoal e compromisso privado não são registro institucional, e uma categoria
indefinida não tem tipo previsível — melhor exigir a escolha do que adivinhar e
produzir lixo.

Um tipo desconhecido na URL deve cair em `OUTRO` com um aviso, nunca em erro.

## 8. O que cada lado guarda

### DailyPlanner — só a referência

```ts
type ReferenciaRelatorio = {
  integrationId: string;
  status: StatusRelatorio;
  reportId: string | null;
  reportUrl: string | null;
  reportType: string | null;
  updatedAt: string;
  message: string | null;
};
```

**Nunca**: conteúdo do relatório, campos, anexos, evidências, links, histórico.

### Kizeo — o relatório inteiro, mais a procedência

```ts
origem: {
  source: "dailyplanner" | "kizeo";
  scheduleId: string | null;
  integrationId: string | null;
}
```

Serve para responder "este relatório veio de qual horário?" e para a busca de
idempotência. **Não** serve para duplicar o relatório nem para o Kizeo virar
agenda.

## 9. Offline e falha

A agenda grava a intenção **antes** de abrir a janela. Estar sem internet,
fechar a aba ou ter o pop-up bloqueado deixa o compromisso em `pendente`, e ele
reaparece na lista "relatórios a registrar". Clicar de novo reenvia com o mesmo
`integrationId` — sem duplicar.

**O Kizeo nunca é obrigatório para usar a agenda.** Integração desligada, o
DailyPlanner não mostra nenhuma ação de relatório e funciona por inteiro.

## 10. Segurança

- **Sem credencial em lugar nenhum.** O handoff é navegação do usuário: não há
  token, chave ou senha para guardar.
- A agenda **descarta** usuário, senha, query e fragmento do endereço
  configurado. Colar `https://user:senha@host/?token=…` persiste apenas
  `https://host`.
- Só `http(s)` é aceito como endereço.
- `postMessage` valida origem, janela de procedência e formato da carga.
- Links de relatório abrem com `rel="noopener noreferrer"`.
- Todo texto de origem externa é escapado antes de virar HTML.

## 11. Mudar este contrato

1. Acrescentar campo **opcional** e ignorar desconhecidos: não sobe a versão.
2. Mudar significado, tornar campo obrigatório ou remover campo: **sobe a
   versão**, e o lado que recebe passa a tratar as duas.
3. Qualquer mudança entra nos **dois** repositórios no mesmo passo.
