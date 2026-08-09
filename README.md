# Daily Planner

Agenda de horários do dia a dia, escrita em **Next.js com TypeScript** e publicada na
**Vercel**.

Você escolhe um dia, marca seus compromissos com hora de início e fim, e o sistema cuida do
resto: guarda tudo em Postgres, mostra a agenda em ordem, calcula quanto tempo do dia está
ocupado e **recusa dois compromissos no mesmo minuto**.

As páginas são montadas no servidor pelo App Router e a gravação passa por Server Actions —
não há API separada para manter, e o navegador recebe HTML pronto.

O cronograma da disciplina está em [CRONOGRAMA.md](./CRONOGRAMA.md).

---

## Radiografia do projeto

O bloco abaixo é escrito por um bot que lê o código-fonte e regrava esta seção sozinho. Ele
roda a cada push e uma vez por dia, mas **só commita quando algo realmente mudou** — o bloco
carrega uma assinatura do próprio conteúdo, e execução sem novidade não gera commit. Não
edite o que está entre os marcadores: a próxima execução sobrescreve.

<!-- PROJETO:START -->
<!-- ASSINATURA a6a844f9fbefcdcb -->

> **Next.js 15.5.23** · **TypeScript 5.9.3** · **Postgres + Drizzle** · **4** rotas · **828** linhas · **27** testes (todos passando)

> Roda inteiro na Vercel: paginas montadas no servidor pelo App Router e gravacao por Server Actions, sem API separada para manter.

### Rotas

| Caminho | Arquivo | Renderizacao |
| :--- | :--- | :--- |
| `/` | `app/page.tsx` | estatica |
| `/agenda` | `app/agenda/page.tsx` | sob demanda (dados vivos) |
| `/agenda/[id]/editar` | `app/agenda/[id]/editar/page.tsx` | sob demanda (dados vivos) |
| `/agenda/novo` | `app/agenda/novo/page.tsx` | estatica |

### Gravacao (Server Actions)

Toda escrita passa por estas funcoes, que rodam no servidor:

- `salvarHorario()`
- `alternarConclusao()`
- `removerHorario()`

### Dados guardados no banco

Tabela `horarios`

| Campo | Coluna | Tipo | Regras |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `serial` | chave primaria |
| `titulo` | `titulo` | `varchar` | obrigatorio (`NOT NULL`), ate 120 caracteres |
| `descricao` | `descricao` | `varchar` | ate 500 caracteres |
| `data` | `data` | `date` | obrigatorio (`NOT NULL`) |
| `horaInicio` | `hora_inicio` | `time` | obrigatorio (`NOT NULL`) |
| `horaFim` | `hora_fim` | `time` | obrigatorio (`NOT NULL`) |
| `concluido` | `concluido` | `boolean` | obrigatorio (`NOT NULL`), padrao `false` |

### Regras da agenda

Funcoes puras em `lib/agenda.ts` — sem banco e sem React, por isso testadas de verdade:

  `emMinutos()`, `horaValida()`, `dataValida()`, `duracaoEmMinutos()`, `formatarDuracao()`, `conflita()`, `validarCampos()`, `temErro()`, `acharConflito()`, `mensagemDeConflito()`, `resumoDoDia()`, `ordenarPorHorario()`

### Testes

✅ todos passando — **27** testes em 2 arquivo(s).

> Numeros lidos do relatorio do Vitest, ou seja, de uma execucao real de `npm test` — nao de uma contagem no codigo.

| Arquivo de teste | Testes |
| :--- | ---: |
| `agenda.test.ts` | 20 |
| `datas.test.ts` | 7 |

### Tamanho do projeto

| Parte | Arquivos | Linhas |
| :--- | ---: | ---: |
| Telas e actions (`app/`) | 7 | 415 |
| Regras e banco (`lib/`) | 5 | 413 |
| Testes (`tests/`) | 2 | 224 |
| CSS | 1 | 422 |

<details>
<summary><b>Dependencias declaradas no <code>package.json</code></b></summary>

| Pacote | Versao | Uso |
| :--- | :--- | :--- |
| `drizzle-orm` | `^0.45.2` | producao |
| `next` | `^15.5.23` | producao |
| `postgres` | `^3.4.9` | producao |
| `react` | `^19.0.0` | producao |
| `react-dom` | `^19.0.0` | producao |
| `@types/node` | `^22.10.0` | desenvolvimento |
| `@types/react` | `^19.0.0` | desenvolvimento |
| `@types/react-dom` | `^19.0.0` | desenvolvimento |
| `drizzle-kit` | `^0.31.10` | desenvolvimento |
| `typescript` | `^5.9.3` | desenvolvimento |
| `vitest` | `^4.1.10` | desenvolvimento |

