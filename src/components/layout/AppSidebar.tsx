import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  User,
  BarChart3,
  Settings, 
  Activity,
  TrendingUp,
  LogOut
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSprint } from "@/lib/sprint-utils";

const mainNavItems = [
  { title: "Dashboard Geral", url: "/", icon: LayoutDashboard },
  { title: "Squads", url: "/squads", icon: Users },
  { title: "Sprints", url: "/sprints", icon: Calendar },
  { title: "Profissionais", url: "/professionals", icon: User },
  { title: "Ranking", url: "/ranking", icon: BarChart3 },
];

const configNavItems = [
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();

  const { data: activeSprint } = useQuery({
    queryKey: ["active-sprint-sidebar"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("sprints")
        .select("name, start_date, end_date")
        .lte("start_date", today)
        .gte("end_date", today)
        .limit(1);
      if (data && data.length > 0) return data[0];
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-sidebar-foreground">Squad Performance</h1>
            <p className="text-xs text-sidebar-foreground/60">Hub</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
            Analytics
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"} 
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {activeSprint && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-sidebar-foreground/80 truncate">{activeSprint.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary">
              Ativa
            </Badge>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/50">
            <TrendingUp className="h-3 w-3" />
            <span>v1.0.0</span>
          </div>
          {user && (
            <Button variant="ghost" size="sm" onClick={signOut} className="h-7 gap-1 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground">
              <LogOut className="h-3 w-3" />
              Sair
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
