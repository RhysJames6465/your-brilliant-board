import { Tables } from "@/integrations/supabase/types";

export type Task = Tables<"tasks">;
export type TaskStatus = "todo" | "in-progress" | "completed";
export type TaskPriority = "high" | "medium" | "low";

export const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: "todo", title: "To-Do", color: "hsl(252, 56%, 57%)" },
  { id: "in-progress", title: "In Progress", color: "hsl(25, 95%, 53%)" },
  { id: "completed", title: "Completed", color: "hsl(173, 58%, 39%)" },
];

export const CATEGORIES = [
  { label: "Design", color: "hsl(252, 56%, 57%)" },
  { label: "Development", color: "hsl(173, 58%, 39%)" },
  { label: "Media", color: "hsl(25, 95%, 53%)" },
  { label: "Research", color: "hsl(199, 89%, 48%)" },
  { label: "Marketing", color: "hsl(340, 82%, 52%)" },
  { label: "Personal", color: "hsl(280, 60%, 50%)" },
  { label: "Other", color: "hsl(220, 15%, 55%)" },
];

export const PRIORITIES: { value: TaskPriority; label: string; color: string; rank: number }[] = [
  { value: "high", label: "High", color: "hsl(0, 84%, 60%)", rank: 0 },
  { value: "medium", label: "Medium", color: "hsl(38, 92%, 50%)", rank: 1 },
  { value: "low", label: "Low", color: "hsl(220, 15%, 55%)", rank: 2 },
];

export function getPriorityMeta(priority: TaskPriority | null | undefined) {
  return PRIORITIES.find(p => p.value === priority) ?? PRIORITIES[1];
}

export function getCategoryColor(category: string | null): string {
  const cat = CATEGORIES.find(c => c.label.toLowerCase() === category?.toLowerCase());
  return cat?.color ?? "hsl(var(--muted-foreground))";
}

export type Urgency = "overdue" | "soon" | "upcoming" | "none";

export function getUrgency(dueDate: string | null, status: TaskStatus): Urgency {
  if (!dueDate || status === "completed") return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "soon";
  if (diffDays <= 7) return "upcoming";
  return "none";
}

export const URGENCY_STYLES: Record<Urgency, { border: string; text: string; label: string }> = {
  overdue: { border: "border-l-4 border-l-[hsl(0,84%,60%)]", text: "text-[hsl(0,84%,65%)]", label: "Overdue" },
  soon: { border: "border-l-4 border-l-[hsl(38,92%,50%)]", text: "text-[hsl(38,92%,55%)]", label: "Due soon" },
  upcoming: { border: "border-l-2 border-l-[hsl(199,89%,48%)]", text: "text-[hsl(199,89%,55%)]", label: "Upcoming" },
  none: { border: "", text: "text-muted-foreground", label: "" },
};
