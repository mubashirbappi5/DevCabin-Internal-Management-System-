import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Settings, Edit3, CheckCircle, XCircle, Clock, Save } from 'lucide-react';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: string;
  attendance_status: 'present' | 'absent' | 'leave' | 'not_marked';
  check_in_time?: string;
  notes?: string;
  screenshot_url?: string;
}

interface EditAttendanceData {
  status: string;
  check_in_time: string;
  notes: string;
  screenshot_url: string;
}

const AdminAttendanceManager = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editData, setEditData] = useState<EditAttendanceData>({
    status: '',
    check_in_time: '',
    notes: '',
    screenshot_url: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only show to admins and project managers
  if (!profile || !['admin', 'project_manager'].includes(profile.role)) {
    return null;
  }

  useEffect(() => {
    fetchTeamAttendance();
  }, []);

  const fetchTeamAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch all active team members
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role')
        .eq('is_active', true);

      if (membersError) throw membersError;

      // Fetch today's attendance for all members
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('daily_attendance')
        .select('user_id, status, check_in_time, notes, screenshot_url')
        .eq('date', today);

      if (attendanceError) throw attendanceError;

      // Check for leave applications for today
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_applications')
        .select('user_id')
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today);

      if (leaveError) throw leaveError;

      // Create attendance map
      const attendanceMap = new Map();
      attendanceData?.forEach(record => {
        attendanceMap.set(record.user_id, record);
      });

      // Create leave set
      const leaveSet = new Set(leaveData?.map(leave => leave.user_id) || []);

      // Combine data
      const teamWithAttendance: TeamMember[] = members?.map(member => {
        const attendance = attendanceMap.get(member.id);
        let status: TeamMember['attendance_status'] = 'not_marked';

        if (leaveSet.has(member.id)) {
          status = 'leave';
        } else if (attendance) {
          status = attendance.status as TeamMember['attendance_status'];
        }

        return {
          ...member,
          attendance_status: status,
          check_in_time: attendance?.check_in_time,
          notes: attendance?.notes,
          screenshot_url: attendance?.screenshot_url,
        };
      }) || [];

      setTeamMembers(teamWithAttendance);
    } catch (error) {
      console.error('Error fetching team attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAttendance = (member: TeamMember) => {
    setEditingMember(member);
    setEditData({
      status: member.attendance_status === 'not_marked' ? 'present' : member.attendance_status,
      check_in_time: member.check_in_time ? new Date(member.check_in_time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      notes: member.notes || '',
      screenshot_url: member.screenshot_url || '',
    });
  };

  const handleSaveAttendance = async () => {
    if (!editingMember) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('daily_attendance')
        .upsert({
          user_id: editingMember.id,
          date: today,
          status: editData.status,
          check_in_time: editData.status === 'present' ? editData.check_in_time : null,
          notes: editData.notes || null,
          screenshot_url: editData.screenshot_url || null,
        }, {
          onConflict: 'user_id,date'
        });

      if (error) throw error;

      toast({
        title: "Attendance updated",
        description: `${editingMember.first_name} ${editingMember.last_name}'s attendance has been updated.`,
      });

      setEditingMember(null);
      fetchTeamAttendance();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast({
        title: "Error",
        description: "Failed to update attendance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'leave':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'not_marked':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'leave':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'not_marked':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Present';
      case 'absent': return 'Absent';
      case 'leave': return 'On Leave';
      case 'not_marked': return 'Not Marked';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Admin Attendance Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Admin Attendance Manager
        </CardTitle>
        <CardDescription>
          Edit and manage attendance for all team members
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback>
                    {member.first_name[0]}{member.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {member.first_name} {member.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {member.role.replace('_', ' ')}
                  </p>
                  {member.check_in_time && (
                    <p className="text-xs text-muted-foreground">
                      Check-in: {new Date(member.check_in_time).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(member.attendance_status)}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(member.attendance_status)}
                    {getStatusText(member.attendance_status)}
                  </span>
                </Badge>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditAttendance(member)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Edit Attendance</DialogTitle>
                      <DialogDescription>
                        Update attendance for {member.first_name} {member.last_name}
                      </DialogDescription>
                    </DialogHeader>
                    
                    {editingMember?.id === member.id && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select value={editData.status} onValueChange={(value) => setEditData({...editData, status: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="leave">On Leave</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {editData.status === 'present' && (
                          <div>
                            <Label htmlFor="check_in_time">Check-in Time</Label>
                            <Input
                              id="check_in_time"
                              type="datetime-local"
                              value={editData.check_in_time}
                              onChange={(e) => setEditData({...editData, check_in_time: e.target.value})}
                            />
                          </div>
                        )}

                        <div>
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            value={editData.notes}
                            onChange={(e) => setEditData({...editData, notes: e.target.value})}
                            placeholder="Add any notes..."
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label htmlFor="screenshot_url">Screenshot URL</Label>
                          <Input
                            id="screenshot_url"
                            value={editData.screenshot_url}
                            onChange={(e) => setEditData({...editData, screenshot_url: e.target.value})}
                            placeholder="Optional screenshot URL..."
                          />
                        </div>

                        <Button 
                          onClick={handleSaveAttendance} 
                          disabled={isSubmitting}
                          className="w-full"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAttendanceManager;