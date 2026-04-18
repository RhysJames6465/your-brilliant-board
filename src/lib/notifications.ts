import { Task } from "@/lib/kanban";

export type AlertBucket = "overdue" | "today" | "tomorrow";

export type TaskAlert = {
  task: Task;
  bucket: AlertBucket;
};

const STORAGE_KEY = "taskflow:notified";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function bucketForTask(t: Task, now = new Date()): AlertBucket | null {
  if (!t.due_date || t.status === "completed") return null;
  const today = startOfDay(now);
  const due = startOfDay(new Date(t.due_date));
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return null;
}

export function getAlerts(tasks: Task[]): TaskAlert[] {
  const out: TaskAlert[] = [];
  for (const t of tasks) {
    const b = bucketForTask(t);
    if (b) out.push({ task: t, bucket: b });
  }
  // overdue first, then today, then tomorrow
  const order: Record<AlertBucket, number> = { overdue: 0, today: 1, tomorrow: 2 };
  return out.sort((a, b) => order[a.bucket] - order[b.bucket] || (a.task.due_date! < b.task.due_date! ? -1 : 1));
}

// ---------- Browser notification permission ----------

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function ensurePermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  if (Notification.permission === "default") {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

// ---------- Dedupe (one notification per task per day) ----------

type NotifiedMap = Record<string, string>; // taskId -> "YYYY-MM-DD:bucket"

function todayKey(bucket: AlertBucket): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}:${bucket}`;
}

function readNotified(): NotifiedMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeNotified(m: NotifiedMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

export function shouldNotify(taskId: string, bucket: AlertBucket): boolean {
  const map = readNotified();
  return map[taskId] !== todayKey(bucket);
}

export function markNotified(taskId: string, bucket: AlertBucket) {
  const map = readNotified();
  map[taskId] = todayKey(bucket);
  writeNotified(map);
}

// ---------- Fire notifications ----------

export function fireGroupedNotification(alerts: TaskAlert[], onClickTaskId?: (id: string) => void) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  if (alerts.length === 0) return;

  if (alerts.length === 1) {
    const a = alerts[0];
    const labels: Record<AlertBucket, string> = { overdue: "Overdue", today: "Due today", tomorrow: "Due tomorrow" };
    const n = new Notification(`${labels[a.bucket]}: ${a.task.title}`, {
      body: `Priority: ${a.task.priority}${a.task.due_date ? ` • ${a.task.due_date}` : ""}`,
      tag: `taskflow-${a.task.id}`,
    });
    n.onclick = () => { window.focus(); onClickTaskId?.(a.task.id); n.close(); };
  } else {
    const overdue = alerts.filter(a => a.bucket === "overdue").length;
    const today = alerts.filter(a => a.bucket === "today").length;
    const tomorrow = alerts.filter(a => a.bucket === "tomorrow").length;
    const parts: string[] = [];
    if (overdue) parts.push(`${overdue} overdue`);
    if (today) parts.push(`${today} due today`);
    if (tomorrow) parts.push(`${tomorrow} due tomorrow`);
    const n = new Notification("TaskFlow reminders", { body: parts.join(" • "), tag: "taskflow-grouped" });
    n.onclick = () => { window.focus(); n.close(); };
  }

  for (const a of alerts) markNotified(a.task.id, a.bucket);
}
