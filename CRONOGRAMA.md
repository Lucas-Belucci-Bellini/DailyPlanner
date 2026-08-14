# CRONOGRAMA DO PROJETO DAILY PLANNER

## 1. Identificação

| Item | Informação |
| --- | --- |
| Projeto | Daily Planner |
| Objetivo | Desenvolver uma agenda diária para cadastro, organização e acompanhamento de compromissos. |
| Tecnologia principal | TypeScript |
| Ferramenta de build | Vite |
| Armazenamento atual | `localStorage` do navegador |
| Público do projeto | Estudantes e pessoas que precisam organizar atividades diárias. |

## 2. Objetivo geral

Construir uma aplicação web responsiva que permita ao usuário planejar o dia, registrar compromissos com horários, acompanhar o progresso das atividades e transportar seus dados por meio de exportação e importação em JSON.

## 3. Cronograma de execução

O desenvolvimento foi organizado em oito semanas. Cada etapa possui uma entrega verificável e uma condição de conclusão, permitindo acompanhar o projeto de forma objetiva durante a apresentação acadêmica.

| Semana | Período | Etapa | Atividades principais | Entrega | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Semana 1 | Levantamento de requisitos | Definir o problema, o público, as funcionalidades essenciais e as regras para horários. | Documento inicial de requisitos e lista de funcionalidades. | Concluída |
| 2 | Semana 2 | Escolha tecnológica | Comparar a solução anterior com uma aplicação estática moderna e escolher TypeScript + Vite. | Decisão arquitetural registrada no README. | Concluída |
| 3 | Semana 3 | Modelagem da aplicação | Definir a entidade `Task`, os campos do compromisso, os filtros e as regras de validação. | Tipos e regras de domínio em `frontend/src/types.ts`. | Concluída |
| 4 | Semana 4 | Implementação da agenda | Criar cadastro, edição, exclusão, conclusão e navegação entre datas. | Fluxo principal da agenda funcionando no navegador. | Concluída |
| 5 | Semana 5 | Persistência e portabilidade | Implementar `localStorage`, exportação em JSON e importação de dados. | Dados preservados entre sessões e arquivo JSON funcional. | Concluída |
| 6 | Semana 6 | Interface e acessibilidade | Desenvolver identidade visual, layout responsivo, estados vazios, mensagens e foco visível. | Interface final para desktop, tablet e celular. | Concluída |
| 7 | Semana 7 | Validação técnica | Executar verificação TypeScript, build de produção, revisão de fluxos e correção de inconsistências. | Build de produção gerada sem erros. | Concluída |
| 8 | Semana 8 | Documentação e apresentação | Organizar README, instruções de deploy, cronograma e roteiro de demonstração. | Repositório documentado e pronto para avaliação. | Concluída |

## 4. Funcionalidades entregues

| Código | Funcionalidade | Critério de aceitação |
| --- | --- | --- |
| F01 | Criar compromisso | O sistema salva título, descrição, data e intervalo de horário. |
| F02 | Validar intervalo | O sistema impede término igual ou anterior ao início. |
| F03 | Impedir conflitos | O sistema recusa compromissos que se sobrepõem no mesmo dia. |
| F04 | Navegar por datas | O usuário consegue avançar, voltar, escolher uma data e retornar para hoje. |
| F05 | Editar compromisso | Os dados existentes são carregados no formulário e podem ser atualizados. |
| F06 | Concluir compromisso | O cartão muda de estado e o resumo do dia é atualizado. |
| F07 | Filtrar agenda | O usuário pode visualizar todos, pendentes ou concluídos. |
| F08 | Buscar compromisso | A busca localiza termos no título ou na descrição do dia selecionado. |
| F09 | Persistir dados | Os compromissos continuam disponíveis após fechar e abrir o navegador. |
| F10 | Exportar e importar | A agenda pode ser salva e restaurada em um arquivo JSON. |
| F11 | Usar no celular | O layout se adapta a telas menores sem perder as ações principais. |

## 5. Critérios de qualidade

A entrega é considerada concluída quando a aplicação passa pela verificação de tipos com `npm run check`, gera a versão de produção com `npm run build`, não depende de uma API externa para executar o fluxo principal e mantém as informações essenciais após uma nova abertura do navegador.

A interface também deve apresentar mensagens claras de erro, impedir horários inválidos, preservar a navegação por teclado e manter contraste e organização suficientes para uso em telas pequenas. As instruções de execução e publicação devem estar disponíveis no README e no arquivo `DEPLOYMENT.md`.

## 6. Próximas etapas

| Prioridade | Evolução | Resultado esperado |
| --- | --- | --- |
| Alta | Testes automatizados de domínio | Cobrir duração, conflitos, filtros e validações com uma ferramenta como Vitest. |
| Média | Visão semanal | Visualizar compromissos de vários dias em uma única tela. |
| Média | Categorias e cores | Separar estudos, trabalho, saúde e atividades pessoais. |
| Média | Lembretes | Avisar o usuário antes do início de um compromisso. |
| Baixa | Conta e sincronização | Disponibilizar os mesmos dados em mais de um dispositivo com backend e autenticação. |

## 7. Roteiro de apresentação

Durante a apresentação, recomenda-se iniciar pela tela de hoje, cadastrar um compromisso, demonstrar a validação de sobreposição e concluir um item para atualizar o resumo. Em seguida, deve-se mostrar a navegação para outra data, o filtro de pendentes, a busca e a exportação JSON. Por fim, a estrutura `types.ts`, `storage.ts` e `main.ts` pode ser apresentada para explicar a separação entre regras, persistência e interface.
