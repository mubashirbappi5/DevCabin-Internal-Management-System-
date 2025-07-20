import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FolderOpen, 
  CheckSquare, 
  UserCheck, 
  DollarSign, 
  MessageSquare, 
  FileText,
  Camera,
  Settings,
  LogOut
} from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Team', url: '/team', icon: Users },
  { title: 'Projects', url: '/projects', icon: FolderOpen },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare },
  { title: 'Clients', url: '/clients', icon: UserCheck },
  { title: 'Finance', url: '/finance', icon: DollarSign },
  { title: 'Messages', url: '/messages', icon: MessageSquare },
  { title: 'Work Submissions', url: '/work-submissions', icon: FileText },
  { title: 'Attendance', url: '/attendance', icon: Camera },
  { title: 'Settings', url: '/settings', icon: Settings },
];

interface LayoutProps {
  children: React.ReactNode;
}

function AppSidebar() {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const getNavClassName = (path: string) => {
    const isActive = location.pathname === path;
    return isActive ? "bg-secondary text-secondary-foreground" : "hover:bg-secondary/50";
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'project_manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'developer': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'designer': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {profile?.first_name} {profile?.last_name}
              </p>
              <Badge variant="secondary" className={`text-xs ${getRoleColor(profile?.role || '')}`}>
                {profile?.role?.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>DevCabin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1">
          <header className="h-14 border-b bg-background flex items-center px-4">
            <SidebarTrigger />
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}