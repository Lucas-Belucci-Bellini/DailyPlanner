export interface Task {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  createdAt: string;
}

export type TaskDraft = Omit<Task, "id" | "completed" | "createdAt">;

export interface ValidationError {
  field: "title" | "date" | "startTime" | "endTime" | "form";
  message: string;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function todayISO(): string {
  const today = new Date();
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

export function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(year, month - 1, day);
  shifted.setDate(shifted.getDate() + days);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

export function formatLongDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const label = dateFormatter.format(new Date(year, month - 1, day));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatShortDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return shortDateFormatter.format(new Date(year, month - 1, day));
}

export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function durationInMinutes(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours > 0 && rest > 0) return `${hours}h${String(rest).padStart(2, "0")}`;
  if (hours > 0) return `${hours}h`;
  return `${rest}min`;
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((first, second) => {
    const byDate = first.date.localeCompare(second.date);
    if (byDate !== 0) return byDate;
    return first.startTime.localeCompare(second.startTime);
  });
}

export function tasksForDate(tasks: Task[], date: string): Task[] {
  return sortTasks(tasks.filter((task) => task.date === date));
}

export function overlaps(first: TaskDraft, second: Task): boolean {
  return (
    first.date === second.date &&
    first.startTime < second.endTime &&
    first.endTime > second.startTime
  );
}

export function validateTask(
  draft: TaskDraft,
  existingTasks: Task[],
  editingId?: string,
): ValidationError | null {
  if (!draft.title.trim()) {
    return { field: "title", message: "Digite um título para o compromisso." };
  }
  if (draft.title.trim().length > 120) {
    return { field: "title", message: "O título deve ter no máximo 120 caracteres." };
  }
  if (!draft.date) {
    return { field: "date", message: "Escolha uma data." };
  }
  if (!draft.startTime) {
    return { field: "startTime", message: "Informe o horário de início." };
  }
  if (!draft.endTime) {
    return { field: "endTime", message: "Informe o horário de término." };
  }
  if (draft.endTime <= draft.startTime) {
    return { field: "endTime", message: "O término precisa ser depois do início." };
  }
  if (draft.description.trim().length > 500) {
    return { field: "form", message: "A descrição deve ter no máximo 500 caracteres." };
  }

  const conflict = existingTasks.find(
    (task) => task.id !== editingId && overlaps(draft, task),
  );
  if (conflict) {
    return {
      field: "startTime",
      message: `Este horário conflita com “${conflict.title}” (${formatTime(conflict.startTime)}–${formatTime(conflict.endTime)}).`,
    };
  }
  return null;
}

export function createTask(draft: TaskDraft): Task {
  return {
    ...draft,
    id: crypto.randomUUID(),
    title: draft.title.trim(),
    description: draft.description.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
  };
}
