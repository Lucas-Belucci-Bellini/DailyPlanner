# Daily Planner

O **Daily Planner** é uma agenda diária simples para transformar planos em compromissos claros. A aplicação permite cadastrar, editar, concluir, excluir, buscar e filtrar atividades por data, mantendo os dados salvos no navegador.

> O projeto foi migrado para **TypeScript + Vite**. A decisão elimina a dependência de um backend Java que não estava conectado ao frontend publicado e deixa a aplicação adequada para hospedagem estática, como GitHub Pages.

## O que o projeto faz

| Recurso | Descrição |
| --- | --- |
| Agenda por data | Navegação entre dias, seleção de uma data e atalho para voltar a hoje. |
| Compromissos | Cadastro de título, descrição, data, horário de início e término. |
| Regras de horário | O término precisa ser posterior ao início e intervalos sobrepostos são recusados. |
| Acompanhamento | Filtros de todos, pendentes e concluídos, com resumo e barra de progresso. |
| Busca | Pesquisa instantânea por título ou descrição. |
| Persistência | Os compromissos são salvos no `localStorage` do navegador. |
| Portabilidade | Exportação e importação da agenda em JSON. |
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
| Qualidade | TypeScript em modo estrito (`tsc --noEmit`) e build de produção |
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
| `npm run build` | Executa a verificação de tipos e gera a versão de produção em `frontend/dist`. |
| `npm run preview` | Serve localmente a build de produção. |

## Como usar

Ao abrir a aplicação, escolha uma data ou navegue pelos botões de dia anterior e próximo dia. Clique em **Novo compromisso**, informe o título, o intervalo de horário e, se desejar, uma descrição. A agenda informa imediatamente quando existe conflito com outro compromisso do mesmo dia.

Cada cartão possui ações para concluir ou reabrir, editar e excluir. O campo de busca procura em todos os compromissos do dia, e os filtros ajudam a visualizar apenas pendências ou itens já concluídos. O botão **Modo escuro** alterna o tema imediatamente, e a escolha fica salva para a próxima visita; na primeira abertura, a aplicação acompanha a preferência de tema do sistema. Para transportar os dados entre navegadores, use **Exportar** e depois **Importar** com o arquivo JSON gerado.

## Estrutura do projeto

```text
DailyPlanner/
├── CRONOGRAMA.md             planejamento acadêmico do desenvolvimento
├── DEPLOYMENT.md             instruções de publicação
├── README.md                 documentação principal
├── .github/workflows/        automação de build e deploy
└── frontend/
    ├── index.html            documento HTML principal
    ├── package.json          scripts e dependências
    ├── tsconfig.json         configuração TypeScript estrita
    └── src/
        ├── main.ts           interface, eventos e fluxo da aplicação
        ├── storage.ts        persistência e recuperação do localStorage
        ├── style.css         identidade visual e responsividade
        └── types.ts          tipos e regras de domínio
```

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

O cronograma acadêmico detalhado está em [`CRONOGRAMA.md`](./CRONOGRAMA.md). Entre as evoluções planejadas estão visão semanal, categorias com cores, lembretes, testes automatizados de regras, banco PostgreSQL com autenticação e sincronização opcional com uma API.
