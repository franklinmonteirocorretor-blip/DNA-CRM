import type { Priority } from "./types.ts";

export type QueueItem = { priority: Priority; dueAt: string; createdAt: string };

export function compareQueueItems(a: QueueItem, b: QueueItem) {
  const priority = Number(a.priority.slice(1)) - Number(b.priority.slice(1));
  if (priority !== 0) return priority;
  const due = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  if (due !== 0) return due;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}
export function orderPriorityQueue<T extends QueueItem>(items: readonly T[]) {
  return [...items].sort(compareQueueItems);
}
