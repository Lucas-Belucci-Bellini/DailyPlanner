# Daily Planner

Organizador de horarios do dia a dia, escrito em **Java 21 com Spring Boot**.

Voce escolhe um dia, marca seus compromissos com hora de inicio e fim, e o sistema cuida do
resto: guarda tudo em banco, mostra a agenda em ordem, calcula quanto tempo do dia esta
ocupado e **recusa dois compromissos no mesmo horario**.

As paginas sao montadas no servidor com Thymeleaf. Nao ha JavaScript no projeto: a navegacao
entre dias, os formularios e os botoes de concluir/remover sao links e `<form>` HTML comuns,
e toda a logica roda em Java.

---

## Tecnologias

| Camada | O que foi usado |
| --- | --- |
| Linguagem | Java 21 |
| Framework | Spring Boot 3.5 |
| Web | Spring MVC + Thymeleaf (HTML gerado no servidor) |
| Banco | Spring Data JPA / Hibernate + H2 |
| Validacao | Jakarta Bean Validation |
| Build | Maven (com wrapper `./mvnw`) |
| Testes | JUnit 5, AssertJ, MockMvc |

## Como rodar

Precisa apenas do **JDK 21** instalado. O Maven vem junto no wrapper.

```bash
git clone https://github.com/Lucas-Belucci-Bellini/DailyPlanner.git
cd DailyPlanner
./mvnw spring-boot:run
```

No Windows, troque `./mvnw` por `mvnw.cmd`.

Depois abra **<http://localhost:8080>** no navegador.

Os dados ficam num arquivo H2 dentro da pasta `dados/`, entao a agenda continua la na proxima
vez que voce subir a aplicacao. Para comecar do zero, apague a pasta `dados/`.

### Rodar os testes

```bash
./mvnw test
```

### Gerar o `.jar` para publicar

```bash
./mvnw clean package
java -jar target/dailyplanner-0.0.1-SNAPSHOT.jar
```

### Espiar o banco pelo navegador

O console do H2 vem desligado. Para liga-lo:

```bash
./mvnw spring-boot:run -Dspring-boot.run.arguments=--spring.h2.console.enabled=true
```

Acesse <http://localhost:8080/h2-console> e informe a URL `jdbc:h2:file:./dados/dailyplanner`,
usuario `sa`, senha em branco.

## O que da para fazer

- Navegar entre os dias (dia anterior, proximo dia, ir para uma data, voltar para hoje)
- Adicionar um compromisso com titulo, data, horario de inicio e fim e uma descricao opcional
- Editar e remover compromissos
- Marcar como concluido e reabrir
- Ver o resumo do dia: total, pendentes, tempo ocupado, tempo livre e percentual concluido

### Regras que o sistema garante

- O titulo e obrigatorio (ate 120 caracteres) e a descricao vai ate 500
- O termino precisa ser **depois** do inicio
- Dois compromissos **nao podem disputar o mesmo minuto** do mesmo dia. O erro aparece no
  formulario dizendo qual compromisso ja ocupa aquele intervalo
- Encostar um no outro e permitido: 09:00-10:00 e 10:00-11:00 convivem numa boa
- O mesmo horario em dias diferentes tambem e permitido

## Como o codigo esta organizado

```
src/main/java/br/com/lucasbellucci/dailyplanner/
├── DailyPlannerApplication.java     ponto de entrada
├── model/Horario.java               a entidade: vira a tabela "horario" no banco
├── repository/HorarioRepository.java consultas (o Spring Data implementa sozinho)
├── service/
│   ├── HorarioService.java          as regras da agenda; toda gravacao passa por aqui
│   ├── ResumoDoDia.java             os numeros do cabecalho
│   └── ...Exception.java            erros de negocio
└── web/
    ├── AgendaController.java        as rotas das telas
    ├── RaizController.java          "/" leva para a agenda de hoje
    └── DatasPtBr.java               datas escritas em portugues

src/main/resources/
├── application.properties           banco, locale e porta
├── static/css/estilo.css            estilo unico, sem framework
└── templates/
    ├── fragments/base.html          pedacos reaproveitados (head, rodape)
    ├── agenda/dia.html              a agenda do dia
    ├── agenda/formulario.html       criar e editar
    └── error.html                   pagina de erro
```

O caminho de uma requisicao e sempre o mesmo: **Controller** recebe, **Service** aplica as
regras, **Repository** fala com o banco, e o **Thymeleaf** devolve o HTML pronto.

As regras ficam no service, e nao no controller, de proposito: assim elas continuam valendo
se um dia o projeto ganhar uma API REST ou uma tela nova.

## Testes

`./mvnw test` roda 39 testes em quatro niveis:

- `HorarioTest` - calculo de duracao e deteccao de sobreposicao, sem Spring
- `DatasPtBrTest` - datas por extenso em portugues
- `HorarioServiceTest` - as regras da agenda contra um banco H2 de verdade (`@DataJpaTest`)
- `AgendaControllerTest` - as telas de ponta a ponta com MockMvc, incluindo o HTML renderizado
- `DailyPlannerApplicationTests` - a aplicacao sobe inteira

## Publicar na internet

O GitHub guarda o codigo, mas nao roda Java nem banco de dados (o GitHub Pages so serve
sites estaticos). Para colocar no ar, gere o `.jar` com `./mvnw clean package` e suba em um
servico de nuvem como **Railway** ou **Render**, trocando o H2 por um **PostgreSQL**.

A troca de banco mexe em dois lugares apenas: a dependencia no `pom.xml` e a
`spring.datasource.url` no `application.properties`. O resto do codigo continua igual, porque
quem conversa com o banco e o JPA.

## Proximos passos

- Visao de semana e de mes (o `HorarioService.listarPorPeriodo` ja existe para isso)
- Categorias e cores por tipo de compromisso
- Compromissos que se repetem toda semana
- Login, para a agenda ser de cada pessoa
- API REST, para um app de celular consumir a mesma base
