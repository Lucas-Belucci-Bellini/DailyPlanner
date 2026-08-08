#!/usr/bin/env python3
"""
Bot de radiografia do projeto — DailyPlanner.

Lê o código-fonte Java de verdade e regrava o bloco entre os marcadores
PROJETO no README: versões, rotas, entidade, consultas, testes e tamanho do
projeto. A ideia é que o README nunca mais fique desatualizado em relação ao
que o código realmente faz — quem muda uma rota ou um campo da entidade não
precisa lembrar de mexer na documentação.

**Só commita quando há dado novo.** O bloco carrega uma assinatura SHA-256 do
seu próprio conteúdo, calculada SEM a data de geração. Numa execução em que
nada mudou, a assinatura bate e o script sai sem tocar no arquivo — por isso o
agendamento de hora em hora não enche o histórico de commits vazios. A data
exibida é a data da última mudança real, não a do último giro do bot.

Os números vêm do projeto, não de um palpite:

  * versões saem do pom.xml
  * rotas saem das anotações @GetMapping/@PostMapping dos controllers
  * campos e regras saem das anotações da entidade @Entity
  * consultas saem da interface do repositório
  * a contagem de testes sai do relatório do Surefire quando o bot roda depois
    do `mvn test`; sem relatório, cai para a contagem de @Test no código e o
    README diz qual das duas fontes foi usada

Quando algo não puder ser lido, o bloco diz isso em vez de mostrar tabela vazia
como se o projeto não tivesse aquilo.

Uso:
    python3 .github/scripts/readme_stats.py

Variáveis de ambiente:
    PROJETO_DEBUG   "1" imprime o bloco gerado na saída padrão
"""

from __future__ import annotations

import hashlib
import os
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
README = ROOT / "README.md"
POM = ROOT / "pom.xml"
JAVA_MAIN = ROOT / "src" / "main" / "java"
JAVA_TEST = ROOT / "src" / "test" / "java"
RECURSOS = ROOT / "src" / "main" / "resources"
SUREFIRE = ROOT / "target" / "surefire-reports"

START = "<!-- PROJETO:START -->"
END = "<!-- PROJETO:END -->"
ASSINATURA = "<!-- PROJETO:ASSINATURA "

MAVEN_NS = {"m": "http://maven.apache.org/POM/4.0.0"}

DEBUG = os.environ.get("PROJETO_DEBUG", "0") == "1"


# --------------------------------------------------------------------- pom

def ler_pom() -> dict:
    """Versões e dependências declaradas no pom.xml."""
    if not POM.exists():
        return {}
    raiz = ET.parse(POM).getroot()

    def texto(no, caminho: str) -> str:
        achado = no.find(caminho, MAVEN_NS) if no is not None else None
        return (achado.text or "").strip() if achado is not None else ""

    pai = raiz.find("m:parent", MAVEN_NS)
    props = raiz.find("m:properties", MAVEN_NS)

    deps = []
    for dep in raiz.findall("m:dependencies/m:dependency", MAVEN_NS):
        artefato = texto(dep, "m:artifactId")
        escopo = texto(dep, "m:scope") or "compile"
        if artefato:
            deps.append((artefato, escopo))

    return {
        "spring_boot": texto(pai, "m:version"),
        "java": texto(props, "m:java.version"),
        "artefato": texto(raiz, "m:artifactId"),
        "versao": texto(raiz, "m:version"),
        "dependencias": deps,
    }


# ------------------------------------------------------------------ rotas

# @GetMapping / @PostMapping("/novo") / @RequestMapping("/agenda")
RE_CLASSE_MAPEADA = re.compile(
    r'@RequestMapping\(\s*"([^"]*)"\s*\)[\s\S]{0,400}?\bclass\s+(\w+)')
