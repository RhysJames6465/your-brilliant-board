import { Task, getCategoryColor } from "@/lib/kanban";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Calendar, Clock, Pencil, Trash2 } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";

type Props = {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
};

export function TaskCard({ task, index, onEdit, onDelete }: Props) {
  const categoryColor = getCategoryColor(task.category);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-4 cursor-grab active:cursor-grabbing transition-shadow border border-border/60 hover:shadow-md group ${
            snapshot.isDragging ? "shadow-xl rotate-2 scale-105" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {task.category && (
                <Badge
                  className="mb-2 text-[10px] font-semibold border-0 text-white"
                  style={{ backgroundColor: categoryColor }}
                >
                  {task.category}
                </Badge>
              )}
              <h4 className="font-semibold text-sm leading-snug mb-1 truncate">{task.title}</h4>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
              )}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                {task.due_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                {task.time_estimate && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.time_estimate}
                  </span>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      )}
    </Draggable>
  );
}
