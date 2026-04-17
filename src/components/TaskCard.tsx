import { Task, getCategoryColor, getPriorityMeta, getUrgency, URGENCY_STYLES, TaskPriority } from "@/lib/kanban";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Calendar, Clock, Pencil, Trash2, AlertTriangle, Flag } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { FocusButton } from "@/components/FocusButton";

type Props = {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
};

export function TaskCard({ task, index, onEdit, onDelete }: Props) {
  const categoryColor = getCategoryColor(task.category);
  const priority = getPriorityMeta(task.priority as TaskPriority);
  const urgency = getUrgency(task.due_date, task.status);
  const urgencyStyles = URGENCY_STYLES[urgency];

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("[data-no-card-open]")) return;
            onEdit(task);
          }}
          className={`p-4 cursor-pointer transition-shadow border border-border/60 hover:shadow-md group ${urgencyStyles.border} ${
            snapshot.isDragging ? "shadow-xl rotate-2 scale-105" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {task.category && (
                  <Badge
                    className="text-[10px] font-semibold border-0 text-white"
                    style={{ backgroundColor: categoryColor }}
                  >
                    {task.category}
                  </Badge>
                )}
                <Badge
                  className="text-[10px] font-semibold border-0 text-white gap-1"
                  style={{ backgroundColor: priority.color }}
                  title={`${priority.label} priority`}
                >
                  <Flag className="w-2.5 h-2.5" />
                  {priority.label}
                </Badge>
                {urgency === "overdue" && (
                  <span className={`flex items-center gap-1 text-[10px] font-semibold ${urgencyStyles.text}`}>
                    <AlertTriangle className="w-3 h-3" />
                    Overdue
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-sm leading-snug mb-1 truncate">{task.title}</h4>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
              )}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                {task.due_date && (
                  <span className={`flex items-center gap-1 ${urgency !== "none" ? urgencyStyles.text : ""}`}>
                    <Calendar className="w-3 h-3" />
                    {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {urgency === "soon" && " • soon"}
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
            <div className="flex items-center gap-0.5">
              <FocusButton taskId={task.id} />
              <DropdownMenu>
                <DropdownMenuTrigger
                  data-no-card-open
                  onClick={(e) => e.stopPropagation()}
                  className="opacity-60 md:opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                >
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
          </div>
        </Card>
      )}
    </Draggable>
  );
}