RE_METODO_MAPEADO = re.compile(
    r'@(Get|Post|Put|Delete|Patch)Mapping(?:\(\s*"([^"]*)"\s*\))?'
    r'[\s\S]{0,300}?\bpublic\s+[\w<>\[\], ]+?\s+(\w+)\s*\(')

VERBO = {"Get": "GET", "Post": "POST", "Put": "PUT",
         "Delete": "DELETE", "Patch": "PATCH"}


def achar_rotas() -> list[dict]:
    """Todas as rotas HTTP declaradas nos controllers."""
    rotas: list[dict] = []
    for arquivo in sorted(JAVA_MAIN.rglob("*.java")):
        texto = arquivo.read_text(encoding="utf-8")
        if "@Controller" not in texto and "@RestController" not in texto:
            continue

        classe = arquivo.stem
        casada = RE_CLASSE_MAPEADA.search(texto)
        prefixo = casada.group(1) if casada and casada.group(2) == classe else ""

        for verbo, sufixo, metodo in RE_METODO_MAPEADO.findall(texto):
            caminho = (prefixo.rstrip("/") + (sufixo or "")) or "/"
            rotas.append({
                "verbo": VERBO[verbo],
                "caminho": caminho,
                "classe": classe,
                "metodo": metodo,
            })
    rotas.sort(key=lambda r: (r["caminho"], r["verbo"]))
    return rotas


# --------------------------------------------------------------- entidade

RE_CAMPO = re.compile(
    r'((?:[ \t]*@\w+(?:\([^()]*(?:\([^()]*\)[^()]*)*\))?[ \t]*\r?\n)*)'
    r'[ \t]*private\s+([\w.]+(?:<[^>]+>)?)\s+(\w+)\s*;')


def regras_do_campo(anotacoes: str) -> list[str]:
    """Traduz as anotações do campo para as regras que ele impõe."""
    regras = []
    if "@Id" in anotacoes:
        regras.append("chave primária")
    if "@NotBlank" in anotacoes:
        regras.append("obrigatório, não pode ser só espaço")
    elif "@NotNull" in anotacoes:
        regras.append("obrigatório")
    tamanho = re.search(r'@Size\([^)]*max\s*=\s*(\d+)', anotacoes)
    if tamanho:
        regras.append(f"até {tamanho.group(1)} caracteres")
    formato = re.search(r'@DateTimeFormat\([^)]*pattern\s*=\s*"([^"]+)"', anotacoes)
    if formato:
        regras.append(f"formato `{formato.group(1)}`")
    elif "@DateTimeFormat" in anotacoes and "ISO.DATE" in anotacoes:
        regras.append("formato ISO (`aaaa-mm-dd`)")
    if re.search(r'@Column\([^)]*nullable\s*=\s*false', anotacoes):
        regras.append("`NOT NULL` no banco")
    return regras


def achar_entidades() -> list[dict]:
    """Cada classe @Entity com seus campos e as regras de cada campo."""
    entidades = []
    for arquivo in sorted(JAVA_MAIN.rglob("*.java")):
        texto = arquivo.read_text(encoding="utf-8")
        if "@Entity" not in texto:
            continue

        tabela = re.search(r'@Table\(\s*name\s*=\s*"([^"]+)"', texto)
        campos = []
        for anotacoes, tipo, nome in RE_CAMPO.findall(texto):
            campos.append({
                "nome": nome,
                "tipo": tipo.rsplit(".", 1)[-1],
                "regras": regras_do_campo(anotacoes),
            })
        entidades.append({
            "classe": arquivo.stem,
            "tabela": tabela.group(1) if tabela else arquivo.stem.lower(),
            "campos": campos,
        })
    return entidades


# -------------------------------------------------------------- consultas

RE_METODO_REPO = re.compile(
    r'^[ \t]*(?:@Query\(\s*"""(?P<jpql>[\s\S]*?)"""[\s\S]*?\)[\s\S]*?)?'
    r'^[ \t]*(?!//)(?P<retorno>[\w<>, .\[\]]+?)\s+(?P<nome>\w+)\s*\([^;{]*\);',
    re.M)


