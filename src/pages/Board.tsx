import { useState, useCallback } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "@/components/KanbanColumn";
import { TaskDialog } from "@/components/TaskDialog";
import { BoardStats } from "@/components/BoardStats";
import { AIChatWidget } from "@/components/AIChatWidget";
import { useTasks, useDeleteTask, useBulkUpdatePositions } from "@/hooks/useTasks";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Task, TaskStatus, COLUMNS } from "@/lib/kanban";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Bell, Plus } from "lucide-react";

export default function Board() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const deleteTask = useDeleteTask();
  const bulkUpdate = useBulkUpdatePositions();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStatus, setDialogStatus] = useState<TaskStatus>("todo");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");

  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedTasks = COLUMNS.reduce((acc, col) => {
    acc[col.id] = filteredTasks
      .filter(t => t.status === col.id)
      .sort((a, b) => a.position - b.position);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  const handleAdd = (status: TaskStatus) => {
    setEditTask(null);
    setDialogStatus(status);
    setDialogOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => deleteTask.mutate(id);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;
    const srcStatus = source.droppableId as TaskStatus;
    const dstStatus = destination.droppableId as TaskStatus;

    const allGrouped = { ...groupedTasks };
    const srcCol = [...(allGrouped[srcStatus] || [])];
    const [moved] = srcCol.splice(source.index, 1);

    if (srcStatus === dstStatus) {
      srcCol.splice(destination.index, 0, moved);
      const updates = srcCol.map((t, i) => ({ id: t.id, position: i, status: srcStatus }));
      bulkUpdate.mutate(updates);
    } else {
      const dstCol = [...(allGrouped[dstStatus] || [])];
      dstCol.splice(destination.index, 0, { ...moved, status: dstStatus });
      const updates = [
        ...srcCol.map((t, i) => ({ id: t.id, position: i, status: srcStatus })),
        ...dstCol.map((t, i) => ({ id: t.id, position: i, status: dstStatus })),
      ];
      bulkUpdate.mutate(updates);
    }
  }, [groupedTasks, bulkUpdate]);

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? "?";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-16 border-b flex items-center justify-between px-4 lg:px-6 bg-card">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="pl-9 w-64 h-9 bg-muted/50 border-0"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
              </Button>
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Main content */}
          <div className="flex-1 flex overflow-hidden">
            <main className="flex-1 p-4 lg:p-6 overflow-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Work Planner</h1>
                  <p className="text-sm text-muted-foreground mt-1">Manage and track your tasks</p>
                </div>
                <Button onClick={() => handleAdd("todo")} className="gap-2">
                  <Plus className="w-4 h-4" /> Add Task
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">Loading tasks...</div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                    {COLUMNS.map(col => (
                      <KanbanColumn
                        key={col.id}
                        status={col.id}
                        tasks={groupedTasks[col.id] || []}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAdd={handleAdd}
                      />
                    ))}
                  </div>
                </DragDropContext>
              )}
            </main>

            {/* Right stats panel */}
            <aside className="hidden xl:block w-72 border-l p-4 overflow-y-auto bg-card">
              <h2 className="font-semibold text-sm mb-4">Board Overview</h2>
              <BoardStats tasks={tasks} />
            </aside>
          </div>
        </div>
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultStatus={dialogStatus}
        editTask={editTask}
      />
      <AIChatWidget />
    </SidebarProvider>
  );
}
