import { useState } from "react";
import { Bell, AlertTriangle, Clock, CalendarDays, Settings as SettingsIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTaskAlerts } from "@/hooks/useTaskAlerts";
import { TaskAlert, AlertBucket } from "@/lib/notifications";
import { getPriorityMeta, TaskPriority } from "@/lib/kanban";
import { cn } from "@/lib/utils";

const bucketMeta: Record<AlertBucket, { label: string; icon: typeof AlertTriangle; tone: string }> = {
  overdue: { label: "Overdue", icon: AlertTriangle, tone: "text-[hsl(0,84%,65%)]" },
  today: { label: "Due today", icon: Clock, tone: "text-[hsl(38,92%,55%)]" },
  tomorrow: { label: "Due tomorrow", icon: CalendarDays, tone: "text-[hsl(199,89%,55%)]" },
};

export function AlertsBell() {
  const { alerts, counts } = useTaskAlerts();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const grouped: Record<AlertBucket, TaskAlert[]> = {
    overdue: alerts.filter(a => a.bucket === "overdue"),
    today: alerts.filter(a => a.bucket === "today"),
    tomorrow: alerts.filter(a => a.bucket === "tomorrow"),
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Alerts">
          <Bell className="w-5 h-5" />
          {counts.total > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white",
              counts.overdue > 0 ? "bg-[hsl(0,84%,60%)]" : "bg-primary",
            )}>
              {counts.total > 99 ? "99+" : counts.total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h3 className="font-semibold text-sm">Alerts</h3>
            <p className="text-xs text-muted-foreground">{counts.total} task{counts.total === 1 ? "" : "s"} need attention</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setOpen(false); navigate("/alerts"); }} title="Open alerts page">
            <SettingsIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
        <ScrollArea className="max-h-96">
          {alerts.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              You're all caught up. 🎉
            </div>
          ) : (
            <div className="py-1">
              {(Object.keys(grouped) as AlertBucket[]).map((b) => {
                if (grouped[b].length === 0) return null;
                const Meta = bucketMeta[b];
                const Icon = Meta.icon;
                return (
                  <div key={b}>
                    <div className={cn("px-4 py-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide", Meta.tone)}>
                      <Icon className="w-3.5 h-3.5" />
                      {Meta.label}
                      <span className="ml-auto text-muted-foreground">{grouped[b].length}</span>
                    </div>
                    {grouped[b].map(({ task }) => {
                      const pm = getPriorityMeta(task.priority as TaskPriority);
                      return (
                        <button
                          key={task.id}
                          onClick={() => { setOpen(false); navigate(`/focus/${task.id}`); }}
                          className="w-full text-left px-4 py-2 hover:bg-muted flex items-start gap-2"
                        >
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pm.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{task.title}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5">{pm.label}</Badge>
                              {task.due_date && <span>{new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    <Separator />
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="px-4 py-2 border-t flex items-center justify-between">
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { setOpen(false); navigate("/alerts"); }}>
            View all alerts
          </Button>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { setOpen(false); navigate("/settings"); }}>
            Settings
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
