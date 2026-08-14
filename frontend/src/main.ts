import type { Task, TaskDraft } from "./types";
import {
  createTask,
  durationInMinutes,
  formatDuration,
  formatLongDate,
  formatShortDate,
  formatTime,
  shiftDate,
  sortTasks,
  tasksForDate,
  todayISO,
  validateTask,
} from "./types";
import { loadTasks, replaceTasks, saveTasks } from "./storage";
import "./style.css";

type Filter = "all" | "pending" | "completed";
type Action = "toggle" | "edit" | "delete";

const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) throw new Error("Não foi possível montar o Daily Planner.");
const app: HTMLDivElement = appElement;

let tasks = loadTasks();
let selectedDate = todayISO();
let searchTerm = "";
let activeFilter: Filter = "all";
let toastTimer: number | undefined;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function taskMatches(task: Task): boolean {
  const matchesFilter =
    activeFilter === "all" ||
    (activeFilter === "pending" && !task.completed) ||
    (activeFilter === "completed" && task.completed);
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
  const matchesSearch =
    !normalizedSearch ||
    `${task.title} ${task.description}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
  return matchesFilter && matchesSearch;
}

function summaryFor(tasksOfDay: Task[]) {
  const minutes = tasksOfDay.reduce(
    (total, task) => total + durationInMinutes(task.startTime, task.endTime),
    0,
  );
  const completed = tasksOfDay.filter((task) => task.completed).length;
  return {
    total: tasksOfDay.length,
    completed,
    pending: tasksOfDay.length - completed,
    minutes,
    percent: tasksOfDay.length ? Math.round((completed / tasksOfDay.length) * 100) : 0,
  };
}

function renderTask(task: Task): string {
  const description = task.description
    ? `<p class="task-description">${escapeHtml(task.description)}</p>`
    : "";
  const status = task.completed
    ? '<span class="status-pill done">Concluído</span>'
    : '<span class="status-pill pending">Pendente</span>';
  return `
    <article class="task-card ${task.completed ? "is-complete" : ""}" data-task-id="${task.id}">
      <div class="task-time">
        <strong>${formatTime(task.startTime)}</strong>
        <span>${formatTime(task.endTime)}</span>
        <small>${formatDuration(durationInMinutes(task.startTime, task.endTime))}</small>
      </div>
      <div class="task-main">
        <div class="task-heading">
          <h3>${escapeHtml(task.title)}</h3>
          ${status}
        </div>
        ${description}
      </div>
      <div class="task-actions" aria-label="Ações para ${escapeHtml(task.title)}">
        <button class="icon-button" type="button" data-action="toggle" data-id="${task.id}" aria-label="${task.completed ? "Reabrir" : "Concluir"} compromisso" title="${task.completed ? "Reabrir" : "Concluir"}">${task.completed ? "↶" : "✓"}</button>
        <button class="icon-button" type="button" data-action="edit" data-id="${task.id}" aria-label="Editar compromisso" title="Editar">✎</button>
        <button class="icon-button danger" type="button" data-action="delete" data-id="${task.id}" aria-label="Excluir compromisso" title="Excluir">⌫</button>
      </div>
    </article>`;
}

function renderEmptyState(hasAnyTasks: boolean): string {
  if (!hasAnyTasks) {
    return `<div class="empty-state">
      <div class="empty-icon">✦</div>
      <h3>Seu dia começa por aqui</h3>
      <p>Adicione um compromisso para transformar seus planos em uma agenda possível.</p>
      <button class="button primary" type="button" data-action="new">Adicionar compromisso</button>
    </div>`;
  }
  return `<div class="empty-state compact">
    <div class="empty-icon">⌕</div>
    <h3>Nada encontrado</h3>
    <p>Tente mudar a busca ou selecionar outro filtro.</p>
  </div>`;
}

function render(): void {
  const dayTasks = tasksForDate(tasks, selectedDate);
  const visibleTasks = dayTasks.filter(taskMatches);
  const summary = summaryFor(dayTasks);
  const today = todayISO();
  const progressLabel = summary.total === 0 ? "Comece a planejar" : `${summary.percent}% concluído`;

  app.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <a class="brand" href="#" data-action="home" aria-label="Ir para hoje">
          <span class="brand-mark">DP</span>
          <span>
            <span class="eyebrow">PLANEJAMENTO PESSOAL</span>
            <strong>Daily Planner</strong>
          </span>
        </a>
        <div class="header-actions">
          <button class="button subtle" type="button" data-action="export">Exportar</button>
          <label class="button subtle import-button">
            Importar
            <input id="import-file" type="file" accept="application/json,.json" />
          </label>
          <button class="button primary" type="button" data-action="new">+ Novo compromisso</button>
        </div>
      </header>

      <section class="welcome-panel">
        <div>
          <span class="eyebrow light">${selectedDate === today ? "SEU FOCO DE HOJE" : "VISÃO DA AGENDA"}</span>
          <h1>Um dia de cada vez.</h1>
          <p>Organize o que importa e deixe espaço para o que surgir.</p>
        </div>
        <div class="welcome-stamp" aria-hidden="true">
          <span>${String(summary.total).padStart(2, "0")}</span>
          <small>itens no dia</small>
        </div>
      </section>

      <main class="workspace">
        <aside class="sidebar">
          <section class="date-card">
            <div class="section-label">NAVEGAR</div>
            <div class="date-navigation">
              <button class="icon-button" type="button" data-date-shift="-1" aria-label="Dia anterior">←</button>
              <div class="selected-date">
                <strong>${formatShortDate(selectedDate)}</strong>
                <span>${selectedDate === today ? "Hoje" : "Data selecionada"}</span>
              </div>
              <button class="icon-button" type="button" data-date-shift="1" aria-label="Próximo dia">→</button>
            </div>
            <label class="date-picker-label" for="date-picker">Escolher outra data</label>
            <input id="date-picker" class="date-picker" type="date" value="${selectedDate}" />
            <button class="button full subtle" type="button" data-action="today">Voltar para hoje</button>
          </section>

          <section class="sidebar-section">
            <div class="section-label">RESUMO DO DIA</div>
            <div class="summary-list">
              <div class="summary-row"><span>Total</span><strong>${summary.total}</strong></div>
              <div class="summary-row"><span>Pendentes</span><strong>${summary.pending}</strong></div>
              <div class="summary-row"><span>Concluídos</span><strong>${summary.completed}</strong></div>
              <div class="summary-row"><span>Tempo ocupado</span><strong>${formatDuration(summary.minutes)}</strong></div>
            </div>
            <div class="progress-block">
              <div><span>Progresso</span><strong>${progressLabel}</strong></div>
              <div class="progress-track" role="progressbar" aria-valuenow="${summary.percent}" aria-valuemin="0" aria-valuemax="100" aria-label="${progressLabel}"><span style="width: ${summary.percent}%"></span></div>
            </div>
          </section>

          <section class="tip-card">
            <span class="tip-symbol">✦</span>
            <div><strong>Dica de organização</strong><p>Reserve alguns minutos entre compromissos para respirar e fazer transições.</p></div>
          </section>
        </aside>

        <section class="agenda-content" aria-labelledby="agenda-heading">
          <div class="content-heading">
            <div>
              <span class="eyebrow">${selectedDate === today ? "AGENDA DE HOJE" : "AGENDA"}</span>
              <h2 id="agenda-heading">${formatLongDate(selectedDate)}</h2>
            </div>
            <div class="search-box">
              <span aria-hidden="true">⌕</span>
              <label class="sr-only" for="search">Buscar compromissos</label>
              <input id="search" type="search" placeholder="Buscar compromisso" value="${escapeHtml(searchTerm)}" />
            </div>
          </div>

          <div class="filter-row" role="toolbar" aria-label="Filtrar compromissos">
            <button class="filter-button ${activeFilter === "all" ? "active" : ""}" type="button" data-filter="all">Todos <span>${dayTasks.length}</span></button>
            <button class="filter-button ${activeFilter === "pending" ? "active" : ""}" type="button" data-filter="pending">Pendentes <span>${summary.pending}</span></button>
            <button class="filter-button ${activeFilter === "completed" ? "active" : ""}" type="button" data-filter="completed">Concluídos <span>${summary.completed}</span></button>
          </div>

          <div class="agenda-list" id="task-list">
            ${visibleTasks.length ? visibleTasks.map(renderTask).join("") : renderEmptyState(dayTasks.length > 0)}
          </div>
          <p class="storage-note"><span>●</span> Seus dados ficam salvos neste navegador.</p>
        </section>
      </main>
      <div id="dialog-root"></div>
      <div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div>
    </div>`;

  attachEvents();
}

