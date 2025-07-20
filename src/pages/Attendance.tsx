import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import AttendanceCard from '@/components/AttendanceCard';
import AttendanceHistory from '@/components/AttendanceHistory';
import TeamAttendanceOverview from '@/components/TeamAttendanceOverview';
import AdminAttendanceManager from '@/components/AdminAttendanceManager';
import LeaveApplicationForm from '@/components/LeaveApplicationForm';
import AdminLeaveManager from '@/components/AdminLeaveManager';
import MyLeaveHistory from '@/components/MyLeaveHistory';
import MyMonthlyStats from '@/components/MyMonthlyStats';
import AdminMonthlyStats from '@/components/AdminMonthlyStats';

interface TodayAttendance {
  status: 'present' | 'absent' | 'leave';
  screenshot_url?: string;
  check_in_time?: string;
  notes?: string;
}

const Attendance = () => {
  const { profile } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTodayAttendance = async () => {
    if (!profile?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('user_id', profile.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      
      setTodayAttendance(data as TodayAttendance);
    } catch (error) {
      console.error('Error fetching today attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
  }, [profile?.id]);

  const handleAttendanceUpdate = () => {
    fetchTodayAttendance();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">
            Mark your daily attendance with a screenshot
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Team Overview - Only visible to admins/PMs */}
        <TeamAttendanceOverview />
        
        {/* Admin Monthly Stats - Only visible to admins/PMs */}
        <AdminMonthlyStats />
        
        {/* Admin Attendance Manager - Only visible to admins/PMs */}
        <AdminAttendanceManager />
        
        {/* Admin Leave Manager - Only visible to admins/PMs */}
        <AdminLeaveManager />
        
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <AttendanceCard 
              todayAttendance={todayAttendance}
              onAttendanceUpdate={handleAttendanceUpdate}
            />
            <LeaveApplicationForm />
          </div>
          <div className="space-y-6">
            <AttendanceHistory />
            <MyLeaveHistory />
          </div>
          <div className="space-y-6">
            <MyMonthlyStats />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;