</details>

<sub>Bloco escrito automaticamente pelo bot. Ultima mudanca detectada em 08/08/2026 as 23:09 UTC.</sub>

<!-- PROJETO:END -->

---

## Como rodar

Precisa do **Node 20 ou mais novo** e de um **Postgres**.

```bash
git clone https://github.com/Lucas-Belucci-Bellini/DailyPlanner.git
cd DailyPlanner
npm install

cp .env.example .env.local     # aponte POSTGRES_URL para o seu banco
npm run db:push                # cria a tabela
npm run dev
```

Depois abra **<http://localhost:3000>**.

### Testes

```bash
npm test
```

A bateria cobre as regras da agenda em `lib/`, que são funções puras: rodam em
milissegundos e **não precisam de banco no ar**.

### Build de produção

```bash
npm run build
npm start
```

## Publicar na Vercel

1. Importe o repositório em <https://vercel.com/new>.
2. Em **Storage → Create Database → Postgres**, crie o banco. A Vercel injeta a variável
   `POSTGRES_URL` no projeto sozinha.
3. Rode `npm run db:push` uma vez apontando para esse banco, para criar a tabela.
4. Cada push na `main` publica sozinho.

Nenhum passo extra de configuração: o projeto é Next.js puro, que é o formato que a
plataforma executa nativamente.

## O que dá para fazer

- Navegar entre os dias (dia anterior, próximo dia, ir para uma data, voltar para hoje)
- Adicionar um compromisso com título, data, horário de início e fim e descrição opcional
- Editar e remover compromissos
- Marcar como concluído e reabrir
- Ver o resumo do dia: total, pendentes, tempo ocupado, tempo livre e percentual concluído

### Regras que o sistema garante

- O título é obrigatório (até 120 caracteres) e a descrição vai até 500
- O término precisa ser **depois** do início
- Dois compromissos **não podem disputar o mesmo minuto** do mesmo dia. O erro aparece no
  formulário dizendo qual compromisso já ocupa aquele intervalo, e o que você digitou
  continua lá
- Encostar um no outro é permitido: 09:00-10:00 e 10:00-11:00 convivem numa boa
- O mesmo horário em dias diferentes também é permitido

## Como o código está organizado

```
app/
├── page.tsx                    "/" leva para a agenda de hoje
├── actions.ts                  Server Actions: toda gravação passa por aqui
├── ConfiguracaoPendente.tsx    tela mostrada quando ainda falta o banco
├── globals.css                 estilo único, sem framework
└── agenda/
    ├── page.tsx                a agenda do dia
    ├── FormularioHorario.tsx   o formulário de criar e editar
    ├── novo/page.tsx           criar
    └── [id]/editar/page.tsx    editar

lib/
├── agenda.ts                   as regras: conflito, duração, validação, resumo
├── datas.ts                    datas escritas em português
├── repositorio.ts              acesso ao banco (sem regra de negócio)
└── db/
    ├── schema.ts               a tabela, em Drizzle
    └── index.ts                conexão preguiçosa com o Postgres

tests/                          as regras testadas sem banco
```

O caminho de uma gravação é sempre o mesmo: **Server Action** recebe o formulário,
**`lib/agenda.ts`** aplica as regras, **`lib/repositorio.ts`** fala com o banco, e a página
é remontada no servidor.

As regras ficam em funções puras, e não dentro das telas, de propósito: é o que permite
testá-las de verdade, sem subir Postgres nem renderizar React.

### Por que os horários são texto

Horas viajam como `"HH:mm"` e datas como `"aaaa-mm-dd"`, do formulário até o banco. É o
formato que `<input type="time">` e `<input type="date">` mandam e leem, e as colunas são
`time` e `date` sem fuso. Um compromisso das 09:00 é as 09:00 de quem marcou — guardar como
instante com fuso faria o horário andar sozinho conforme a região do servidor.

## Próximos passos

- Visão de semana e de mês (`listarPorPeriodo` já existe para isso)
- Categorias e cores por tipo de compromisso
- Compromissos que se repetem toda semana
- Login, para a agenda ser de cada pessoa
