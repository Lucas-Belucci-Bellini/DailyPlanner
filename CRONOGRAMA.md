# CRONOGRAMA

Cronograma do **Daily Planner** — agenda de horários que recusa dois compromissos
no mesmo minuto.

- **Aluno:** Lucas Belucci Bellini
- **Repositório:** <https://github.com/Lucas-Belucci-Bellini/DailyPlanner>
- **Stack:** Next.js + TypeScript + Postgres, publicado na Vercel

> Este arquivo tem duas partes. O **planejamento** abaixo é escrito à mão — é
> decisão de pessoa, e o bot nunca encosta nele. O **andamento**, mais adiante,
> fica entre marcadores e é montado automaticamente a partir do histórico do
> git, então reflete o que de fato foi feito, e não o que se pretendia fazer.

---

## Planejamento

| # | Etapa | Entrega | Situação |
| :-- | :--- | :--- | :--- |
| 1 | Definição do projeto | Escolha do tema e abertura do repositório | Concluída |
| 2 | Modelagem dos dados | Tabela de compromissos com data, início, fim e conclusão | Concluída |
| 3 | Regras da agenda | Validação de campos e recusa de horários sobrepostos | Concluída |
| 4 | Interface | Telas de agenda do dia, cadastro e edição | Concluída |
| 5 | Testes automatizados | Bateria cobrindo as regras e a navegação entre dias | Concluída |
| 6 | Integração contínua | Testes rodando a cada push e a cada pull request | Concluída |
| 7 | Documentação | README e CRONOGRAMA mantidos por bot | Concluída |
| 8 | Publicação | Aplicação no ar na Vercel com banco Postgres | Em andamento |
| 9 | Apresentação | Demonstração do sistema funcionando | Pendente |

### Decisões que mudaram o rumo

| Data | Decisão | Motivo |
| :--- | :--- | :--- |
| 03/08/2026 | Projeto começa em Java com Spring Boot e Thymeleaf | Prática de back-end com banco de dados |
| 04/08/2026 | Migração para Next.js + TypeScript | A Vercel não executa Java — não há runtime para JVM na plataforma, então publicar exigia trocar de linguagem ou de hospedagem |

---

## Andamento

O bloco abaixo é escrito pelo bot a partir do histórico do git, e só é
reescrito quando há commit novo. Não edite: a próxima execução sobrescreve.

<!-- CRONOGRAMA:START -->
<!-- ASSINATURA 5f2edad9f001cc09 -->

> **10** commits · **2** dias de trabalho · de 03/08/2026 a 04/08/2026

| Data | Commits | O que foi feito |
| :--- | ---: | :--- |
| **04/08/2026** | 7 | `9b9809f` chore: ajusta build Java 17 e frontend Vite<br>`4f0bcbe` ci: deploy frontend to gh-pages<br>`7705008` chore: add .gitignore<br>`0909716` chore: remove committed node_modules and dist and add .gitignore<br>`d54ea84` CI: deploy frontend/dist to GitHub Pages on push to main<br>`a0c691f` BRAVO<br>`105bf43` vite |
| **03/08/2026** | 3 | `c69a8eb` atualização forçada<br>`1c67393` atulização força no main<br>`e49ca36` Inicia o repositorio |

### Quem trabalhou

| Autor | Commits |
| :--- | ---: |
| Lucas Belucci Bellini | 9 |
| Claude | 1 |

<sub>Bloco escrito automaticamente pelo bot. Ultima mudanca detectada em 08/08/2026 as 23:08 UTC.</sub>

<!-- CRONOGRAMA:END -->
