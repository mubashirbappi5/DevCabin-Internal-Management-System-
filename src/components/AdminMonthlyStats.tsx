import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Users, TrendingUp, TrendingDown } from 'lucide-react';

interface MemberStats {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  attendanceRate: number;
}

interface AdminMonthlyStatsProps {
  refreshKey?: number;
}

const AdminMonthlyStats = ({ refreshKey = 0 }: AdminMonthlyStatsProps = {}) => {
  const { profile } = useAuth();
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllMemberStats();
  }, [selectedMonth, refreshKey]);

  // Only show to admins and project managers
  if (!profile || !['admin', 'project_manager'].includes(profile.role)) {
    return null;
  }

  const fetchAllMemberStats = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      // Get all active members
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role')
        .eq('is_active', true);

      if (membersError) throw membersError;

      // Get all attendance data for the month
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('daily_attendance')
        .select('user_id, date, status')
        .gte('date', startDate)
        .lte('date', endDate);

      if (attendanceError) throw attendanceError;

      // Get all approved leave data for the month
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_applications')
        .select('user_id, start_date, end_date')
        .eq('status', 'approved')
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

      if (leaveError) throw leaveError;

      // Calculate total working days in the month
      const totalWorkingDays = getWorkingDaysInMonth(parseInt(year), parseInt(month) - 1);

      // Create a set of all working dates in the month
      const workingDatesInMonth = new Set<string>();
      for (let i = 1; i <= new Date(parseInt(year), parseInt(month), 0).getDate(); i++) {
        const date = new Date(parseInt(year), parseInt(month) - 1, i);
        // Only include weekdays
        if (date.getDay() !== 5) {
          workingDatesInMonth.add(`${year}-${month.padStart(2, '0')}-${String(i).padStart(2, '0')}`);
        }
      }

      const stats: MemberStats[] = members?.map(member => {
        // Get member's attendance
        const memberAttendance = attendanceData?.filter(a => a.user_id === member.id) || [];
        const attendanceMap = new Map(memberAttendance.map(a => [a.date, a.status]));

        // Get member's leave dates
        const memberLeaves = leaveData?.filter(l => l.user_id === member.id) || [];
        const leaveDates = new Set<string>();
        
        memberLeaves.forEach(leave => {
          const start = new Date(leave.start_date);
          const end = new Date(leave.end_date);
          
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if (workingDatesInMonth.has(dateStr)) {
              leaveDates.add(dateStr);
            }
          }
        });

        let presentDays = 0;
        let absentDays = 0;
        const leaveDaysCount = leaveDates.size;

        workingDatesInMonth.forEach(date => {
          if (leaveDates.has(date)) {
            // Already counted in leaveDaysCount
            return;
          }
          
          const status = attendanceMap.get(date);
          if (status === 'present') {
            presentDays++;
          } else if (status === 'absent') {
            absentDays++;
          } else {
            // Not marked yet, count as absent if date has passed
            const dateObj = new Date(date);
            const today = new Date();
            if (dateObj < today) {
              absentDays++;
            }
          }
        });

        const attendanceRate = totalWorkingDays > 0 ? 
          ((presentDays + leaveDaysCount) / totalWorkingDays) * 100 : 0;

        return {
          ...member,
          totalDays: totalWorkingDays,
          presentDays,
          absentDays,
          leaveDays: leaveDaysCount,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
        };
      }) || [];

      // Sort by attendance rate (descending)
      stats.sort((a, b) => b.attendanceRate - a.attendanceRate);
      setMemberStats(stats);
    } catch (error) {
      console.error('Error fetching team monthly stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkingDaysInMonth = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dayOfWeek = date.getDay();
      // Exclude Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    
    return workingDays;
  };

  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    
    return options;
  };

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceRateBadge = (rate: number) => {
    if (rate >= 90) return 'default';
    if (rate >= 75) return 'secondary';
    return 'destructive';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Team Monthly Stats
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

  const teamAverages = {
    totalMembers: memberStats.length,
    averageAttendance: memberStats.length > 0 ? 
      Math.round((memberStats.reduce((sum, m) => sum + m.attendanceRate, 0) / memberStats.length) * 10) / 10 : 0,
    totalPresent: memberStats.reduce((sum, m) => sum + m.presentDays, 0),
    totalAbsent: memberStats.reduce((sum, m) => sum + m.absentDays, 0),
    totalLeave: memberStats.reduce((sum, m) => sum + m.leaveDays, 0),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Team Monthly Stats
        </CardTitle>
        <CardDescription>
          Attendance statistics for all team members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {generateMonthOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Team Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{teamAverages.totalMembers}</div>
            <div className="text-sm text-muted-foreground">Total Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{teamAverages.totalPresent}</div>
            <div className="text-sm text-muted-foreground">Total Present Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{teamAverages.totalAbsent}</div>
            <div className="text-sm text-muted-foreground">Total Absent Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{teamAverages.totalLeave}</div>
            <div className="text-sm text-muted-foreground">Total Leave Days</div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-medium">Team Average Attendance</span>
          </div>
          <div className="flex items-center gap-2">
            {teamAverages.averageAttendance >= 90 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : teamAverages.averageAttendance >= 75 ? (
              <TrendingUp className="h-4 w-4 text-yellow-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <Badge 
              variant={teamAverages.averageAttendance >= 90 ? "default" : teamAverages.averageAttendance >= 75 ? "secondary" : "destructive"}
            >
              {teamAverages.averageAttendance}%
            </Badge>
          </div>
        </div>

        {/* Individual Member Stats */}
        <div>
          <h4 className="font-medium mb-3">Individual Member Statistics</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center">Absent</TableHead>
                <TableHead className="text-center">Leave</TableHead>
                <TableHead className="text-center">Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberStats.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback>
                          {member.first_name[0]}{member.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {member.role.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-green-600 font-medium">{member.presentDays}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-red-600 font-medium">{member.absentDays}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-yellow-600 font-medium">{member.leaveDays}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getAttendanceRateBadge(member.attendanceRate)}>
                      {member.attendanceRate}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminMonthlyStats;