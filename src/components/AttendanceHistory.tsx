import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'leave';
  screenshot_url?: string;
  check_in_time?: string;
  notes?: string;
}

const AttendanceHistory = () => {
  const { profile } = useAuth();
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [profile?.id]);

  const fetchAttendanceHistory = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('user_id', profile.id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setAttendanceHistory(data as AttendanceRecord[] || []);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
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
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance History
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
          <Calendar className="h-5 w-5" />
          Attendance History
        </CardTitle>
        <CardDescription>
          Your attendance records for the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        {attendanceHistory.length > 0 ? (
          <div className="space-y-3">
            {attendanceHistory.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {new Date(record.date).toLocaleDateString()}
                    </span>
                    <Badge className={getStatusColor(record.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(record.status)}
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </Badge>
                  </div>
                  
                  {record.check_in_time && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Check-in: {new Date(record.check_in_time).toLocaleTimeString()}
                    </p>
                  )}
                  
                  {record.notes && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Notes: {record.notes}
                    </p>
                  )}
                </div>
                
                {record.screenshot_url && (
                  <div className="ml-4">
                    <img 
                      src={record.screenshot_url} 
                      alt="Attendance screenshot" 
                      className="w-16 h-16 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No attendance records found.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceHistory;