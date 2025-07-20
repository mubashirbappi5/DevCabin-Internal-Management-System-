import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

interface MonthlyStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  attendanceRate: number;
}

const MyMonthlyStats = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<MonthlyStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    attendanceRate: 0,
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchMonthlyStats();
    }
  }, [profile?.id, selectedMonth]);

  const fetchMonthlyStats = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      // Get attendance data for the month
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('daily_attendance')
        .select('date, status')
        .eq('user_id', profile.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (attendanceError) throw attendanceError;

      // Get approved leave data for the month
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_applications')
        .select('start_date, end_date')
        .eq('user_id', profile.id)
        .eq('status', 'approved')
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

      if (leaveError) throw leaveError;

      // Calculate total working days in the month (excluding weekends)
      const totalWorkingDays = getWorkingDaysInMonth(parseInt(year), parseInt(month) - 1);

      // Create a set of all dates in the month
      const datesInMonth = new Set<string>();
      for (let i = 1; i <= new Date(parseInt(year), parseInt(month), 0).getDate(); i++) {
        const date = new Date(parseInt(year), parseInt(month) - 1, i);
        // Only include weekdays
        if (date.getDay() !== 0 && date.getDay() !== 6) {
          datesInMonth.add(`${year}-${month.padStart(2, '0')}-${String(i).padStart(2, '0')}`);
        }
      }

      // Get leave dates
      const leaveDates = new Set<string>();
      leaveData?.forEach(leave => {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          if (datesInMonth.has(dateStr)) {
            leaveDates.add(dateStr);
          }
        }
      });

      // Count attendance
      const attendanceMap = new Map();
      attendanceData?.forEach(record => {
        attendanceMap.set(record.date, record.status);
      });

      let presentDays = 0;
      let absentDays = 0;
      let leaveDaysCount = leaveDates.size;

      datesInMonth.forEach(date => {
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

      setStats({
        totalDays: totalWorkingDays,
        presentDays,
        absentDays,
        leaveDays: leaveDaysCount,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
      });
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
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
      if (dayOfWeek !== 5 ) {
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            My Monthly Stats
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
          <BarChart3 className="h-5 w-5" />
          My Monthly Stats
        </CardTitle>
        <CardDescription>
          Your attendance statistics for the selected month
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.totalDays}</div>
            <div className="text-sm text-blue-600">Total Days</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.presentDays}</div>
            <div className="text-sm text-green-600">Present</div>
          </div>
          
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.absentDays}</div>
            <div className="text-sm text-red-600">Absent</div>
          </div>
          
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.leaveDays}</div>
            <div className="text-sm text-yellow-600">On Leave</div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Attendance Rate</span>
          </div>
          <div className="flex items-center gap-2">
            {stats.attendanceRate >= 90 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : stats.attendanceRate >= 75 ? (
              <TrendingUp className="h-4 w-4 text-yellow-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <Badge 
              variant={stats.attendanceRate >= 90 ? "default" : stats.attendanceRate >= 75 ? "secondary" : "destructive"}
            >
              {stats.attendanceRate}%
            </Badge>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          * Attendance rate includes present days and approved leave days
        </div>
      </CardContent>
    </Card>
  );
};

export default MyMonthlyStats;