function showToast(message: string, tone: "success" | "error" = "success"): void {
  const region = document.querySelector<HTMLDivElement>("#toast-region");
  if (!region) return;
  window.clearTimeout(toastTimer);
  region.innerHTML = `<div class="toast ${tone}">${tone === "success" ? "✓" : "!"} ${escapeHtml(message)}</div>`;
  toastTimer = window.setTimeout(() => {
    region.innerHTML = "";
  }, 3600);
}

function attachEvents(): void {
  app.querySelectorAll<HTMLElement>("[data-date-shift]").forEach((button) => {
    button.addEventListener("click", () => {
      const shift = Number(button.dataset.dateShift ?? 0);
      selectedDate = shiftDate(selectedDate, shift);
      render();
    });
  });

  app.querySelector<HTMLInputElement>("#date-picker")?.addEventListener("change", (event) => {
    const input = event.currentTarget as HTMLInputElement;
    if (input.value) {
      selectedDate = input.value;
      render();
    }
  });

  app.querySelector<HTMLInputElement>("#search")?.addEventListener("input", (event) => {
    searchTerm = (event.currentTarget as HTMLInputElement).value;
    render();
    const search = app.querySelector<HTMLInputElement>("#search");
    search?.focus();
    search?.setSelectionRange(search.value.length, search.value.length);
  });

  app.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = (button.dataset.filter as Filter) ?? "all";
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    const action = button.dataset.action as Action | "new" | "today" | "export" | "home" | undefined;
    button.addEventListener("click", () => {
      if (action === "new") openForm();
      if (action === "today" || action === "home") {
        selectedDate = todayISO();
        render();
      }
      if (action === "export") exportTasks();
      if (action === "toggle" || action === "edit" || action === "delete") {
        handleTaskAction(action, button.dataset.id ?? "");
      }
    });
  });

  app.querySelector<HTMLInputElement>("#import-file")?.addEventListener("change", (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) importTasks(file);
  });
}

