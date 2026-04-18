import { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isBefore,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, Bell } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Task, getPriorityMeta, TaskPriority, getCategoryColor } from "@/lib/kanban";
import { TaskDialog } from "@/components/TaskDialog";
import { cn } from "@/lib/utils";

type ColorMode = "priority" | "category";

export default function CalendarPage() {
  const { data: tasks = [] } = useTasks();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const updateTask = useUpdateTask();

  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("priority");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const visibleTasks = useMemo(() => tasks.filter(t => t.status !== "completed" && t.due_date), [tasks]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of visibleTasks) {
      const key = t.due_date as string;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [visibleTasks]);

  const overdueTasks = useMemo(() => {
    const today = startOfDay(new Date());
    return visibleTasks
      .filter(t => isBefore(parseISO(t.due_date as string), today))
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));
  }, [visibleTasks]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = gridStart;
  while (d <= gridEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const getColor = (t: Task) =>
    colorMode === "priority" ? getPriorityMeta(t.priority as TaskPriority).color : getCategoryColor(t.category);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const taskId = result.draggableId;
    const newDate = result.destination.droppableId;
    if (result.source.droppableId === newDate) return;
    updateTask.mutate({ id: taskId, due_date: newDate });
  };

  const openTask = (t: Task) => {
    setEditTask(t);
    setEditOpen(true);
  };

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? "?";

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedTasks = selectedKey ? tasksByDay.get(selectedKey) ?? [] : [];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b flex items-center justify-between px-4 lg:px-6 bg-card">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">Calendar</h1>
            </div>
            <div className="flex items-center gap-3">
              <AlertsBell />
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCursor(subMonths(cursor, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={() => setCursor(new Date())}>Today</Button>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCursor(addMonths(cursor, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <h2 className="ml-3 text-xl font-bold">{format(cursor, "MMMM yyyy")}</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Color by</span>
                <div className="flex rounded-md border overflow-hidden">
                  <button
                    onClick={() => setColorMode("priority")}
                    className={cn("px-3 py-1.5 text-xs", colorMode === "priority" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}
                  >Priority</button>
                  <button
                    onClick={() => setColorMode("category")}
                    className={cn("px-3 py-1.5 text-xs", colorMode === "category" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}
                  >Category</button>
                </div>
              </div>
            </div>

            {/* Overdue banner */}
            {overdueTasks.length > 0 && (
              <div className="mb-4 rounded-lg border border-[hsl(0,84%,60%)]/40 bg-[hsl(0,84%,60%)]/10 p-3">
                <div className="flex items-center gap-2 mb-2 text-[hsl(0,84%,70%)]">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-semibold">Overdue ({overdueTasks.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {overdueTasks.slice(0, 8).map(t => (
                    <button
                      key={t.id}
                      onClick={() => openTask(t)}
                      className="text-xs px-2 py-1 rounded-md bg-card border hover:bg-muted text-left"
                    >
                      <span className="font-medium">{t.title}</span>
                      <span className="ml-2 text-muted-foreground">{format(parseISO(t.due_date!), "MMM d")}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <DragDropContext onDragEnd={handleDragEnd}>
              {/* Weekday header */}
              <div className="grid grid-cols-7 mb-1 text-xs text-muted-foreground font-medium">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div key={d} className="px-2 py-2">{d}</div>
                ))}
              </div>

              {/* Month grid */}
              <div className="grid grid-cols-7 gap-1 bg-border/40 rounded-lg overflow-hidden border">
                {days.map(day => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayTasks = tasksByDay.get(key) ?? [];
                  const inMonth = isSameMonth(day, cursor);
                  const today = isToday(day);
                  return (
                    <Droppable droppableId={key} key={key}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            "min-h-[110px] p-1.5 bg-card cursor-pointer transition-colors",
                            !inMonth && "bg-muted/30 text-muted-foreground",
                            snapshot.isDraggingOver && "bg-primary/10 ring-2 ring-primary ring-inset",
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn(
                              "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                              today && "bg-primary text-primary-foreground",
                            )}>{format(day, "d")}</span>
                            {dayTasks.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">{dayTasks.length}</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {dayTasks.slice(0, 3).map((t, idx) => (
                              <Draggable draggableId={t.id} index={idx} key={t.id}>
                                {(p, snap) => (
                                  <div
                                    ref={p.innerRef}
                                    {...p.draggableProps}
                                    {...p.dragHandleProps}
                                    onClick={(e) => { e.stopPropagation(); openTask(t); }}
                                    className={cn(
                                      "text-[11px] px-1.5 py-1 rounded truncate text-white shadow-sm",
                                      snap.isDragging && "opacity-80",
                                    )}
                                    style={{ backgroundColor: getColor(t), ...p.draggableProps.style }}
                                    title={t.title}
                                  >
                                    {t.title}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {dayTasks.length > 3 && (
                              <div className="text-[10px] text-muted-foreground px-1.5">+{dayTasks.length - 3} more</div>
                            )}
                          </div>
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            </DragDropContext>
          </main>
        </div>
      </div>

      {/* Day detail dialog */}
      <Dialog open={!!selectedDate} onOpenChange={(o) => !o && setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {selectedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No tasks due this day.</p>
            ) : selectedTasks.map(t => {
              const pm = getPriorityMeta(t.priority as TaskPriority);
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelectedDate(null); openTask(t); }}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{t.title}</div>
                      {t.description && <div className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</div>}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px]" style={{ color: pm.color, borderColor: pm.color }}>{pm.label}</Badge>
                        {t.category && (
                          <Badge variant="outline" className="text-[10px]" style={{ color: getCategoryColor(t.category), borderColor: getCategoryColor(t.category) }}>{t.category}</Badge>
                        )}
                        {t.time_estimate && <span className="text-[10px] text-muted-foreground">⏱ {t.time_estimate}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <TaskDialog open={editOpen} onOpenChange={setEditOpen} defaultStatus="todo" editTask={editTask} />
    </SidebarProvider>
  );
}
