import { useMemo } from "react";
import { Task } from "@/lib/kanban";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, ListTodo, TrendingUp } from "lucide-react";

type Props = { tasks: Task[] };

export function BoardStats({ tasks }: Props) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const inProgress = tasks.filter(t => t.status === "in-progress").length;
    const todo = tasks.filter(t => t.status === "todo").length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, todo, pct };
  }, [tasks]);

  const circumference = 2 * Math.PI * 40;
  const strokeDash = (stats.pct / 100) * circumference;

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Board Progress</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${strokeDash} ${circumference}`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{stats.pct}%</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Completion rate</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={ListTodo} label="Total" value={stats.total} color="text-primary" />
        <StatCard icon={Clock} label="In Progress" value={stats.inProgress} color="text-orange-500" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="text-emerald-500" />
        <StatCard icon={TrendingUp} label="To-Do" value={stats.todo} color="text-primary" />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-3 flex flex-col items-center gap-1">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-xl font-bold">{value}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
