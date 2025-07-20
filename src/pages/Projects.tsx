import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, DollarSign, Clock, Users, Edit, Trash2, CheckCircle2, Target } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  budget?: number;
  estimated_hours?: number;
  actual_hours?: number;
  client_id?: string;
  project_manager_id?: string;
  created_at: string;
  clients?: { name: string };
  profiles?: { first_name: string; last_name: string };
  project_members?: { profiles: { first_name: string; last_name: string; avatar_url?: string } }[];
  task_stats?: {
    total_tasks: number;
    completed_tasks: number;
  };
}

interface Client {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export default function Projects() {
  const { isAdmin, profile } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [managers, setManagers] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning' as 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled',
    start_date: '',
    end_date: '',
    budget: '',
    estimated_hours: '',
    client_id: '',
    project_manager_id: ''
  });

  const canManageProjects = isAdmin;

  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchManagers();
    fetchAllUsers();
  }, []);

  const fetchProjects = async () => {
    try {
      // First get projects with basic info
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          clients (name),
          profiles (first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Then get project members and task stats for each project
      const enrichedProjects = await Promise.all(
        (projectsData || []).map(async (project) => {
          // Get project members
          const { data: membersData } = await supabase
            .from('project_members')
            .select(`
              profiles (first_name, last_name, avatar_url)
            `)
            .eq('project_id', project.id);

          // Get task statistics
          const { data: tasksData } = await supabase
            .from('tasks')
            .select('status')
            .eq('project_id', project.id);

          const totalTasks = tasksData?.length || 0;
          const completedTasks = tasksData?.filter(task => task.status === 'completed').length || 0;

          return {
            ...project,
            project_members: membersData || [],
            task_stats: {
              total_tasks: totalTasks,
              completed_tasks: completedTasks
            }
          };
        })
      );

      setProjects(enrichedProjects);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('role', ['admin', 'project_manager'])
        .order('first_name');

      if (error) throw error;
      setManagers(data || []);
    } catch (error: any) {
      console.error('Error fetching managers:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const projectData = {
        name: formData.name,
        description: formData.description || null,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : null,
        client_id: formData.client_id || null,
        project_manager_id: formData.project_manager_id || null
      };

      let projectId = '';

      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id);

        if (error) throw error;
        projectId = editingProject.id;

        // Update team members for existing project
        if (projectId) {
          // Remove existing members
          await supabase
            .from('project_members')
            .delete()
            .eq('project_id', projectId);

          // Add new members
          if (selectedMembers.length > 0) {
            const memberInserts = selectedMembers.map(userId => ({
              project_id: projectId,
              user_id: userId,
              role: 'developer'
            }));

            const { error: memberError } = await supabase
              .from('project_members')
              .insert(memberInserts);

            if (memberError) throw memberError;
          }
        }
        
        toast({
          title: "Success",
          description: "Project updated successfully",
        });
      } else {
        const { data: newProject, error } = await supabase
          .from('projects')
          .insert([projectData])
          .select()
          .single();

        if (error) throw error;
        projectId = newProject.id;

        // Add team members for new project
        if (selectedMembers.length > 0) {
          const memberInserts = selectedMembers.map(userId => ({
            project_id: projectId,
            user_id: userId,
            role: 'developer'
          }));

          const { error: memberError } = await supabase
            .from('project_members')
            .insert(memberInserts);

          if (memberError) throw memberError;
        }
        
        toast({
          title: "Success",
          description: "Project created successfully",
        });
      }

      setShowAddDialog(false);
      setEditingProject(null);
      resetForm();
      setSelectedMembers([]);
      fetchProjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'planning',
      start_date: '',
      end_date: '',
      budget: '',
      estimated_hours: '',
      client_id: '',
      project_manager_id: ''
    });
  };

  const handleEdit = async (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      budget: project.budget?.toString() || '',
      estimated_hours: project.estimated_hours?.toString() || '',
      client_id: project.client_id || '',
      project_manager_id: project.project_manager_id || ''
    });

    // Load existing team members
    if (project.id) {
      try {
        const { data: members } = await supabase
          .from('project_members')
          .select('user_id')
          .eq('project_id', project.id);
        
        setSelectedMembers(members?.map(m => m.user_id) || []);
      } catch (error) {
        console.error('Error loading team members:', error);
        setSelectedMembers([]);
      }
    }

    setShowAddDialog(true);
  };

  const handleDelete = async (project: Project) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      
      fetchProjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'on_hold': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Project Management</h1>
          <p className="text-muted-foreground">Manage your projects and track progress</p>
        </div>
        {canManageProjects && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingProject(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Edit Project' : 'Add New Project'}</DialogTitle>
                <DialogDescription>
                  {editingProject ? 'Update project information' : 'Create a new project for your team'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Project Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="col-span-3"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="client_id" className="text-right">Client</Label>
                    <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="project_manager_id" className="text-right">Project Manager</Label>
                    <Select value={formData.project_manager_id} onValueChange={(value) => setFormData({ ...formData, project_manager_id: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a project manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.first_name} {manager.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="start_date" className="text-right">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="end_date" className="text-right">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="budget" className="text-right">Budget</Label>
                    <Input
                      id="budget"
                      type="number"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="col-span-3"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="estimated_hours" className="text-right">Estimated Hours</Label>
                    <Input
                      id="estimated_hours"
                      type="number"
                      value={formData.estimated_hours}
                      onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  
                  {/* Team Member Selection */}
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right mt-2">Team Members</Label>
                    <div className="col-span-3">
                      <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
                        {allUsers.map((user) => (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`member-${user.id}`}
                              checked={selectedMembers.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMembers([...selectedMembers, user.id]);
                                } else {
                                  setSelectedMembers(selectedMembers.filter(id => id !== user.id));
                                }
                              }}
                            />
                            <Label 
                              htmlFor={`member-${user.id}`} 
                              className="text-sm cursor-pointer"
                            >
                              {user.first_name} {user.last_name} ({user.role})
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Select team members to assign to this project
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">{editingProject ? 'Update' : 'Create'} Project</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <CardDescription className="mt-1">
                  {project.clients?.name && (
                    <span className="text-sm">Client: {project.clients.name}</span>
                  )}
                </CardDescription>
              </div>
              {canManageProjects && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(project)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(project)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className={`${getStatusColor(project.status)}`}>
                  {project.status.replace('_', ' ')}
                </Badge>
                {project.profiles && (
                  <span className="text-sm text-muted-foreground">
                    PM: {project.profiles.first_name} {project.profiles.last_name}
                  </span>
                )}
              </div>
              
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}

              {/* Team Members */}
              {project.project_members && project.project_members.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Team Members</span>
                  </div>
                  <div className="flex -space-x-2">
                    {project.project_members.slice(0, 5).map((member, index) => (
                      <Avatar key={index} className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={member.profiles.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {member.profiles.first_name[0]}{member.profiles.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {project.project_members.length > 5 && (
                      <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">+{project.project_members.length - 5}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                {project.budget && (
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>${project.budget.toLocaleString()}</span>
                  </div>
                )}
                {project.estimated_hours && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>{project.estimated_hours}h</span>
                  </div>
                )}
                {project.start_date && (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>{new Date(project.start_date).toLocaleDateString()}</span>
                  </div>
                )}
                {project.actual_hours !== undefined && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>{project.actual_hours}h logged</span>
                  </div>
                )}
              </div>

              {/* Task Progress */}
              {project.task_stats && project.task_stats.total_tasks > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span>Tasks Progress</span>
                    </div>
                    <span>{project.task_stats.completed_tasks}/{project.task_stats.total_tasks} completed</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all" 
                      style={{ width: `${(project.task_stats.completed_tasks / project.task_stats.total_tasks) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Time Progress */}
              {project.estimated_hours && project.actual_hours !== undefined && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>Time Progress</span>
                    </div>
                    <span>{Math.round((project.actual_hours / project.estimated_hours) * 100)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ width: `${Math.min((project.actual_hours / project.estimated_hours) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No projects found</p>
        </div>
      )}
    </div>
  );
}