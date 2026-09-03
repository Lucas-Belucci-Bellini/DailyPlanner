# Daily Planner

O **Daily Planner** é uma agenda diária para transformar planos em compromissos claros. A aplicação permite cadastrar, editar, concluir, excluir, buscar e filtrar atividades por data, mantendo os dados salvos no navegador.

> **O Daily Planner responde a uma pergunta só: _quando?_**
>
> Ele guarda horários, compromissos e o mínimo para saber se algum deles ainda precisa virar relatório. **O que aconteceu durante a atividade é do [Kizeo Forms](https://github.com/Lucas-Belucci-Bellini/Kizeo-Forms)** — a agenda nunca guarda uma cópia disso. Os dois sistemas são independentes: a agenda funciona por inteiro com a integração desligada.
>
> O contrato entre eles está em [`docs/INTEGRATION_DAILYPLANNER_KIZEO.md`](./docs/INTEGRATION_DAILYPLANNER_KIZEO.md); a auditoria e as decisões, em [`docs/INTEGRATION_ARCHITECTURE.md`](./docs/INTEGRATION_ARCHITECTURE.md).

> O projeto foi migrado para **TypeScript + Vite**. A decisão elimina a dependência de um backend Java que não estava conectado ao frontend publicado e deixa a aplicação adequada para hospedagem estática, como GitHub Pages.

## O que o projeto faz

| Recurso | Descrição |
| --- | --- |
| Agenda por data | Navegação entre dias, seleção de uma data e atalho para voltar a hoje. |
| Visão semanal | Os sete dias da semana lado a lado, com clique para abrir o dia. |
| Compromissos | Título, observação curta, data, horário de início e término. |
| Categorias | Aula, Monitoria, Estudo, Projeto, Reunião, Pessoal e Outro, cada uma com sua cor. |
| Prioridade | Baixa, normal ou alta. |
| Recorrência | Repetição diária, de segunda a sexta ou semanal, com data final. |
| Regras de horário | O término precisa ser posterior ao início e intervalos sobrepostos são recusados. |
| Acompanhamento | Filtros de todos, pendentes, concluídos e sem relatório, com resumo e barra de progresso. |
| Busca | Pesquisa instantânea por título, observação ou categoria, ignorando acento e caixa. |
| Resumo do dia | Total, pendentes, concluídos, tempo ocupado, próximo compromisso e progresso. |
| Integração | Botão para registrar o relatório no Kizeo — só em categorias compatíveis, e só quando ligada. |
| Persistência | Os compromissos são salvos no `localStorage`, com esquema versionado e migração automática. |
| Portabilidade | Exportação e importação em JSON, mesclando por padrão em vez de substituir. |
| Responsividade | Layout adaptado para computador, tablet e celular, com foco visível e suporte a movimento reduzido. |
| Tema | Modo claro e modo escuro, com detecção da preferência do sistema e escolha salva no navegador. |

## Stack escolhida

A linguagem principal é **TypeScript**, executada no navegador e compilada pelo **Vite**. TypeScript foi escolhido porque combina a velocidade de desenvolvimento do JavaScript com tipos explícitos para entidades e regras de negócio, enquanto Vite fornece um ciclo de desenvolvimento rápido e uma build estática simples de publicar.

| Camada | Tecnologia |
| --- | --- |
| Interface | HTML sem framework, CSS responsivo e TypeScript |
| Build | Vite 5 |
| Persistência | `localStorage` do navegador |
| Tema | CSS variables + preferência salva no `localStorage` |
| Qualidade | TypeScript estrito (`tsc --noEmit`) e 62 testes de domínio com `node --test` |
| Hospedagem | GitHub Pages, Vercel, Netlify ou qualquer servidor de arquivos estáticos |

## Como executar localmente

É necessário ter **Node.js 18 ou superior** instalado. Depois, execute:

```bash
git clone https://github.com/Lucas-Belucci-Bellini/DailyPlanner.git
cd DailyPlanner/frontend
npm install
npm run dev
```

Abra o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

### Comandos disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento com atualização automática. |
| `npm run check` | Verifica o TypeScript sem gerar arquivos. |
| `npm test` | Roda os testes de domínio (sem dependências: `node --test`). |
| `npm run verify` | Tipos, testes e build — o que o CI executa. |
| `npm run build` | Verifica os tipos e gera a versão de produção em `frontend/dist`. |
| `npm run preview` | Serve localmente a build de produção. |

Os testes usam a remoção nativa de tipos do Node, então exigem **Node 22.6 ou
superior** e nenhuma dependência de teste.

## Como usar

Ao abrir a aplicação, escolha uma data ou navegue pelos botões de dia anterior e próximo dia. Clique em **Novo compromisso**, informe o título, o intervalo de horário e, se desejar, uma descrição. A agenda informa imediatamente quando existe conflito com outro compromisso do mesmo dia.

Cada cartão possui ações para concluir ou reabrir, editar e excluir. O campo de busca procura em todos os compromissos do dia, e os filtros ajudam a visualizar apenas pendências ou itens já concluídos. O botão **Modo escuro** alterna o tema imediatamente, e a escolha fica salva para a próxima visita; na primeira abertura, a aplicação acompanha a preferência de tema do sistema. Para transportar os dados entre navegadores, use **Exportar** e depois **Importar** com o arquivo JSON gerado.

## Estrutura do projeto

```text
DailyPlanner/
├── CRONOGRAMA.md             planejamento acadêmico do desenvolvimento
├── DEPLOYMENT.md             instruções de publicação
├── README.md                 documentação principal
├── docs/
│   ├── INTEGRATION_ARCHITECTURE.md        auditoria, decisões e desenho
│   └── INTEGRATION_DAILYPLANNER_KIZEO.md  o contrato (espelhado no Kizeo)
├── .github/workflows/        automação de build e deploy
└── frontend/
    ├── index.html
    ├── src/
    │   ├── domain/           regra de negócio pura: sem DOM, sem localStorage
    │   │   ├── datetime.ts       datas e horários locais
    │   │   ├── categoria.ts      catálogo e a regra "esta categoria gera relatório?"
    │   │   ├── compromisso.ts    a entidade, validação, conflito, resumo
    │   │   ├── recorrencia.ts    repetição e expansão da série
    │   │   ├── agenda.ts         busca e filtros
    │   │   └── integracao.ts     o contrato — só o formato dos dados
    │   ├── storage/          localStorage com esquema versionado
    │   ├── integration/      kizeo.ts — o transporte, e o único que sabe como
    │   ├── ui/               fragmentos de renderização
    │   ├── main.ts           fiação: estado, render, eventos
    │   └── style.css
    └── test/                 testes de domínio (node --test)
```

**A regra da estrutura:** `domain/` não conhece navegador. É o que permite testar
a agenda inteira sem DOM, e o que impede a regra de negócio de se espalhar pela
interface.

## Limitações conhecidas

A versão atual é deliberadamente **client-side**: os dados pertencem ao navegador em que foram criados e não existe login ou sincronização entre dispositivos. A exportação JSON funciona como uma forma simples de backup. Um backend, autenticação e banco de dados podem ser incluídos em uma próxima etapa se o projeto precisar de uso multiusuário.

## Banco de dados: é necessário agora?

Para a versão atual, **não é necessário adicionar um banco de dados**. O Daily Planner é um projeto client-side de uso individual: o `localStorage` é suficiente para manter os compromissos no navegador, o deploy continua simples e não exige servidor, login ou configuração de credenciais. A exportação em JSON também oferece um backup manual.

| Cenário de uso | Solução adequada |
| --- | --- |
| Trabalho acadêmico, protótipo ou uso em um único navegador | Manter `localStorage`, como está agora. |
| Acessar a mesma agenda no celular e no computador | Adicionar backend, autenticação e banco de dados. |
| Vários usuários, compartilhamento ou permissões | Usar banco de dados com contas e regras de acesso. |
| Lembretes confiáveis mesmo com a página fechada | Adicionar backend e tarefas agendadas. |

Se o objetivo for transformar o projeto em um produto multiusuário, eu recomendo a próxima arquitetura com **TypeScript no frontend, uma API TypeScript no backend e PostgreSQL**. Para o escopo atual da faculdade, essa mudança aumentaria a complexidade sem entregar benefício imediato; por isso, o banco deve ser uma etapa futura, não uma exigência da versão atual.

## Próximos passos sugeridos

O cronograma acadêmico detalhado está em [`CRONOGRAMA.md`](./CRONOGRAMA.md). Visão semanal, categorias com cores e testes automatizados já foram entregues. Entre as evoluções ainda planejadas estão lembretes, banco PostgreSQL com autenticação e sincronização entre dispositivos.
