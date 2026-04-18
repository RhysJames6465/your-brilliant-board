import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, CalendarDays, Settings as SettingsIcon } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertsBell } from "@/components/AlertsBell";
import { useTaskAlerts } from "@/hooks/useTaskAlerts";
import { AlertBucket, TaskAlert } from "@/lib/notifications";
import { getPriorityMeta, getCategoryColor, TaskPriority } from "@/lib/kanban";
import { cn } from "@/lib/utils";

const meta: Record<AlertBucket, { label: string; icon: typeof AlertTriangle; tone: string; bg: string }> = {
  overdue: { label: "Overdue", icon: AlertTriangle, tone: "text-[hsl(0,84%,65%)]", bg: "bg-[hsl(0,84%,60%)]/10 border-[hsl(0,84%,60%)]/40" },
  today: { label: "Due today", icon: Clock, tone: "text-[hsl(38,92%,55%)]", bg: "bg-[hsl(38,92%,50%)]/10 border-[hsl(38,92%,50%)]/40" },
  tomorrow: { label: "Due tomorrow", icon: CalendarDays, tone: "text-[hsl(199,89%,55%)]", bg: "bg-[hsl(199,89%,48%)]/10 border-[hsl(199,89%,48%)]/40" },
};

export default function AlertsPage() {
  const { alerts, counts } = useTaskAlerts();
  const navigate = useNavigate();

  const grouped: Record<AlertBucket, TaskAlert[]> = {
    overdue: alerts.filter(a => a.bucket === "overdue"),
    today: alerts.filter(a => a.bucket === "today"),
    tomorrow: alerts.filter(a => a.bucket === "tomorrow"),
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center justify-between px-4 lg:px-6 bg-card">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">Alerts</h1>
            </div>
            <div className="flex items-center gap-2">
              <AlertsBell />
              <Button variant="outline" size="sm" onClick={() => navigate("/settings")}>
                <SettingsIcon className="w-4 h-4 mr-2" /> Notification settings
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-8 max-w-4xl">
            {counts.total === 0 ? (
              <Card className="p-12 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <h2 className="font-semibold mb-1">All caught up!</h2>
                <p className="text-sm text-muted-foreground">No overdue or upcoming tasks need your attention.</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {(Object.keys(grouped) as AlertBucket[]).map((b) => {
                  if (grouped[b].length === 0) return null;
                  const M = meta[b];
                  const Icon = M.icon;
                  return (
                    <section key={b}>
                      <div className={cn("flex items-center gap-2 mb-3", M.tone)}>
                        <Icon className="w-4 h-4" />
                        <h2 className="font-semibold uppercase text-xs tracking-wide">{M.label}</h2>
                        <span className="text-xs text-muted-foreground">({grouped[b].length})</span>
                      </div>
                      <div className="space-y-2">
                        {grouped[b].map(({ task }) => {
                          const pm = getPriorityMeta(task.priority as TaskPriority);
                          return (
                            <Card
                              key={task.id}
                              onClick={() => navigate(`/focus/${task.id}`)}
                              className={cn("p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4", M.bg)}
                              style={{ borderLeftColor: pm.color }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    {task.category && (
                                      <Badge className="text-[10px] border-0 text-white" style={{ backgroundColor: getCategoryColor(task.category) }}>
                                        {task.category}
                                      </Badge>
                                    )}
                                    <Badge className="text-[10px] border-0 text-white" style={{ backgroundColor: pm.color }}>
                                      {pm.label}
                                    </Badge>
                                  </div>
                                  <div className="font-medium truncate">{task.title}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {task.due_date && new Date(task.due_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                    {task.time_estimate && ` • ${task.time_estimate}`}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
