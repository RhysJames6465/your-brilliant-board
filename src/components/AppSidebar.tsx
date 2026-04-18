import { LayoutDashboard, Settings, LogOut, Bot, CalendarDays, List, GanttChart, Bell } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskAlerts } from "@/hooks/useTaskAlerts";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Board", url: "/", icon: LayoutDashboard },
  { title: "List", url: "/list", icon: List },
  { title: "Timeline", url: "/timeline", icon: GanttChart },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "AI Assistant", url: "/assistant", icon: Bot },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { counts } = useTaskAlerts();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar-background text-sidebar-foreground">
        <div className="px-4 py-5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-sidebar-accent-foreground text-lg">TaskFlow</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isAlerts = item.url === "/alerts";
                const badge = isAlerts ? counts.overdue || counts.total : 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-sidebar-accent text-sidebar-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="w-4 h-4 mr-2" />
                        {!collapsed && <span className="flex-1">{item.title}</span>}
                        {!collapsed && isAlerts && badge > 0 && (
                          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${counts.overdue > 0 ? "bg-[hsl(0,84%,60%)]" : "bg-primary"}`}>
                            {badge}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar-background">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="text-sidebar-foreground hover:bg-sidebar-accent">
              <LogOut className="w-4 h-4 mr-2" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
