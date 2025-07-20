import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, CheckCircle, XCircle, Clock, UserMinus } from 'lucide-react';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: string;
  attendance_status: 'present' | 'absent' | 'leave' | 'not_marked';
  check_in_time?: string;
}

interface AttendanceStats {
  totalMembers: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  notMarkedCount: number;
}

const TeamAttendanceOverview = () => {
  const { profile } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalMembers: 0,
    presentCount: 0,
    absentCount: 0,
    leaveCount: 0,
    notMarkedCount: 0,
  });
  const [loading, setLoading] = useState(true);

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
        .select('user_id, status, check_in_time')
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
        attendanceMap.set(record.user_id, {
          status: record.status,
          check_in_time: record.check_in_time,
        });
      });

      // Create leave map
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
        };
      }) || [];

      // Calculate stats
      const totalMembers = teamWithAttendance.length;
      const presentCount = teamWithAttendance.filter(m => m.attendance_status === 'present').length;
      const absentCount = teamWithAttendance.filter(m => m.attendance_status === 'absent').length;
      const leaveCount = teamWithAttendance.filter(m => m.attendance_status === 'leave').length;
      const notMarkedCount = teamWithAttendance.filter(m => m.attendance_status === 'not_marked').length;

      setTeamMembers(teamWithAttendance);
      setStats({
        totalMembers,
        presentCount,
        absentCount,
        leaveCount,
        notMarkedCount,
      });
    } catch (error) {
      console.error('Error fetching team attendance:', error);
    } finally {
      setLoading(false);
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

  // Only show to admins and project managers
  if (!profile || !['admin', 'project_manager'].includes(profile.role)) {
    return null;
  }

  // Auto-mark absent function (for demo purposes)
  const handleAutoMarkAbsent = async () => {
    try {
      const { error } = await supabase.rpc('auto_mark_absent_members');
      if (error) throw error;
      
      // Refresh the data after auto-marking
      fetchTeamAttendance();
    } catch (error) {
      console.error('Error auto-marking absent members:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Attendance Overview
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
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Attendance Overview
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAutoMarkAbsent}
            className="ml-auto"
          >
            <UserMinus className="h-4 w-4 mr-2" />
            Auto Mark Absent
          </Button>
        </CardTitle>
        <CardDescription>
          Today's attendance status for all team members
          <br />
          <span className="text-xs text-muted-foreground">
            Working Hours: 8:00 AM - 11:00 PM | Auto-absent after 11:00 PM
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.presentCount}</div>
            <div className="text-sm text-green-600">Present</div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.absentCount}</div>
            <div className="text-sm text-red-600">Absent</div>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.leaveCount}</div>
            <div className="text-sm text-blue-600">On Leave</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{stats.notMarkedCount}</div>
            <div className="text-sm text-gray-600">Not Marked</div>
          </div>
        </div>

        {/* Team Members List */}
        <div className="space-y-3">
          <h4 className="font-medium">Team Members ({stats.totalMembers})</h4>
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
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
              <Badge className={getStatusColor(member.attendance_status)}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(member.attendance_status)}
                  {getStatusText(member.attendance_status)}
                </span>
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamAttendanceOverview;