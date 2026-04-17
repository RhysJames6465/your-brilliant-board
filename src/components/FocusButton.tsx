import { Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function FocusButton({ taskId }: { taskId: string }) {
  const navigate = useNavigate();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          data-no-card-open
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/focus/${taskId}`);
          }}
          className="opacity-60 md:opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary"
          aria-label="Enter Focus Mode"
        >
          <Target className="w-4 h-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">Focus Mode</TooltipContent>
    </Tooltip>
  );
}
