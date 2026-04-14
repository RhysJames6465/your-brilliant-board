import { Task, TaskStatus, COLUMNS } from "@/lib/kanban";
import { TaskCard } from "@/components/TaskCard";
import { Droppable } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  status: TaskStatus;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onAdd: (status: TaskStatus) => void;
};

export function KanbanColumn({ status, tasks, onEdit, onDelete, onAdd }: Props) {
  const col = COLUMNS.find(c => c.id === status)!;

  return (
    <div className="flex flex-col min-w-[300px] w-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
          <h3 className="font-semibold text-sm">{col.title}</h3>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium">
            {tasks.length}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAdd(status)}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 space-y-3 p-2 rounded-xl min-h-[200px] transition-colors ${
              snapshot.isDraggingOver ? "bg-accent/50" : "bg-muted/30"
            }`}
          >
            {tasks.map((task, i) => (
              <TaskCard key={task.id} task={task} index={i} onEdit={onEdit} onDelete={onDelete} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
