# Arquitetura da integração DailyPlanner ↔ Kizeo Forms

> Documento de auditoria e arquitetura. A **especificação do contrato** — o
> formato exato dos dados que atravessam a fronteira — está em
> [`INTEGRATION_DAILYPLANNER_KIZEO.md`](./INTEGRATION_DAILYPLANNER_KIZEO.md),
> que existe idêntico nos dois repositórios.

## 1. A regra que organiza tudo

| | DailyPlanner | Kizeo Forms |
| --- | --- | --- |
| Pergunta | **Quando?** | **O que aconteceu?** |
| Guarda | horários, compromissos, agenda | relatórios, registros, evidências |
| Dono de | a grade do dia | o conteúdo do relatório |
| Metáfora | o relógio | o livro de registros |

O DailyPlanner **não vira** um sistema de relatórios. O Kizeo **não vira** uma
agenda pessoal. Quando um horário precisa de relatório, a agenda entrega
*contexto* e sai do caminho.

## 2. Auditoria inicial

Levantamento feito antes de qualquer alteração de código.

### 2.1 DailyPlanner — estado encontrado

| Item | Situação |
| --- | --- |
| Stack | TypeScript 5.6 estrito + Vite 5, sem framework |
| Estrutura | `frontend/src/` com quatro arquivos: `main.ts` (481 linhas), `types.ts`, `storage.ts`, `style.css` |
| Frontend | HTML gerado por template string, re-renderização total a cada evento |
| Backend | **Não existe.** Havia um backend Java abandonado, já removido antes desta auditoria |
| Armazenamento | `localStorage`, chave `daily-planner.tasks.v1`, array cru sem versão |
| APIs | Nenhuma |
| Autenticação | Nenhuma |
| Documentação | `README.md`, `CRONOGRAMA.md`, `DEPLOYMENT.md` — bons e atualizados |
| Testes | **Nenhum** |
| Workflows | `deploy-frontend.yml` — build e publicação no GitHub Pages |
| Deploy | GitHub Pages + Vercel (`vercel.json` na raiz e em `frontend/`) |
| Funcionalidades | CRUD de compromisso, navegação por data, conflito de horário, busca, filtros, exportar/importar JSON, modo escuro |
| Integrações | Nenhuma |

**Código morto encontrado:** `replaceTasks()` era apelido idêntico de
`saveTasks()`; `clearTasks()` era exportado e nunca usado.

**Defeitos encontrados** (todos corrigidos — ver §5):

| # | Defeito | Consequência |
| --- | --- | --- |
| 1 | Importar **substituía** toda a agenda sem confirmação | perda silenciosa de dados |
| 2 | `crypto.randomUUID()` sem alternativa | cadastro quebrava fora de contexto seguro — inclusive ao testar no celular via `vite --host` |
| 3 | Cada tecla na busca re-renderizava o app inteiro | foco e cursor recolocados na mão a cada tecla |
| 4 | `URL.revokeObjectURL` chamado logo após `click()` | download da exportação podia ser cancelado |
| 5 | `<input type="file">` não era zerado | reimportar o mesmo arquivo não disparava `change` |
| 6 | Comparação de horário por string sem normalizar | `"9:00"` é *maior* que `"10:00"`: conflito passava batido em dado importado |
| 7 | `:root { color }` não sobrescrito no modo escuro | texto sem cor explícita ficava escuro no escuro (a data em "NAVEGAR") |
| 8 | `.brand-mark` clara sobre clara no modo escuro | marca ilegível |
| 9 | Esquema de `localStorage` sem versão | qualquer mudança de formato descartaria o dado do usuário em silêncio |
| 10 | `<a href="#" data-action="home">` como botão | navegava e sujava o histórico |

### 2.2 Kizeo Forms — estado encontrado

| Item | Situação |
| --- | --- |
| Código | **Nenhum.** O repositório continha só documentação |
| `README.md` | vazio (0 linhas) |
| `docs/` | `MASTER_PROMPT.md` (1611 linhas), `PROMPT_FASE_01_IMPLEMENTACAO.md` (1157), `PROMPT_FASE_02_EXPERIENCIA_E_RELATORIOS.md` (1065) |
| Stack | não definida — os documentos *sugerem* Next.js + Supabase, mas dizem explicitamente que é preferência, não obrigação |
| Formulários | nenhum implementado; descritos em prosa |
| Modelo de dados | proposto em prosa (entradas, relatórios, evidências, recursos, compartilhamento) |
| Autenticação | descrita, não implementada |
| Testes, CI, deploy | nenhum |

