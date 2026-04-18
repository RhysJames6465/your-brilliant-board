import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { addDays, addWeeks, differenceInCalendarDays, format, isSameDay, startOfWeek, parseISO } from "date-fns";
import { Bell, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Task, TaskPriority, getPriorityMeta, getCategoryColor } from "@/lib/kanban";
import { TaskDialog } from "@/components/TaskDialog";
import { parseEstimateToSeconds } from "@/lib/timer";
import { cn } from "@/lib/utils";

type ColorMode = "priority" | "category";
const ZOOMS = [24, 40, 60, 90]; // px per day
const VISIBLE_WEEKS_PRESETS = [4, 8, 12];

export default function Timeline() {
  const { data: tasks = [] } = useTasks();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const updateTask = useUpdateTask();

  const [zoomIdx, setZoomIdx] = useState(1);
  const [weeks, setWeeks] = useState(8);
  const [anchor, setAnchor] = useState<Date>(() => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -2));
  const [colorMode, setColorMode] = useState<ColorMode>("priority");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const dayPx = ZOOMS[zoomIdx];
  const totalDays = weeks * 7;
  const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => addDays(anchor, i)), [anchor, totalDays]);

  const visibleTasks = useMemo(
    () => tasks.filter(t => t.due_date && t.status !== "completed"),
    [tasks],
  );

  const estimateDays = (t: Task) => {
    const secs = parseEstimateToSeconds(t.time_estimate);
    if (!secs) return 1;
    // 1 day = 8 working hours; min 1 day, max 14
    return Math.min(14, Math.max(1, Math.round(secs / (8 * 3600))));
  };

  const colorFor = (t: Task) =>
    colorMode === "priority" ? getPriorityMeta(t.priority as TaskPriority).color : getCategoryColor(t.category);

  const todayOffset = differenceInCalendarDays(new Date(), anchor);

  // Drag state
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startDate: string } | null>(null);
  const [dragOffsetDays, setDragOffsetDays] = useState<{ id: string; days: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent, t: Task) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { id: t.id, startX: e.clientX, startDate: t.due_date! };
    setDragOffsetDays({ id: t.id, days: 0 });
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    setDragOffsetDays({ id: dragRef.current.id, days: Math.round(dx / dayPx) });
  }, [dayPx]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const offset = Math.round((e.clientX - dragRef.current.startX) / dayPx);
    if (offset !== 0) {
      const newDate = format(addDays(parseISO(dragRef.current.startDate), offset), "yyyy-MM-dd");
      updateTask.mutate({ id: dragRef.current.id, due_date: newDate });
    }
    dragRef.current = null;
    setDragOffsetDays(null);
  }, [dayPx, updateTask]);

  // Auto-scroll to today on first render
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const x = todayOffset * dayPx - el.clientWidth / 3;
    el.scrollLeft = Math.max(0, x);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? "?";

  // Group rows: one task per row for clarity
  const rows = useMemo(() => {
    return [...visibleTasks].sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));
  }, [visibleTasks]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b flex items-center justify-between px-4 lg:px-6 bg-card">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">Timeline</h1>
            </div>
            <div className="flex items-center gap-3">
              <AlertsBell />
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6 overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setAnchor(addWeeks(anchor, -2))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={() => {
                  setAnchor(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -2));
                  setTimeout(() => {
                    if (containerRef.current) {
                      const x = differenceInCalendarDays(new Date(), addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -2)) * dayPx - containerRef.current.clientWidth / 3;
                      containerRef.current.scrollLeft = Math.max(0, x);
                    }
                  }, 0);
                }}>Today</Button>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setAnchor(addWeeks(anchor, 2))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <span className="ml-3 text-sm text-muted-foreground">
                  {format(anchor, "MMM d")} – {format(addDays(anchor, totalDays - 1), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-md border overflow-hidden">
                  {VISIBLE_WEEKS_PRESETS.map(w => (
                    <button key={w} onClick={() => setWeeks(w)}
                      className={cn("px-3 py-1.5 text-xs", weeks === w ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>
                      {w}w
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setZoomIdx(i => Math.max(0, i - 1))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setZoomIdx(i => Math.min(ZOOMS.length - 1, i + 1))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <div className="flex rounded-md border overflow-hidden ml-2">
                  <button onClick={() => setColorMode("priority")}
                    className={cn("px-3 py-1.5 text-xs", colorMode === "priority" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>Priority</button>
                  <button onClick={() => setColorMode("category")}
                    className={cn("px-3 py-1.5 text-xs", colorMode === "category" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>Category</button>
                </div>
              </div>
            </div>

            {/* Timeline grid */}
            <div className="flex-1 rounded-lg border bg-card overflow-hidden flex">
              {/* Sticky left column with task names */}
              <div className="w-56 flex-shrink-0 border-r bg-muted/20">
                <div className="h-12 border-b flex items-center px-3 text-xs font-semibold uppercase text-muted-foreground">
                  Task
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 240px)" }}>
                  {rows.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">No tasks scheduled.</div>
                  ) : rows.map(t => {
                    const pm = getPriorityMeta(t.priority as TaskPriority);
                    return (
                      <div key={t.id} className="h-12 border-b px-3 flex items-center gap-2 cursor-pointer hover:bg-muted/40"
                        onClick={() => { setEditTask(t); setEditOpen(true); }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pm.color }} />
                        <span className="text-sm truncate">{t.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable timeline */}
              <div ref={containerRef} className="flex-1 overflow-auto"
                onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
                <div style={{ width: totalDays * dayPx, position: "relative" }}>
                  {/* Header */}
                  <div className="h-12 border-b sticky top-0 bg-card z-10">
                    <div className="flex h-full">
                      {days.map((d, i) => {
                        const isWeekStart = d.getDay() === 1; // Mon
                        const isToday = isSameDay(d, new Date());
                        return (
                          <div key={i}
                            style={{ width: dayPx }}
                            className={cn(
                              "flex flex-col items-center justify-center border-r text-[10px] flex-shrink-0",
                              isWeekStart && "border-l-2 border-l-border",
                              isToday && "bg-primary/10",
                            )}>
                            <span className="text-muted-foreground uppercase">{format(d, "EEE")}</span>
                            <span className={cn("font-semibold", isToday && "text-primary")}>{format(d, "d")}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="relative" style={{ maxHeight: "calc(100vh - 240px)" }}>
                    {/* Today line */}
                    {todayOffset >= 0 && todayOffset < totalDays && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-primary z-20 pointer-events-none"
                        style={{ left: todayOffset * dayPx + dayPx / 2 }}
                      >
                        <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
                      </div>
                    )}

                    {rows.map(t => {
                      const start = parseISO(t.due_date!);
                      const startOffset = differenceInCalendarDays(start, anchor);
                      const span = estimateDays(t);
                      const draggingThis = dragOffsetDays?.id === t.id ? dragOffsetDays.days : 0;
                      const left = (startOffset + draggingThis) * dayPx + 2;
                      const width = span * dayPx - 4;
                      const visible = startOffset + draggingThis + span > 0 && startOffset + draggingThis < totalDays;
                      return (
                        <div key={t.id} className="h-12 border-b relative">
                          {/* Day grid lines */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {days.map((d, i) => (
                              <div key={i} style={{ width: dayPx }} className={cn(
                                "border-r flex-shrink-0",
                                d.getDay() === 1 && "border-l-2 border-l-border",
                                d.getDay() === 0 || d.getDay() === 6 ? "bg-muted/10" : "",
                              )} />
                            ))}
                          </div>
                          {visible && (
                            <div
                              onPointerDown={(e) => onPointerDown(e, t)}
                              onClick={(e) => { if (!dragOffsetDays) { setEditTask(t); setEditOpen(true); } }}
                              className="absolute top-2 bottom-2 rounded-md text-white text-xs px-2 flex items-center cursor-grab active:cursor-grabbing shadow-sm hover:brightness-110 transition-all"
                              style={{ left, width: Math.max(dayPx - 4, width), backgroundColor: colorFor(t) }}
                              title={`${t.title} • ${t.time_estimate ?? "1d"}`}
                            >
                              <span className="truncate font-medium">{t.title}</span>
                              {span > 2 && <span className="ml-auto opacity-80 text-[10px] pl-2">{t.time_estimate ?? `${span}d`}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <TaskDialog open={editOpen} onOpenChange={setEditOpen} defaultStatus="todo" editTask={editTask} />
    </SidebarProvider>
  );
}
