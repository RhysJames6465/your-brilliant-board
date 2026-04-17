import { useState, KeyboardEvent } from "react";
import { useSubtasks, useCreateSubtask, useToggleSubtask, useDeleteSubtask } from "@/hooks/useSubtasks";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

type Props = {
  taskId: string;
  size?: "default" | "lg";
};

export function SubtaskList({ taskId, size = "default" }: Props) {
  const { data: subtasks = [], isLoading } = useSubtasks(taskId);
  const create = useCreateSubtask();
  const toggle = useToggleSubtask();
  const del = useDeleteSubtask();
  const [newTitle, setNewTitle] = useState("");

  const completedCount = subtasks.filter(s => s.completed).length;
  const total = subtasks.length;
  const percent = total ? (completedCount / total) * 100 : 0;

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) return;
    create.mutate(
      { task_id: taskId, title, position: subtasks.length },
      { onSuccess: () => setNewTitle("") }
    );
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const isLg = size === "lg";

  return (
    <div className="space-y-3">
      {total > 0 && (
        <div className="space-y-1.5">
          <div className={`flex items-center justify-between ${isLg ? "text-sm" : "text-xs"} text-muted-foreground`}>
            <span>Subtasks</span>
            <span>{completedCount}/{total} complete</span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      <ul className="space-y-1.5">
        {isLoading && <li className="text-xs text-muted-foreground">Loading...</li>}
        {subtasks.map(s => (
          <li key={s.id} className="group flex items-center gap-3">
            <Checkbox
              checked={s.completed}
              onCheckedChange={(c) =>
                toggle.mutate({ id: s.id, completed: !!c, task_id: taskId })
              }
              className={isLg ? "h-5 w-5" : ""}
            />
            <span
              className={`flex-1 ${isLg ? "text-base" : "text-sm"} ${
                s.completed ? "line-through text-muted-foreground" : "text-foreground"
              }`}
            >
              {s.title}
            </span>
            <button
              onClick={() => del.mutate({ id: s.id, task_id: taskId })}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
              aria-label="Delete subtask"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Add a subtask..."
          className={isLg ? "h-10" : "h-8 text-sm"}
        />
        <Button
          type="button"
          variant="outline"
          size={isLg ? "default" : "sm"}
          onClick={handleAdd}
          disabled={!newTitle.trim() || create.isPending}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