**Conclusão da auditoria:** o Kizeo não tinha arquitetura para preservar. A
instrução "não reconstruir o Kizeo cegamente" foi respeitada da única forma
possível: **construir o núcleo mínimo** que a regra de separação exige, com o
domínio isolado da persistência para que a base de dados descrita nos
documentos possa entrar depois sem reescrever regra de negócio.

## 3. Decisões de arquitetura

### ADR-01 — A fronteira é o navegador do usuário, não uma chamada de API

**Contexto.** O DailyPlanner é estático e não deve ganhar backend (regra 5). O
frontend não pode conter credencial (regra 19).

**Decisão.** O handoff acontece por **navegação do usuário + `postMessage`**: a
agenda abre a tela de novo relatório do Kizeo com o contexto do horário na URL,
e o Kizeo devolve a referência do relatório pela janela que o abriu.

**Consequência.** Não existe token, chave ou senha em lugar nenhum — não porque
foram escondidos, mas porque o desenho não precisa deles. Os dois sistemas
continuam sendo sites estáticos independentes. Se um dia o Kizeo ganhar API
autenticada, só o adaptador (`src/integration/kizeo.ts`) muda.

**Alternativa rejeitada.** `fetch` autenticado do DailyPlanner para uma API do
Kizeo: exigiria credencial no frontend público, ou um backend só para escondê-la.

### ADR-02 — Idempotência por chave determinística

`integrationId = "dailyplanner:<scheduleId>:<TIPO>"`.

A mesma origem, o mesmo horário e o mesmo tipo sempre produzem a mesma chave.
Reenviar depois de um *timeout*, de uma aba fechada ou de um clique repetido faz
o Kizeo **reconhecer o relatório que já existe** em vez de criar um segundo.

Trocar o tipo produz outra chave de propósito: mudar a categoria de um
compromisso de Aula para Monitoria descreve outro registro, não o mesmo.

### ADR-03 — O parâmetro na URL não decide para onde o Kizeo responde

O Kizeo poderia receber a origem de retorno na própria URL. Não recebe: quem
abre a janela manda um `planner:ola` depois que o Kizeo anuncia `kizeo:pronto`,
e o Kizeo grava a origem **da mensagem recebida**. Assim ele nunca responde para
um endereço que apareceu num parâmetro, e a agenda nunca aceita resposta de uma
janela que não foi ela quem abriu.

### ADR-04 — A recorrência é materializada, não virtual

Criar um compromisso repetido gera N compromissos concretos ligados por
`seriesId`, em vez de guardar a regra e expandi-la na leitura.

Conclusão, conflito de horário e referência de relatório são todos **por
ocorrência**. Guardar a regra obrigaria a manter uma lista de exceções por
ocorrência para os três. Materializar mantém a entidade plana e faz o resto da
aplicação funcionar sem saber que recorrência existe.

**Preço aceito:** não há "editar a série inteira" depois da criação — só excluir
a série ou editar ocorrência por ocorrência.

### ADR-05 — Dados em inglês, código em português

Os campos persistidos (`title`, `startTime`, `category`…) são **contrato**:
aparecem no JSON exportado pelo usuário e no pacote de integração. Renomeá-los
quebraria arquivos já salvos. O código em volta — módulos, funções, comentários,
interface — é em português, como o resto da documentação do repositório.

### ADR-06 — Kizeo em TypeScript + Vite, com domínio sem dependências

Os documentos do Kizeo sugerem Next.js + Supabase. Foi adiado, com motivo:

- não há autenticação nem multiusuário **ainda**, e é isso que justifica um banco;
- o repositório estava vazio: não havia stack para preservar;
- a mesma stack dos dois lados torna o ecossistema executável com um `npm ci`.

O que **não** foi adiado é o que tornaria a migração cara depois: o domínio
(`src/domain/`) não tem DOM nem dependência, e a persistência fica atrás de uma
porta (`RepositorioRelatorios`). Trocar `localStorage` por Postgres é escrever
outro adaptador — a regra de negócio e os testes não mudam.

