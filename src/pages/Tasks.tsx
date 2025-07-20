import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, Clock, User, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import Countdown from '@/components/Countdown';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  project_id: string;
  assigned_to?: string;
  created_by: string;
  completed_at?: string;
  created_at: string;
  projects?: { name: string };
  assignee?: { first_name: string; last_name: string };
  creator?: { first_name: string; last_name: string };
}

interface Project {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

export default function Tasks() {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as 'todo' | 'in_progress' | 'review' | 'completed',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    due_date: '',
    estimated_hours: '',
    project_id: '',
    assigned_to: ''
  });

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchProfiles();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          projects (name),
          assignee:profiles!tasks_assigned_to_fkey (first_name, last_name),
          creator:profiles!tasks_created_by_fkey (first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('first_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const taskData = {
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        project_id: formData.project_id,
        assigned_to: formData.assigned_to || null,
        created_by: profile?.id || ''
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Task created successfully",
        });
      }

      setShowAddDialog(false);
      setEditingTask(null);
      resetForm();
      fetchTasks();
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
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      due_date: '',
      estimated_hours: '',
      project_id: '',
      assigned_to: ''
    });
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date || '',
      estimated_hours: task.estimated_hours?.toString() || '',
      project_id: task.project_id,
      assigned_to: task.assigned_to || ''
    });
    setShowAddDialog(true);
  };

  const handleStatusChange = async (task: Task, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
      
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (task: Task) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      
      fetchTasks();
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
      case 'todo': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filterTasks = (status?: string) => {
    if (!status || status === 'all') return tasks;
    return tasks.filter(task => task.status === status);
  };

  const getMyTasks = () => {
    return tasks.filter(task => task.assigned_to === profile?.id);
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
          <h1 className="text-3xl font-bold">Task Management</h1>
          <p className="text-muted-foreground">Manage and track your tasks across projects</p>
        </div>
        {isAdmin && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingTask(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Update task information' : 'Create a new task and assign it to team members'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">Task Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                  <Label htmlFor="project_id" className="text-right">Project</Label>
                  <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assigned_to" className="text-right">Assigned To</Label>
                  <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.first_name} {profile.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-4 items-center gap-4 col-span-1">
                    <Label htmlFor="status" className="text-right">Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 col-span-1">
                    <Label htmlFor="priority" className="text-right">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-4 items-center gap-4 col-span-1">
                    <Label htmlFor="due_date" className="text-right">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 col-span-1">
                    <Label htmlFor="estimated_hours" className="text-right">Est. Hours</Label>
                    <Input
                      id="estimated_hours"
                      type="number"
                      step="0.5"
                      value={formData.estimated_hours}
                      onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{editingTask ? 'Update' : 'Create'} Task</Button>
              </DialogFooter>
            </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="my">My Tasks</TabsTrigger>
          <TabsTrigger value="todo">To Do</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <TaskGrid tasks={filterTasks()} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
        </TabsContent>
        
        <TabsContent value="my" className="space-y-4">
          <TaskGrid tasks={getMyTasks()} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
        </TabsContent>
        
        <TabsContent value="todo" className="space-y-4">
          <TaskGrid tasks={filterTasks('todo')} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
        </TabsContent>
        
        <TabsContent value="in_progress" className="space-y-4">
          <TaskGrid tasks={filterTasks('in_progress')} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
        </TabsContent>
        
        <TabsContent value="review" className="space-y-4">
          <TaskGrid tasks={filterTasks('review')} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          <TaskGrid tasks={filterTasks('completed')} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
        </TabsContent>
      </Tabs>
    </div>
  );

  function TaskGrid({ 
    tasks, 
    onEdit, 
    onDelete, 
    onStatusChange 
  }: { 
    tasks: Task[], 
    onEdit: (task: Task) => void, 
    onDelete: (task: Task) => void, 
    onStatusChange: (task: Task, status: string) => void 
  }) {
    if (tasks.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tasks found</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <Card key={task.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start space-y-0 pb-2">
              <div className="flex-1">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <CardDescription className="mt-1">
                  {task.projects?.name && (
                    <span className="text-sm">Project: {task.projects.name}</span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(task)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className={`${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className={`${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </Badge>
              </div>
              
              {task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {task.description}
                </p>
              )}

              <div className="space-y-2 text-sm">
                {task.assignee && (
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{task.assignee.first_name} {task.assignee.last_name}</span>
                  </div>
                )}
                {task.due_date && (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                 {task.status === 'completed' ? (
      <span className="text-green-600 font-medium">Completed</span>
    ) : (
      <Countdown dueDate={task.due_date} />
    )}
                  </div>
                )}
                {task.estimated_hours && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{task.estimated_hours}h estimated</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {task.status !== 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusChange(task, 'completed')}
                    className="flex-1"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                )}
                <Select 
                  value={task.status} 
                  onValueChange={(value) => onStatusChange(task, value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
}