def achar_consultas() -> list[dict]:
    """Métodos declarados nas interfaces de repositório."""
    consultas = []
    for arquivo in sorted(JAVA_MAIN.rglob("*Repository.java")):
        texto = arquivo.read_text(encoding="utf-8")
        corpo = texto.split("{", 1)[-1]
        for casada in RE_METODO_REPO.finditer(corpo):
            nome = casada.group("nome")
            if nome in {"if", "for", "while", "return", "switch"}:
                continue
            consultas.append({
                "interface": arquivo.stem,
                "nome": nome,
                "retorno": casada.group("retorno").strip().split()[-1],
                "derivada": casada.group("jpql") is None,
            })
    return consultas


# ---------------------------------------------------------------- tamanho

def contar(padrao: str, base: Path) -> tuple[int, int]:
    """(arquivos, linhas) que casam com o padrão."""
    arquivos = [p for p in base.rglob(padrao) if p.is_file()] if base.exists() else []
    linhas = sum(len(p.read_text(encoding="utf-8", errors="replace").splitlines())
                 for p in arquivos)
    return len(arquivos), linhas


def medir_projeto() -> dict:
    java_main = contar("*.java", JAVA_MAIN)
    java_test = contar("*.java", JAVA_TEST)
    return {
        "java_main": java_main,
        "java_test": java_test,
        "templates": contar("*.html", RECURSOS / "templates"),
        "css": contar("*.css", RECURSOS / "static"),
        # A ausência de JavaScript é uma escolha do projeto, então ela é medida
        # e publicada como qualquer outro número — não afirmada de memória.
        "js": len([p for p in ROOT.rglob("*.js")
                   if p.is_file() and "target" not in p.parts
                   and ".git" not in p.parts]),
    }


# ----------------------------------------------------------------- testes

def ler_surefire() -> dict | None:
    """Resultado real da última execução de `mvn test`, se houver relatório."""
    if not SUREFIRE.exists():
        return None
    total = falhas = erros = pulados = 0
    achou = False
    for xml in SUREFIRE.glob("TEST-*.xml"):
        try:
            raiz = ET.parse(xml).getroot()
        except ET.ParseError:
            continue
        achou = True
        total += int(raiz.get("tests", 0))
        falhas += int(raiz.get("failures", 0))
        erros += int(raiz.get("errors", 0))
        pulados += int(raiz.get("skipped", 0))
    if not achou:
        return None
    return {"total": total, "falhas": falhas, "erros": erros, "pulados": pulados}


def contar_testes_estatico() -> int:
    if not JAVA_TEST.exists():
        return 0
    return sum(len(re.findall(r'^\s*@Test\b', p.read_text(encoding="utf-8"), re.M))
               for p in JAVA_TEST.rglob("*.java"))


def por_classe_de_teste() -> list[tuple[str, int]]:
    if not JAVA_TEST.exists():
        return []
    saida = []
    for p in sorted(JAVA_TEST.rglob("*.java")):
        n = len(re.findall(r'^\s*@Test\b', p.read_text(encoding="utf-8"), re.M))
        if n:
            saida.append((p.stem, n))
    return sorted(saida, key=lambda t: (-t[1], t[0]))


# --------------------------------------------------------------- markdown

def coletar() -> dict:
    return {
        "pom": ler_pom(),
        "rotas": achar_rotas(),
        "entidades": achar_entidades(),
        "consultas": achar_consultas(),
        "tamanho": medir_projeto(),
        "surefire": ler_surefire(),
        "testes_estatico": contar_testes_estatico(),
        "testes_por_classe": por_classe_de_teste(),
    }


