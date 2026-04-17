import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Task, getPriorityMeta, TaskPriority, getCategoryColor } from "@/lib/kanban";
import { useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { useStartFocusSession, useEndFocusSession } from "@/hooks/useFocusSession";
import { SubtaskList } from "@/components/SubtaskList";
import { TaskDialog } from "@/components/TaskDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  Flag,
} from "lucide-react";
import { parseEstimateToSeconds, formatDuration, formatHumanDuration, playChime } from "@/lib/timer";
import { celebrateCompletion } from "@/lib/confetti";
import { toast } from "sonner";

export default function Focus() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const startSession = useStartFocusSession();
  const endSession = useEndFocusSession();

  const [editOpen, setEditOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState<number>(0); // can go negative => overtime
  const [elapsed, setElapsed] = useState(0); // session elapsed (always counted while running)
  const [initialDuration, setInitialDuration] = useState(0);
  const chimedRef = useRef(false);
  const sessionStartedRef = useRef(false);

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId!)
        .maybeSingle();
      if (error) throw error;
      return data as Task | null;
    },
    enabled: !!user && !!taskId,
  });

  // Initialize timer once we have the task
  useEffect(() => {
    if (!task) return;
    const seconds = parseEstimateToSeconds(task.time_estimate) || 25 * 60; // 25min fallback
    setInitialDuration(seconds);
    setRemaining(seconds);
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start a focus session record on mount
  useEffect(() => {
    if (!taskId || sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    startSession.mutate(taskId, {
      onSuccess: (row) => setSessionId(row.id),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // Tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        if (next === 0 && !chimedRef.current) {
          chimedRef.current = true;
          playChime();
          toast("Time's up", {
            description: "Keep going or take a break — overtime is now counting.",
          });
        }
        return next;
      });
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const exitAndSave = async (completed = false) => {
    if (sessionId && taskId) {
      try {
        await endSession.mutateAsync({
          id: sessionId,
          duration_seconds: elapsed,
          completed_task: completed,
          task_id: taskId,
        });
      } catch {
        // non-fatal
      }
    }
    navigate("/");
  };

  const handleMarkComplete = async () => {
    if (!task) return;
    await updateTask.mutateAsync({ id: task.id, status: "completed" });
    celebrateCompletion();
    qc.invalidateQueries({ queryKey: ["tasks"] });
    await exitAndSave(true);
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!confirm("Delete this task?")) return;
    await deleteTask.mutateAsync(task.id);
    await exitAndSave(false);
  };

  const handleReset = () => {
    setRunning(false);
    chimedRef.current = false;
    setRemaining(initialDuration);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        exitAndSave(false);
      } else if (e.code === "Space" && !(e.target as HTMLElement)?.matches?.("input, textarea")) {
        e.preventDefault();
        setRunning((r) => !r);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen, sessionId, elapsed]);

  const overtime = remaining < 0;
  const display = useMemo(() => formatDuration(Math.abs(remaining)), [remaining]);
  const priority = task ? getPriorityMeta(task.priority as TaskPriority) : null;
  const categoryColor = task ? getCategoryColor(task.category) : "";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!task) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>Task not found.</p>
        <Button onClick={() => navigate("/")}>Back to board</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col animate-in fade-in duration-500">
      {/* Toolbar */}
      <header className="h-14 border-b border-border/40 flex items-center justify-between px-4 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => exitAndSave(false)}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Exit Focus
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRunning((r) => !r)}
            className="gap-2"
          >
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {running ? "Pause" : "Start"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkComplete}
            className="gap-2 text-primary"
            disabled={task.status === "completed"}
          >
            <Check className="w-4 h-4" />
            {task.status === "completed" ? "Completed" : "Mark complete"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl space-y-12">
          {/* Task header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              {task.category && (
                <Badge
                  className="text-xs font-medium border-0 text-white"
                  style={{ backgroundColor: categoryColor }}
                >
                  {task.category}
                </Badge>
              )}
              {priority && (
                <Badge
                  className="text-xs font-medium border-0 text-white gap-1"
                  style={{ backgroundColor: priority.color }}
                >
                  <Flag className="w-3 h-3" />
                  {priority.label}
                </Badge>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
              {task.title}
            </h1>
            {task.description && (
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto whitespace-pre-wrap">
                {task.description}
              </p>
            )}
          </div>

          {/* Timer */}
          <div className="flex flex-col items-center gap-4">
            <div
              className={`font-mono tabular-nums text-7xl md:text-8xl font-light tracking-tight transition-colors ${
                overtime ? "text-amber-500" : running ? "text-primary" : "text-foreground"
              }`}
            >
              {overtime && "+"}
              {display}
            </div>
            <div className="text-xs text-muted-foreground">
              {overtime ? "Overtime" : running ? "Focused" : "Paused"}
              {" • Session "} {formatHumanDuration(elapsed)}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={running ? "outline" : "default"}
                size="sm"
                onClick={() => setRunning((r) => !r)}
                className="gap-2 min-w-[100px]"
              >
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {running ? "Pause" : "Start"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRemaining((r) => r + 5 * 60)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />5 min
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </div>
          </div>

          {/* Subtasks */}
          <div className="border-t border-border/40 pt-8">
            <SubtaskList taskId={task.id} size="lg" />
          </div>
        </div>
      </main>

      <TaskDialog open={editOpen} onOpenChange={setEditOpen} editTask={task} />
    </div>
  );
}