## 4. Desenho

```text
┌──────────────────────────────┐         ┌──────────────────────────────┐
│        DAILYPLANNER          │         │         KIZEO FORMS          │
│           "QUANDO?"          │         │     "O QUE ACONTECEU?"       │
│                              │         │                              │
│  domain/    (puro)           │         │  domain/    (puro)           │
│  storage/   localStorage     │         │  storage/   localStorage     │
│  ui/                         │         │  ui/                         │
│  integration/kizeo.ts  ──────┼── URL ──┼─→ integration/entrada.ts     │
│                        ←─────┼─ msg ───┼──                            │
└──────────────────────────────┘         └──────────────────────────────┘
        guarda: referência                    guarda: o relatório
     (id, url, status, tipo)              (todos os campos, evidências)
```

A seta é fina de propósito. Ela carrega **contexto de horário**, nunca conteúdo
de relatório; e traz de volta **uma referência**, nunca o relatório.

### O que atravessa

| Da agenda para o Kizeo | Do Kizeo para a agenda |
| --- | --- |
| `integrationId`, `scheduleId` | `integrationId` (o mesmo) |
| data, hora inicial, hora final | `reportId`, `reportUrl` |
| título, categoria, observação curta | `status`, `reportType` |
| tipo de relatório pretendido | — |

### O que **não** atravessa

- conteúdo de relatório, em nenhuma direção;
- anexos, evidências, links;
- compromissos que não são registro (Estudo, Pessoal, Outro);
- credenciais.

## 5. O que mudou no DailyPlanner

### Estrutura

```text
frontend/src/
├── domain/          regra de negócio pura — sem DOM, sem localStorage, testável
│   ├── datetime.ts      datas e horários locais
│   ├── categoria.ts     catálogo e a regra "esta categoria gera relatório?"
│   ├── compromisso.ts   a entidade, validação, conflito, resumo
│   ├── recorrencia.ts   regras de repetição e expansão da série
│   ├── agenda.ts        busca e filtros
│   └── integracao.ts    o contrato — só o formato dos dados
├── storage/         persistência com esquema versionado
├── integration/     kizeo.ts — o transporte, e o único que sabe como
├── ui/              fragmentos de renderização
└── main.ts          fiação: estado, render, eventos
```

`main.ts` passou de 481 linhas fazendo tudo para fiação. As 62 asserções em
`frontend/test/` só são possíveis porque `domain/` não toca no navegador.

### Corrigido

Os dez defeitos da tabela em §2.1. Dois merecem nota:

- **Importação destrutiva** → o padrão agora é **mesclar** (id conhecido é
  ignorado); substituir continua possível, mas exige confirmação explícita.
- **Esquema sem versão** → `daily-planner.agenda.v2` é um envelope com número de
  versão e migração automática do v1. **A chave v1 não é apagada**: é a única
  cópia do dado anterior do usuário.

### Acrescentado

Categorias com cor · prioridade · recorrência (diária, dias úteis, semanal) ·
visão semanal · filtro por categoria · filtro "sem relatório" · busca que ignora
acento · próximo compromisso · lista de relatórios a registrar · configurações ·
atalho <kbd>N</kbd> · 62 testes.

### Deliberadamente **não** acrescentado

Nada de formulário de relatório, campo de conteúdo, anexo, evidência ou link.
São do Kizeo. A observação do compromisso continua sendo uma linha curta.

## 6. Como verificar

```bash
cd frontend && npm ci && npm run verify   # tipos + 62 testes + build
```

## 7. Limites conhecidos

- **Sem `window.opener` não há retorno automático.** Se o navegador abrir o
  Kizeo sem vínculo com a janela de origem, o relatório é criado normalmente e a
  agenda continua marcando "pendente" — o compromisso reaparece na lista de
  registros a fazer. A integração degrada, não quebra.
- **A referência é local.** Trocar de navegador leva os compromissos (exportação
  JSON) mas não reconstrói o vínculo com relatórios criados no outro navegador.
- **Um relatório por horário e tipo.** É o desenho da chave de idempotência.
- **Não há sincronização entre dispositivos** em nenhum dos dois lados. Continua
  sendo o próximo passo, e continua exigindo backend e autenticação.