def build_markdown(d: dict) -> str:
    """O bloco do README, SEM data — a data entra depois, só se algo mudou."""
    pom = d["pom"]
    tam = d["tamanho"]
    linhas: list[str] = []

    # ── resumo ────────────────────────────────────────────────────────────
    peças = []
    if pom.get("java"):
        peças.append(f"**Java {pom['java']}**")
    if pom.get("spring_boot"):
        peças.append(f"**Spring Boot {pom['spring_boot']}**")
    peças.append(f"**{tam['java_main'][0]}** classes Java")
    peças.append(f"**{tam['java_main'][1] + tam['java_test'][1]}** linhas")
    peças.append(f"**{len(d['rotas'])}** rotas")

    surefire = d["surefire"]
    if surefire:
        quebrados = surefire["falhas"] + surefire["erros"]
        selo = "todos passando" if quebrados == 0 else f"**{quebrados} quebrados**"
        peças.append(f"**{surefire['total']}** testes ({selo})")
    else:
        peças.append(f"**{d['testes_estatico']}** testes")

    linhas += ["> " + " · ".join(peças), ""]

    if tam["js"] == 0:
        linhas += ["> Nenhum arquivo `.js` no projeto: as páginas são montadas no "
                   "servidor com Thymeleaf e toda a lógica roda em Java.", ""]
    else:
        linhas += [f"> ⚠️ {tam['js']} arquivo(s) `.js` no projeto — a proposta era "
                   "manter tudo em Java, então vale conferir se entraram por engano.",
                   ""]

    # ── rotas ─────────────────────────────────────────────────────────────
    linhas += ["### Rotas", ""]
    if d["rotas"]:
        linhas += ["| Método | Caminho | Controller | Método Java |",
                   "| :--- | :--- | :--- | :--- |"]
        for r in d["rotas"]:
            linhas.append(f"| `{r['verbo']}` | `{r['caminho']}` | "
                          f"{r['classe']} | `{r['metodo']}()` |")
    else:
        linhas.append("_Nenhuma rota encontrada — o bot procura por "
                      "`@GetMapping`/`@PostMapping` em classes `@Controller`._")
    linhas.append("")

    # ── entidades ─────────────────────────────────────────────────────────
    linhas += ["### Dados guardados no banco", ""]
    if d["entidades"]:
        for ent in d["entidades"]:
            linhas += [f"**`{ent['classe']}`** → tabela `{ent['tabela']}`", "",
                       "| Campo | Tipo | Regras |", "| :--- | :--- | :--- |"]
            for campo in ent["campos"]:
                regras = ", ".join(campo["regras"]) or "—"
                linhas.append(f"| `{campo['nome']}` | `{campo['tipo']}` | {regras} |")
            linhas.append("")
    else:
        linhas += ["_Nenhuma classe `@Entity` encontrada._", ""]

    # ── consultas ─────────────────────────────────────────────────────────
    if d["consultas"]:
        linhas += ["### Consultas ao banco", "",
                   "| Interface | Método | Retorna | Origem |",
                   "| :--- | :--- | :--- | :--- |"]
        for c in d["consultas"]:
            origem = "derivada do nome" if c["derivada"] else "`@Query` (JPQL)"
            linhas.append(f"| {c['interface']} | `{c['nome']}` | "
                          f"`{c['retorno']}` | {origem} |")
        linhas.append("")

    # ── testes ────────────────────────────────────────────────────────────
    linhas += ["### Testes", ""]
    if surefire:
        quebrados = surefire["falhas"] + surefire["erros"]
        estado = ("✅ todos passando" if quebrados == 0
                  else f"❌ {surefire['falhas']} falha(s) e {surefire['erros']} erro(s)")
        linhas += [f"{estado} — **{surefire['total']}** testes executados"
                   + (f", {surefire['pulados']} pulado(s)" if surefire["pulados"] else "")
                   + ".", "",
                   "> Números lidos do relatório do Surefire, ou seja, de uma "
                   "execução real de `./mvnw test` — não de uma contagem no código.",
                   ""]
    else:
        linhas += [f"**{d['testes_estatico']}** métodos `@Test` no código.", "",
                   "> Contados no código-fonte: esta execução do bot não encontrou "
                   "relatório do Surefire, então o resultado (passou/falhou) não foi "
                   "verificado aqui.", ""]

    if d["testes_por_classe"]:
        linhas += ["| Classe de teste | Testes |", "| :--- | ---: |"]
        for nome, n in d["testes_por_classe"]:
            linhas.append(f"| `{nome}` | {n} |")
        linhas.append("")

    # ── tamanho ───────────────────────────────────────────────────────────
    linhas += ["### Tamanho do projeto", "",
               "| Parte | Arquivos | Linhas |", "| :--- | ---: | ---: |",
               f"| Java (aplicação) | {tam['java_main'][0]} | {tam['java_main'][1]} |",
               f"| Java (testes) | {tam['java_test'][0]} | {tam['java_test'][1]} |",
               f"| Templates Thymeleaf | {tam['templates'][0]} | {tam['templates'][1]} |",
               f"| CSS | {tam['css'][0]} | {tam['css'][1]} |",
               f"| JavaScript | {tam['js']} | 0 |",
               ""]

    # ── dependências ──────────────────────────────────────────────────────
    if pom.get("dependencias"):
        linhas += ["<details>", "<summary><b>Dependências declaradas no "
                   "<code>pom.xml</code></b></summary>", "",
                   "| Artefato | Escopo |", "| :--- | :--- |"]
        for artefato, escopo in pom["dependencias"]:
            linhas.append(f"| `{artefato}` | {escopo} |")
        linhas += ["", "</details>", ""]

    return "\n".join(linhas).rstrip() + "\n"


