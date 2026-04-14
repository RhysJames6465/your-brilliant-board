import { Tables } from "@/integrations/supabase/types";

export type Task = Tables<"tasks">;
export type TaskStatus = "todo" | "in-progress" | "completed";

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
];

export function getCategoryColor(category: string | null): string {
  const cat = CATEGORIES.find(c => c.label.toLowerCase() === category?.toLowerCase());
  return cat?.color ?? "hsl(var(--muted-foreground))";
}
