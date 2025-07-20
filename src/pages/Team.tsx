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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Mail, Phone, Edit, Trash2 } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  phone?: string;
  role: 'admin' | 'project_manager' | 'developer' | 'designer' | 'client';
  hourly_rate?: number;
  working_hours_per_week?: number;
  is_active: boolean;
  created_at: string;
}

export default function Team() {
  const { isAdmin, isProjectManager } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'developer' as 'admin' | 'project_manager' | 'developer' | 'designer' | 'client',
    hourly_rate: '',
    working_hours_per_week: '40'
  });

  const canManageTeam = isAdmin || isProjectManager;

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch team members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProfile) {
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone,
            role: formData.role,
            hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
            working_hours_per_week: parseInt(formData.working_hours_per_week)
          })
          .eq('id', editingProfile.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Team member updated successfully",
        });
      } else {
        // For adding new members, you'd typically send an invitation
        // Since we can't directly create auth users, this would need a proper invitation system
        toast({
          title: "Info",
          description: "Team member invitation feature would be implemented here",
        });
      }

      setShowAddDialog(false);
      setEditingProfile(null);
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'developer' as 'admin' | 'project_manager' | 'developer' | 'designer' | 'client',
        hourly_rate: '',
        working_hours_per_week: '40'
      });
      fetchProfiles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone || '',
      role: profile.role,
      hourly_rate: profile.hourly_rate?.toString() || '',
      working_hours_per_week: profile.working_hours_per_week?.toString() || '40'
    });
    setShowAddDialog(true);
  };

  const toggleActiveStatus = async (profile: Profile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !profile.is_active })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Team member ${profile.is_active ? 'deactivated' : 'activated'} successfully`,
      });
      
      fetchProfiles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'project_manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'developer': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'designer': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'client': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Manage your team members and their roles</p>
        </div>
        {canManageTeam && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProfile ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
                <DialogDescription>
                  {editingProfile ? 'Update team member information' : 'Add a new team member to your organization'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="col-span-3"
                      disabled={!!editingProfile}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="first_name" className="text-right">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="last_name" className="text-right">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">Role</Label>
                    <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="developer">Developer</SelectItem>
                        <SelectItem value="designer">Designer</SelectItem>
                        <SelectItem value="project_manager">Project Manager</SelectItem>
                        {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="hourly_rate" className="text-right">Hourly Rate</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="hours" className="text-right">Hours/Week</Label>
                    <Input
                      id="hours"
                      type="number"
                      value={formData.working_hours_per_week}
                      onChange={(e) => setFormData({ ...formData, working_hours_per_week: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">{editingProfile ? 'Update' : 'Add'} Team Member</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => (
          <Card key={profile.id} className={`${!profile.is_active ? 'opacity-50' : ''}`}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback>
                  {profile.first_name[0]}{profile.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1 flex-1">
                <h3 className="font-semibold">{profile.first_name} {profile.last_name}</h3>
                <Badge variant="secondary" className={`text-xs ${getRoleColor(profile.role)}`}>
                  {profile.role.replace('_', ' ')}
                </Badge>
              </div>
              {canManageTeam && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(profile)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleActiveStatus(profile)}
                    className={profile.is_active ? 'text-red-600' : 'text-green-600'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="h-4 w-4 mr-2" />
                {profile.email}
              </div>
              {profile.phone && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 mr-2" />
                  {profile.phone}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-2">
                {profile.hourly_rate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Hourly Rate</p>
                    <p className="font-semibold">${profile.hourly_rate}/hr</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Hours/Week</p>
                  <p className="font-semibold">{profile.working_hours_per_week || 40}h</p>
                </div>
              </div>
              <div className="pt-2">
                <Badge variant={profile.is_active ? "default" : "secondary"}>
                  {profile.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {profiles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No team members found</p>
        </div>
      )}
    </div>
  );
}