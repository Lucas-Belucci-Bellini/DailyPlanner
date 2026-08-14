import type { Task } from "./types";
import { sortTasks } from "./types";

const STORAGE_KEY = "daily-planner.tasks.v1";

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Task>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.date === "string" &&
    typeof candidate.startTime === "string" &&
    typeof candidate.endTime === "string" &&
    typeof candidate.completed === "boolean" &&
    typeof candidate.createdAt === "string"
  );
}

export function loadTasks(): Task[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? sortTasks(parsed.filter(isTask)) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortTasks(tasks)));
}

export function replaceTasks(tasks: Task[]): void {
  saveTasks(tasks);
}

export function clearTasks(): void {
  localStorage.removeItem(STORAGE_KEY);
}