function handleTaskAction(action: Action, id: string): void {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  if (action === "toggle") {
    task.completed = !task.completed;
    saveTasks(tasks);
    render();
    showToast(task.completed ? "Compromisso concluído." : "Compromisso reaberto.");
  }
  if (action === "edit") openForm(task);
  if (action === "delete") {
    if (!window.confirm(`Excluir “${task.title}”?`)) return;
    tasks = tasks.filter((item) => item.id !== id);
    saveTasks(tasks);
    render();
    showToast("Compromisso excluído.");
  }
}

function openForm(task?: Task): void {
  const dialogRoot = document.querySelector<HTMLDivElement>("#dialog-root");
  if (!dialogRoot) return;
  const isEditing = Boolean(task);
  const draft: TaskDraft = task
    ? {
        title: task.title,
        description: task.description,
        date: task.date,
        startTime: task.startTime,
        endTime: task.endTime,
      }
    : { title: "", description: "", date: selectedDate, startTime: "09:00", endTime: "10:00" };

  dialogRoot.innerHTML = `
    <dialog class="task-dialog" id="task-dialog" aria-labelledby="dialog-title">
      <form id="task-form" method="dialog" novalidate>
        <div class="dialog-heading">
          <div><span class="eyebrow">${isEditing ? "EDITAR PLANO" : "NOVO PLANO"}</span><h2 id="dialog-title">${isEditing ? "Ajustar compromisso" : "O que você quer realizar?"}</h2></div>
          <button class="icon-button" type="button" data-close aria-label="Fechar">×</button>
        </div>
        <div id="form-error" class="form-error" role="alert"></div>
        <div class="form-grid">
          <label class="field full-field">Título <span>*</span><input name="title" type="text" maxlength="120" placeholder="Ex.: Estudar para a prova" value="${escapeHtml(draft.title)}" autofocus /><small id="error-title"></small></label>
          <label class="field full-field">Descrição <small class="counter-hint">opcional</small><textarea name="description" maxlength="500" rows="3" placeholder="Anote detalhes, materiais ou o seu próximo passo">${escapeHtml(draft.description)}</textarea></label>
          <label class="field">Data <span>*</span><input name="date" type="date" value="${draft.date}" /></label>
          <div class="field time-range"><label>Horário <span>*</span></label><div class="time-inputs"><input name="startTime" type="time" value="${draft.startTime}" aria-label="Horário de início" /><span>até</span><input name="endTime" type="time" value="${draft.endTime}" aria-label="Horário de término" /></div><small id="error-startTime"></small><small id="error-endTime"></small></div>
        </div>
        <div class="dialog-actions"><button class="button subtle" type="button" data-close>Cancelar</button><button class="button primary" type="submit">${isEditing ? "Salvar alterações" : "Adicionar à agenda"}</button></div>
      </form>
    </dialog>`;

  const dialog = dialogRoot.querySelector<HTMLDialogElement>("#task-dialog");
  const form = dialogRoot.querySelector<HTMLFormElement>("#task-form");
  if (!dialog || !form) return;
  dialog.showModal();

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelectorAll<HTMLElement>("[data-close]").forEach((closeButton) => {
    closeButton.addEventListener("click", () => dialog.close());
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nextDraft: TaskDraft = {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      date: String(data.get("date") ?? ""),
      startTime: String(data.get("startTime") ?? ""),
      endTime: String(data.get("endTime") ?? ""),
    };
    const error = validateTask(nextDraft, tasks, task?.id);
    if (error) {
      const errorBox = form.querySelector<HTMLDivElement>("#form-error");
      const fieldError = form.querySelector<HTMLElement>(`#error-${error.field}`);
      if (error.field === "form") {
        if (errorBox) errorBox.textContent = error.message;
      } else if (fieldError) {
        fieldError.textContent = error.message;
        fieldError.classList.add("visible");
      }
      const firstInvalid = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${error.field === "form" ? "title" : error.field}"]`);
      firstInvalid?.focus();
      return;
    }

    let successMessage: string;
    if (task) {
      tasks = tasks.map((item) => (item.id === task.id ? { ...item, ...nextDraft, title: nextDraft.title.trim(), description: nextDraft.description.trim() } : item));
      successMessage = "Compromisso atualizado.";
    } else {
      tasks = [...tasks, createTask(nextDraft)];
      successMessage = "Compromisso adicionado à agenda.";
    }
    selectedDate = nextDraft.date;
    replaceTasks(tasks);
    dialog.close();
    render();
    showToast(successMessage);
  });
}

function exportTasks(): void {
  if (!tasks.length) {
    showToast("Adicione pelo menos um compromisso antes de exportar.", "error");
    return;
  }
  const blob = new Blob([JSON.stringify(sortTasks(tasks), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `daily-planner-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Agenda exportada com sucesso.");
}

function importTasks(file: File): void {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed: unknown = JSON.parse(String(reader.result));
      if (!Array.isArray(parsed)) throw new Error("Formato inválido");
      const imported: Task[] = parsed
        .filter((item): item is Task => {
          if (!item || typeof item !== "object") return false;
          const value = item as Partial<Task>;
          return [value.id, value.title, value.date, value.startTime, value.endTime].every((field) => typeof field === "string");
        })
        .map((item) => ({
          id: item.id,
          title: item.title,
          description: typeof item.description === "string" ? item.description : "",
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          completed: item.completed === true,
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
        }));
      if (!imported.length) throw new Error("Nenhum compromisso encontrado");
      tasks = imported;
      replaceTasks(tasks);
      selectedDate = imported[0].date;
      render();
      showToast(`${imported.length} compromisso(s) importado(s).`);
    } catch {
      showToast("Não foi possível importar este arquivo JSON.", "error");
    }
  });
  reader.readAsText(file);
}

render();