def assinar(corpo: str) -> str:
    return hashlib.sha256(corpo.encode("utf-8")).hexdigest()[:16]


def bloco_completo(corpo: str, assinatura: str, quando: datetime) -> str:
    carimbo = quando.strftime("%d/%m/%Y às %H:%M UTC")
    return "\n".join([
        START,
        f"{ASSINATURA}{assinatura} -->",
        "",
        corpo.rstrip(),
        "",
        f"<sub>Radiografia gerada automaticamente a partir do código-fonte. "
        f"Última mudança detectada em {carimbo}.</sub>",
        "",
        END,
    ])


def assinatura_atual(texto: str) -> str | None:
    casada = re.search(re.escape(ASSINATURA) + r"([0-9a-f]+)", texto)
    return casada.group(1) if casada else None


def main() -> int:
    if not README.exists():
        print("!! README.md não encontrado", file=sys.stderr)
        return 1

    texto = README.read_text(encoding="utf-8")
    if START not in texto or END not in texto:
        print(f"!! marcadores {START} / {END} não encontrados no README — "
              "adicione-os onde o bloco deve aparecer", file=sys.stderr)
        return 1

    dados = coletar()
    if not dados["rotas"] and not dados["entidades"]:
        # Sem nada lido, reescrever o bloco só apagaria informação boa.
        print("!! nada foi lido do código-fonte — abortando sem alterar o README",
              file=sys.stderr)
        return 1

    corpo = build_markdown(dados)
    nova = assinar(corpo)
    antiga = assinatura_atual(texto)

    if DEBUG:
        print(corpo)

    if antiga == nova:
        print(f"sem novidade (assinatura {nova}) — README intacto, sem commit.")
        return 0

    bloco = bloco_completo(corpo, nova, datetime.now(timezone.utc))
    novo_texto = re.sub(re.escape(START) + r"[\s\S]*?" + re.escape(END),
                        lambda _m: bloco, texto)
    README.write_text(novo_texto, encoding="utf-8")

    print(f"README atualizado: {antiga or 'sem assinatura'} -> {nova} "
          f"({len(dados['rotas'])} rotas, {len(dados['entidades'])} entidade(s), "
          f"{dados['testes_estatico']} testes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
