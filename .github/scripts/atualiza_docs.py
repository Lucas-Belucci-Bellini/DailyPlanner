#!/usr/bin/env python3
"""
Bot de documentacao do Daily Planner.

Mantem dois arquivos em dia com o que o projeto realmente e:

  * README.md      -> bloco "Radiografia do projeto": rotas, tabela do banco,
                      regras, testes e tamanho, lidos do codigo-fonte.
  * CRONOGRAMA.md  -> bloco "Andamento": a linha do tempo do que foi feito,
                      montada a partir do historico do git.

O nome CRONOGRAMA.md em caixa alta e exigencia da disciplina. O script cobra
esse nome e nao aceita variacao, para nao acabar com cronograma.md e
CRONOGRAMA.md convivendo no mesmo repositorio.

**So commita quando ha dado novo.** Cada bloco carrega uma assinatura SHA-256
do proprio conteudo, calculada SEM a data de geracao. Numa execucao em que nada
mudou, a assinatura bate, o arquivo nao e tocado e o passo de commit nao acha
diferenca -- por isso o agendamento nao enche o historico de commits vazios. A
data exibida e a da ultima mudanca real, nao a do ultimo giro do bot.

O que o bot escreve fica entre marcadores; o que esta fora deles e humano e
nunca e sobrescrito. No CRONOGRAMA isso importa: o planejamento das etapas e
decisao de pessoa, o bot so relata o que de fato aconteceu.

Uso:
    python3 .github/scripts/atualiza_docs.py

Variaveis de ambiente:
    DOCS_DEBUG   "1" imprime os blocos gerados na saida padrao
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
README = RAIZ / 'README.md'
CRONOGRAMA = RAIZ / 'CRONOGRAMA.md'
APP = RAIZ / 'app'
LIB = RAIZ / 'lib'
TESTES = RAIZ / 'tests'
PACKAGE_JSON = RAIZ / 'package.json'
SCHEMA = LIB / 'db' / 'schema.ts'
RELATORIO_TESTES = RAIZ / 'relatorio-testes.json'

INICIO_PROJETO, FIM_PROJETO = '<!-- PROJETO:START -->', '<!-- PROJETO:END -->'
INICIO_CRONO, FIM_CRONO = '<!-- CRONOGRAMA:START -->', '<!-- CRONOGRAMA:END -->'
ASSINATURA = '<!-- ASSINATURA '

DEBUG = os.environ.get('DOCS_DEBUG', '0') == '1'


# ------------------------------------------------------------------ leitura

def ler_package() -> dict:
    if not PACKAGE_JSON.exists():
        return {}
    dados = json.loads(PACKAGE_JSON.read_text(encoding='utf-8'))
    return {
        'nome': dados.get('name', ''),
        'versao': dados.get('version', ''),
        'dependencias': sorted((dados.get('dependencies') or {}).items()),
        'dev': sorted((dados.get('devDependencies') or {}).items()),
    }


def limpar_versao(bruta: str) -> str:
    return bruta.lstrip('^~>=< ')


def achar_rotas() -> list[dict]:
    """As rotas do App Router: cada page.tsx vira um caminho de URL."""
    if not APP.exists():
        return []
    rotas = []
    for arquivo in sorted(APP.rglob('page.tsx')):
        relativo = arquivo.relative_to(APP).parent
        partes = [p for p in relativo.parts if not (p.startswith('(') and p.endswith(')'))]
        caminho = '/' + '/'.join(partes) if partes else '/'
        texto = arquivo.read_text(encoding='utf-8')
        rotas.append({
            'caminho': caminho,
            'arquivo': str(arquivo.relative_to(RAIZ)),
            'dinamica': "dynamic = 'force-dynamic'" in texto,
        })
    return sorted(rotas, key=lambda r: r['caminho'])


RE_ACTION = re.compile(r'export\s+async\s+function\s+(\w+)\s*\(', re.M)


def achar_actions() -> list[str]:
    """As Server Actions, que sao o caminho de gravacao do app."""
    arquivo = APP / 'actions.ts'
    if not arquivo.exists():
        return []
    texto = arquivo.read_text(encoding='utf-8')
    if "'use server'" not in texto and '"use server"' not in texto:
        return []
    return RE_ACTION.findall(texto)


RE_COLUNA = re.compile(
    r"(\w+)\s*:\s*(\w+)\(\s*'([^']+)'(?:\s*,\s*\{([^}]*)\})?\s*\)((?:\.\w+\([^)]*\))*)")


def ler_schema() -> dict | None:
    """Colunas da tabela, lidas do schema do Drizzle."""
    if not SCHEMA.exists():
        return None
    texto = SCHEMA.read_text(encoding='utf-8')
    tabela = re.search(r"pgTable\(\s*'([^']+)'", texto)
    if not tabela:
        return None

    corpo = texto.split('pgTable(', 1)[1]
    colunas = []
    for campo, tipo, coluna, opcoes, encadeado in RE_COLUNA.findall(corpo):
        if tipo in {'pgTable'}:
            continue
        regras = []
        if '.primaryKey()' in encadeado:
            regras.append('chave primaria')
        if '.notNull()' in encadeado:
            regras.append('obrigatorio (`NOT NULL`)')
        tamanho = re.search(r'length\s*:\s*(\d+)', opcoes or '')
        if tamanho:
            regras.append(f'ate {tamanho.group(1)} caracteres')
        padrao = re.search(r'\.default\(([^)]*)\)', encadeado)
        if padrao:
            regras.append(f'padrao `{padrao.group(1)}`')
        colunas.append({
            'campo': campo, 'tipo': tipo, 'coluna': coluna,
            'regras': ', '.join(regras) or '—',
        })
    return {'tabela': tabela.group(1), 'colunas': colunas}


RE_EXPORT_FN = re.compile(r'^export function (\w+)', re.M)


def regras_da_agenda() -> list[str]:
    """Funcoes exportadas de lib/agenda.ts — as regras que definem o produto."""
    arquivo = LIB / 'agenda.ts'
    if not arquivo.exists():
        return []
    return RE_EXPORT_FN.findall(arquivo.read_text(encoding='utf-8'))


def contar(padrao: str, base: Path) -> tuple[int, int]:
    arquivos = [p for p in base.rglob(padrao) if p.is_file()] if base.exists() else []
    linhas = sum(len(p.read_text(encoding='utf-8', errors='replace').splitlines())
                 for p in arquivos)
    return len(arquivos), linhas


def medir_projeto() -> dict:
    tsx_app = contar('*.tsx', APP)
    ts_app = contar('*.ts', APP)
    return {
        'app': (tsx_app[0] + ts_app[0], tsx_app[1] + ts_app[1]),
        'lib': contar('*.ts', LIB),
        'testes': contar('*.test.ts', TESTES),
        'css': contar('*.css', APP),
    }


def ler_relatorio_testes() -> dict | None:
    """Resultado real da ultima execucao do Vitest, se houver relatorio."""
    if not RELATORIO_TESTES.exists():
        return None
    try:
        dados = json.loads(RELATORIO_TESTES.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        return None
    total = dados.get('numTotalTests')
    if total is None:
        return None
    return {
        'total': total,
        'passaram': dados.get('numPassedTests', 0),
        'falharam': dados.get('numFailedTests', 0),
        # `testResults` traz um item por ARQUIVO. `numTotalTestSuites` parece
        # servir, mas conta blocos `describe` — com ele o README anunciava
        # "27 testes em 11 arquivos" para uma bateria de dois arquivos.
        'arquivos': len(dados.get('testResults') or []),
    }


RE_IT = re.compile(r"^\s*(?:it|test)\s*\(", re.M)


def contar_testes_estatico() -> list[tuple[str, int]]:
    if not TESTES.exists():
        return []
    saida = []
    for p in sorted(TESTES.rglob('*.test.ts')):
        n = len(RE_IT.findall(p.read_text(encoding='utf-8')))
        if n:
            saida.append((p.name, n))
    return sorted(saida, key=lambda t: (-t[1], t[0]))


# --------------------------------------------------------------------- git

def git(*args: str) -> str:
    try:
        return subprocess.run(('git', *args), cwd=RAIZ, capture_output=True,
                              text=True, check=True, timeout=60).stdout.strip()
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        return ''


def historico() -> list[dict]:
    """Commits do repositorio, do mais novo para o mais antigo."""
    bruto = git('log', '--no-merges', '--date=short', '--pretty=%h%x1f%ad%x1f%an%x1f%s')
    commits = []
    for linha in bruto.splitlines():
        partes = linha.split('\x1f')
        if len(partes) != 4:
            continue
        sha, data, autor, assunto = partes
        # Os commits do proprio bot nao entram no cronograma: eles relatam o
        # andamento, nao sao andamento. Sem esse filtro, cada giro do bot
        # apareceria como "trabalho feito" e inflaria a linha do tempo.
        if assunto.startswith('chore(bot)'):
            continue
        commits.append({'sha': sha, 'data': data, 'autor': autor, 'assunto': assunto})
    return commits


# ---------------------------------------------------------------- markdown

def bloco_radiografia() -> str:
    pacote = ler_package()
    deps = dict(pacote.get('dependencias', []))
    dev = dict(pacote.get('dev', []))
    rotas = achar_rotas()
    actions = achar_actions()
    esquema = ler_schema()
    tam = medir_projeto()
    relatorio = ler_relatorio_testes()
    por_arquivo = contar_testes_estatico()
    total_estatico = sum(n for _a, n in por_arquivo)

    linhas: list[str] = []

    pecas = []
    if 'next' in deps:
        pecas.append(f"**Next.js {limpar_versao(deps['next'])}**")
    if 'typescript' in dev:
        pecas.append(f"**TypeScript {limpar_versao(dev['typescript'])}**")
    if 'drizzle-orm' in deps:
        pecas.append('**Postgres + Drizzle**')
    pecas.append(f'**{len(rotas)}** rotas')
    pecas.append(f"**{tam['app'][1] + tam['lib'][1]}** linhas")
    if relatorio:
        estado = 'todos passando' if relatorio['falharam'] == 0 else f"**{relatorio['falharam']} quebrados**"
        pecas.append(f"**{relatorio['total']}** testes ({estado})")
    else:
        pecas.append(f'**{total_estatico}** testes')
    linhas += ['> ' + ' · '.join(pecas), '']

    linhas += ['> Roda inteiro na Vercel: paginas montadas no servidor pelo App Router '
               'e gravacao por Server Actions, sem API separada para manter.', '']

    # ── rotas ────────────────────────────────────────────────────────────
    linhas += ['### Rotas', '']
    if rotas:
        linhas += ['| Caminho | Arquivo | Renderizacao |', '| :--- | :--- | :--- |']
        for r in rotas:
            modo = 'sob demanda (dados vivos)' if r['dinamica'] else 'estatica'
            linhas.append(f"| `{r['caminho']}` | `{r['arquivo']}` | {modo} |")
    else:
        linhas.append('_Nenhuma rota encontrada — o bot procura por `page.tsx` dentro de `app/`._')
    linhas.append('')

    # ── server actions ───────────────────────────────────────────────────
    if actions:
        linhas += ['### Gravacao (Server Actions)', '',
                   'Toda escrita passa por estas funcoes, que rodam no servidor:', '']
        for nome in actions:
            linhas.append(f'- `{nome}()`')
        linhas.append('')

    # ── banco ────────────────────────────────────────────────────────────
    linhas += ['### Dados guardados no banco', '']
    if esquema:
        linhas += [f"Tabela `{esquema['tabela']}`", '',
                   '| Campo | Coluna | Tipo | Regras |', '| :--- | :--- | :--- | :--- |']
        for c in esquema['colunas']:
            linhas.append(f"| `{c['campo']}` | `{c['coluna']}` | `{c['tipo']}` | {c['regras']} |")
    else:
        linhas.append('_Schema nao encontrado em `lib/db/schema.ts`._')
    linhas.append('')

    # ── regras ───────────────────────────────────────────────────────────
    regras = regras_da_agenda()
    if regras:
        linhas += ['### Regras da agenda', '',
                   'Funcoes puras em `lib/agenda.ts` — sem banco e sem React, '
                   'por isso testadas de verdade:', '',
                   '  ' + ', '.join(f'`{r}()`' for r in regras), '']

    # ── testes ───────────────────────────────────────────────────────────
    linhas += ['### Testes', '']
    if relatorio:
        estado = ('✅ todos passando' if relatorio['falharam'] == 0
                  else f"❌ {relatorio['falharam']} falhando")
        linhas += [f"{estado} — **{relatorio['total']}** testes em "
                   f"{relatorio['arquivos']} arquivo(s).", '',
                   '> Numeros lidos do relatorio do Vitest, ou seja, de uma execucao real '
                   'de `npm test` — nao de uma contagem no codigo.', '']
    else:
        linhas += [f'**{total_estatico}** testes no codigo.', '',
                   '> Contados no codigo-fonte: esta execucao do bot nao encontrou o '
                   'relatorio do Vitest, entao o resultado (passou/falhou) nao foi '
                   'verificado aqui.', '']
    if por_arquivo:
        linhas += ['| Arquivo de teste | Testes |', '| :--- | ---: |']
        for nome, n in por_arquivo:
            linhas.append(f'| `{nome}` | {n} |')
        linhas.append('')

    # ── tamanho ──────────────────────────────────────────────────────────
    linhas += ['### Tamanho do projeto', '',
               '| Parte | Arquivos | Linhas |', '| :--- | ---: | ---: |',
               f"| Telas e actions (`app/`) | {tam['app'][0]} | {tam['app'][1]} |",
               f"| Regras e banco (`lib/`) | {tam['lib'][0]} | {tam['lib'][1]} |",
               f"| Testes (`tests/`) | {tam['testes'][0]} | {tam['testes'][1]} |",
               f"| CSS | {tam['css'][0]} | {tam['css'][1]} |", '']

    # ── dependencias ─────────────────────────────────────────────────────
    if pacote.get('dependencias'):
        linhas += ['<details>',
                   '<summary><b>Dependencias declaradas no <code>package.json</code></b></summary>',
                   '', '| Pacote | Versao | Uso |', '| :--- | :--- | :--- |']
        for nome, v in pacote['dependencias']:
            linhas.append(f'| `{nome}` | `{v}` | producao |')
        for nome, v in pacote['dev']:
            linhas.append(f'| `{nome}` | `{v}` | desenvolvimento |')
        linhas += ['', '</details>', '']

    return '\n'.join(linhas).rstrip() + '\n'


MESES_PT = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho',
            'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']


def bloco_cronograma() -> str:
    commits = historico()
    if not commits:
        return '_Sem historico de git legivel nesta execucao._\n'

    por_dia: dict[str, list[dict]] = {}
    for c in commits:
        por_dia.setdefault(c['data'], []).append(c)

    dias = sorted(por_dia, reverse=True)
    primeiro, ultimo = dias[-1], dias[0]
    autores = Counter(c['autor'] for c in commits)

    linhas: list[str] = []
    linhas += [
        f'> **{len(commits)}** commits · **{len(dias)}** dias de trabalho · '
        f'de {formatar_dia(primeiro)} a {formatar_dia(ultimo)}',
        '',
        '| Data | Commits | O que foi feito |',
        '| :--- | ---: | :--- |',
    ]

    for dia in dias:
        doDia = por_dia[dia]
        assuntos = '<br>'.join(f"`{c['sha']}` {escapar(c['assunto'])}" for c in doDia[:8])
        if len(doDia) > 8:
            assuntos += f'<br>_… e mais {len(doDia) - 8} commit(s)_'
        linhas.append(f'| **{formatar_dia(dia)}** | {len(doDia)} | {assuntos} |')

    linhas += ['', '### Quem trabalhou', '', '| Autor | Commits |', '| :--- | ---: |']
    for autor, n in autores.most_common():
        linhas.append(f'| {escapar(autor)} | {n} |')
    linhas.append('')

    return '\n'.join(linhas)


def formatar_dia(iso: str) -> str:
    try:
        ano, mes, dia = iso.split('-')
        return f'{int(dia):02d}/{int(mes):02d}/{ano}'
    except ValueError:
        return iso


def escapar(texto: str) -> str:
    return texto.replace('|', '\\|')


# ---------------------------------------------------------------- gravacao

def assinar(corpo: str) -> str:
    return hashlib.sha256(corpo.encode('utf-8')).hexdigest()[:16]


def montar_bloco(inicio: str, fim: str, corpo: str, assinatura: str,
                 quando: datetime) -> str:
    carimbo = quando.strftime('%d/%m/%Y as %H:%M UTC')
    return '\n'.join([
        inicio,
        f'{ASSINATURA}{assinatura} -->',
        '',
        corpo.rstrip(),
        '',
        f'<sub>Bloco escrito automaticamente pelo bot. '
        f'Ultima mudanca detectada em {carimbo}.</sub>',
        '',
        fim,
    ])


def assinatura_do_bloco(texto: str, inicio: str, fim: str) -> str | None:
    trecho = re.search(re.escape(inicio) + r'[\s\S]*?' + re.escape(fim), texto)
    if not trecho:
        return None
    achada = re.search(re.escape(ASSINATURA) + r'([0-9a-f]+)', trecho.group(0))
    return achada.group(1) if achada else None


def atualizar_arquivo(caminho: Path, inicio: str, fim: str, corpo: str) -> bool:
    """Regrava o bloco se o conteudo mudou. Devolve True quando escreveu."""
    if not caminho.exists():
        print(f'!! {caminho.name} nao encontrado', file=sys.stderr)
        return False

    texto = caminho.read_text(encoding='utf-8')
    if inicio not in texto or fim not in texto:
        print(f'!! marcadores {inicio} / {fim} nao encontrados em {caminho.name}',
              file=sys.stderr)
        return False

    nova = assinar(corpo)
    if assinatura_do_bloco(texto, inicio, fim) == nova:
        print(f'{caminho.name}: sem novidade (assinatura {nova}).')
        return False

    bloco = montar_bloco(inicio, fim, corpo, nova, datetime.now(timezone.utc))
    caminho.write_text(
        re.sub(re.escape(inicio) + r'[\s\S]*?' + re.escape(fim), lambda _m: bloco, texto),
        encoding='utf-8')
    print(f'{caminho.name}: atualizado (assinatura {nova}).')
    return True


def main() -> int:
    # A disciplina exige o nome em caixa alta. Aceitar cronograma.md aqui faria
    # o repositorio acabar com os dois arquivos, cada um contando uma historia.
    if not CRONOGRAMA.exists():
        parecidos = [p.name for p in RAIZ.glob('*.md')
                     if p.name.lower() == 'cronograma.md']
        if parecidos:
            print(f'!! encontrei {parecidos[0]}, mas o arquivo precisa se chamar '
                  'CRONOGRAMA.md, em caixa alta. Renomeie com '
                  f'`git mv {parecidos[0]} CRONOGRAMA.md`.', file=sys.stderr)
        else:
            print('!! CRONOGRAMA.md nao encontrado na raiz do repositorio.',
                  file=sys.stderr)
        return 1

    radiografia = bloco_radiografia()
    cronograma = bloco_cronograma()

    if DEBUG:
        print(radiografia)
        print(cronograma)

    if not achar_rotas():
        print('!! nenhuma rota lida do codigo — abortando sem alterar os arquivos.',
              file=sys.stderr)
        return 1

    mudou_readme = atualizar_arquivo(README, INICIO_PROJETO, FIM_PROJETO, radiografia)
    mudou_crono = atualizar_arquivo(CRONOGRAMA, INICIO_CRONO, FIM_CRONO, cronograma)

    print(f'README alterado: {mudou_readme} | CRONOGRAMA alterado: {mudou_crono}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
