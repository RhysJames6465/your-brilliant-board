import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ArrowUp, ArrowDown, ArrowUpDown, Bell, Plus } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Task,
  TaskPriority,
  TaskStatus,
  PRIORITIES,
  COLUMNS,
  getPriorityMeta,
  getCategoryColor,
  getUrgency,
  URGENCY_STYLES,
} from "@/lib/kanban";
import { TaskDialog } from "@/components/TaskDialog";
import { cn } from "@/lib/utils";

type SortKey = "title" | "category" | "priority" | "due_date" | "status" | "time_estimate" | "progress";
type SortDir = "asc" | "desc";

function useAllSubtaskProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subtasks", "all", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("subtasks").select("task_id,completed");
      if (error) throw error;
      const map = new Map<string, { total: number; done: number }>();
      for (const s of data ?? []) {
        const cur = map.get(s.task_id) ?? { total: 0, done: 0 };
        cur.total += 1;
        if (s.completed) cur.done += 1;
        map.set(s.task_id, cur);
      }
      return map;
    },
    enabled: !!user,
  });
}

export default function ListView() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: profile } = useProfile();
  const { data: progressMap } = useAllSubtaskProgress();
  const { user } = useAuth();
  const updateTask = useUpdateTask();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const progressFor = (id: string) => {
    const p = progressMap?.get(id);
    if (!p || p.total === 0) return null;
    return Math.round((p.done / p.total) * 100);
  };

  const rows = useMemo(() => {
    const filtered = tasks.filter(t => {
      const m = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
      const s = statusFilter === "all" || t.status === statusFilter;
      const p = priorityFilter === "all" || t.priority === priorityFilter;
      return m && s && p;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "priority":
          av = getPriorityMeta(a.priority as TaskPriority).rank;
          bv = getPriorityMeta(b.priority as TaskPriority).rank;
          break;
        case "progress":
          av = progressFor(a.id) ?? -1;
          bv = progressFor(b.id) ?? -1;
          break;
        case "due_date":
          av = a.due_date ?? "9999-12-31";
          bv = b.due_date ?? "9999-12-31";
          break;
        default:
          av = (a as any)[sortKey] ?? "";
          bv = (b as any)[sortKey] ?? "";
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [tasks, search, statusFilter, priorityFilter, sortKey, sortDir, progressMap]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <ArrowUpDown className="w-3 h-3 opacity-40" /> :
    sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? "?";

  const statusLabel = (s: TaskStatus) => COLUMNS.find(c => c.id === s)?.title ?? s;
  const statusColor = (s: TaskStatus) => COLUMNS.find(c => c.id === s)?.color ?? "hsl(var(--muted-foreground))";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b flex items-center justify-between px-4 lg:px-6 bg-card">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">List</h1>
            </div>
            <div className="flex items-center gap-3">
              <AlertsBell />
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-64 h-9"
                />
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as TaskStatus | "all")}>
                  <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    {COLUMNS.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={v => setPriorityFilter(v as TaskPriority | "all")}>
                  <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priority</SelectItem>
                    {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => { setEditTask(null); setEditOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" /> Add Task
              </Button>
            </div>

            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      {([
                        ["title", "Task", "text-left"],
                        ["category", "Category", "text-left"],
                        ["priority", "Priority", "text-left"],
                        ["due_date", "Due", "text-left"],
                        ["status", "Status", "text-left"],
                        ["time_estimate", "Estimate", "text-left"],
                        ["progress", "Progress", "text-left"],
                      ] as [SortKey, string, string][]).map(([k, label, align]) => (
                        <th key={k} className={cn("px-3 py-2.5 font-medium", align)}>
                          <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
                            {label} <SortIcon k={k} />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
                    ) : rows.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No tasks match your filters.</td></tr>
                    ) : rows.map((t, i) => {
                      const pm = getPriorityMeta(t.priority as TaskPriority);
                      const pct = progressFor(t.id);
                      const urgency = getUrgency(t.due_date, t.status as TaskStatus);
                      const u = URGENCY_STYLES[urgency];
                      return (
                        <tr
                          key={t.id}
                          className={cn(
                            "border-t cursor-pointer hover:bg-muted/40 transition-colors",
                            i % 2 === 1 && "bg-muted/20",
                          )}
                          onClick={() => { setEditTask(t); setEditOpen(true); }}
                        >
                          <td className={cn("px-3 py-2.5 font-medium", t.status === "completed" && "line-through text-muted-foreground")}>
                            {t.title}
                          </td>
                          <td className="px-3 py-2.5">
                            {t.category ? (
                              <Badge variant="outline" className="text-[10px]" style={{ color: getCategoryColor(t.category), borderColor: getCategoryColor(t.category) }}>
                                {t.category}
                              </Badge>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            <Select
                              value={t.priority}
                              onValueChange={v => updateTask.mutate({ id: t.id, priority: v as TaskPriority })}
                            >
                              <SelectTrigger className="h-7 w-[110px] border-0 bg-transparent px-2 hover:bg-muted">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pm.color }} />
                                  <span className="text-xs">{pm.label}</span>
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                {PRIORITIES.map(p => (
                                  <SelectItem key={p.value} value={p.value}>
                                    <span className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                      {p.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className={cn("px-3 py-2.5", u.text)}>
                            {t.due_date ? format(parseISO(t.due_date), "MMM d, yyyy") : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            <Select
                              value={t.status}
                              onValueChange={v => updateTask.mutate({ id: t.id, status: v as TaskStatus })}
                            >
                              <SelectTrigger className="h-7 w-[130px] border-0 bg-transparent px-2 hover:bg-muted">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(t.status as TaskStatus) }} />
                                  <span className="text-xs">{statusLabel(t.status as TaskStatus)}</span>
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                {COLUMNS.map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    <span className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                                      {c.title}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{t.time_estimate ?? "—"}</td>
                          <td className="px-3 py-2.5 w-[140px]">
                            {pct === null ? <span className="text-muted-foreground">—</span> : (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>

      <TaskDialog open={editOpen} onOpenChange={setEditOpen} defaultStatus="todo" editTask={editTask} />
    </SidebarProvider>
  );
}
