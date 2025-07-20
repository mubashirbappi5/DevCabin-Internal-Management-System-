import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { History, Eye, Calendar, Clock, UserCheck, UserX } from 'lucide-react';

interface LeaveApplication {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  approved_at?: string;
  created_at: string;
  approved_by?: string;
  approver?: {
    first_name: string;
    last_name: string;
  };
}

const MyLeaveHistory = () => {
  const { profile } = useAuth();
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<LeaveApplication | null>(null);

  useEffect(() => {
    fetchMyApplications();
  }, [profile?.id]);

  const fetchMyApplications = async () => {
    if (!profile?.id) return;

    try {
      // First get leave applications
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_applications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (leaveError) throw leaveError;

      // Then get approver profiles
      const approverIds = leaveData?.filter(app => app.approved_by).map(app => app.approved_by) || [];
      
      let profilesData = [];
      if (approverIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', approverIds);

        if (profilesError) throw profilesError;
        profilesData = profiles || [];
      }

      // Combine the data
      const applicationsWithApprovers = leaveData?.map(app => {
        const approverProfile = profilesData.find(p => p.id === app.approved_by);
        
        return {
          ...app,
          approver: approverProfile,
        };
      }) || [];

      setApplications(applicationsWithApprovers);
    } catch (error) {
      console.error('Error fetching my leave applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <UserCheck className="h-4 w-4" />;
      case 'rejected':
        return <UserX className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            My Leave History
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
          <History className="h-5 w-5" />
          My Leave History
        </CardTitle>
        <CardDescription>
          View all your leave applications and their status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No leave applications found
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {new Date(app.start_date).toLocaleDateString()} - {new Date(app.end_date).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({calculateDays(app.start_date, app.end_date)} days)
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {app.reason}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied: {new Date(app.created_at).toLocaleDateString()}
                  </p>
                  {app.approver && app.approved_at && (
                    <p className="text-xs text-muted-foreground">
                      {app.status} by {app.approver.first_name} {app.approver.last_name} on {new Date(app.approved_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(app.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(app.status)}
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </Badge>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedApp(app)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Leave Application Details</DialogTitle>
                        <DialogDescription>
                          Details of your leave application
                        </DialogDescription>
                      </DialogHeader>
                      
                      {selectedApp?.id === app.id && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium">Start Date</h4>
                              <p className="text-sm text-muted-foreground">{new Date(selectedApp.start_date).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">End Date</h4>
                              <p className="text-sm text-muted-foreground">{new Date(selectedApp.end_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium">Duration</h4>
                            <p className="text-sm text-muted-foreground">{calculateDays(selectedApp.start_date, selectedApp.end_date)} days</p>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium">Reason</h4>
                            <div className="mt-1 p-2 bg-muted rounded text-sm">
                              {selectedApp.reason}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium">Status</h4>
                            <Badge className={getStatusColor(selectedApp.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(selectedApp.status)}
                                {selectedApp.status.charAt(0).toUpperCase() + selectedApp.status.slice(1)}
                              </span>
                            </Badge>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium">Applied On</h4>
                            <p className="text-sm text-muted-foreground">{new Date(selectedApp.created_at).toLocaleString()}</p>
                          </div>
                          
                          {selectedApp.approver && selectedApp.approved_at && (
                            <div>
                              <h4 className="text-sm font-medium">Processed By</h4>
                              <p className="text-sm text-muted-foreground">
                                {selectedApp.approver.first_name} {selectedApp.approver.last_name} on {new Date(selectedApp.approved_at).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyLeaveHistory;