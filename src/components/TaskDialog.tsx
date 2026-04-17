import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { CATEGORIES, PRIORITIES, Task, TaskStatus, TaskPriority } from "@/lib/kanban";
import { celebrateCompletion } from "@/lib/confetti";
import { SubtaskList } from "@/components/SubtaskList";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: TaskStatus;
  editTask?: Task | null;
};

export function TaskDialog({ open, onOpenChange, defaultStatus = "todo", editTask }: Props) {
  const [title, setTitle] = useState(editTask?.title ?? "");
  const [description, setDescription] = useState(editTask?.description ?? "");
  const [category, setCategory] = useState(editTask?.category ?? "");
  const [dueDate, setDueDate] = useState(editTask?.due_date ?? "");
  const [timeEstimate, setTimeEstimate] = useState(editTask?.time_estimate ?? "");
  const [status, setStatus] = useState<TaskStatus>(editTask?.status ?? defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>((editTask?.priority as TaskPriority) ?? "medium");

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  useEffect(() => {
    if (!open) return;
    setTitle(editTask?.title ?? "");
    setDescription(editTask?.description ?? "");
    setCategory(editTask?.category ?? "");
    setDueDate(editTask?.due_date ?? "");
    setTimeEstimate(editTask?.time_estimate ?? "");
    setStatus(editTask?.status ?? defaultStatus);
    setPriority((editTask?.priority as TaskPriority) ?? "medium");
  }, [open, editTask, defaultStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title,
      description: description || undefined,
      category: category || undefined,
      due_date: dueDate || undefined,
      time_estimate: timeEstimate || undefined,
      status,
      priority,
    };

    const wasCompleted = editTask?.status === "completed";
    if (editTask) {
      await updateTask.mutateAsync({ id: editTask.id, ...payload });
    } else {
      await createTask.mutateAsync(payload);
    }
    if (status === "completed" && !wasCompleted) celebrateCompletion();
    onOpenChange(false);
    setTitle(""); setDescription(""); setCategory(""); setDueDate(""); setTimeEstimate(""); setPriority("medium");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editTask ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To-Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            </div>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.label} value={c.label}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Time estimate</Label>
              <Input value={timeEstimate} onChange={e => setTimeEstimate(e.target.value)} placeholder="e.g. 2h" />
            </div>
          </div>
          {editTask && (
            <div className="space-y-2 pt-2 border-t">
              <Label>Subtasks</Label>
              <SubtaskList taskId={editTask.id} />
            </div>
          )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
              {editTask ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
