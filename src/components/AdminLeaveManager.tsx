import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, UserX, Clock, Calendar, Eye } from 'lucide-react';

interface LeaveApplication {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
    role: string;
  };
  approver?: {
    first_name: string;
    last_name: string;
  };
}

const AdminLeaveManager = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<LeaveApplication | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Only show to admins and project managers
  if (!profile || !['admin', 'project_manager'].includes(profile.role)) {
    return null;
  }

  useEffect(() => {
    fetchLeaveApplications();
  }, []);

  const fetchLeaveApplications = async () => {
    try {
      // First get leave applications
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (leaveError) throw leaveError;

      // Then get user profiles for each application
      const userIds = leaveData?.map(app => app.user_id) || [];
      const approverIds = leaveData?.filter(app => app.approved_by).map(app => app.approved_by) || [];
      const allUserIds = [...new Set([...userIds, ...approverIds])];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role')
        .in('id', allUserIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const applicationsWithProfiles = leaveData?.map(app => {
        const userProfile = profilesData?.find(p => p.id === app.user_id);
        const approverProfile = profilesData?.find(p => p.id === app.approved_by);
        
        return {
          ...app,
          profiles: userProfile,
          approver: approverProfile,
        };
      }) || [];

      setApplications(applicationsWithProfiles);
    } catch (error) {
      console.error('Error fetching leave applications:', error);
    } finally {
      setLoading(false);
    }
  };

    const handleApproveReject = async (applicationId: string, status: 'approved' | 'rejected') => {
    if (!profile?.id) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('leave_applications')
        .update({
          status,
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: `Application ${status}`,
        description: `The leave application has been ${status}.`,
      });

      setSelectedApp(null);
      fetchLeaveApplications();
    } catch (error) {
      console.error('Error updating leave application:', error);
      toast({
        title: "Error",
        description: "Failed to update leave application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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
            <Calendar className="h-5 w-5" />
            Leave Applications Manager
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
          Leave Applications Manager
        </CardTitle>
        <CardDescription>
          Review and manage team leave applications
        </CardDescription>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No leave applications found
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {app.profiles && (
                    <>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={app.profiles.avatar_url} />
                        <AvatarFallback>
                          {app.profiles.first_name[0]}{app.profiles.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {app.profiles.first_name} {app.profiles.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {app.profiles.role.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(app.start_date).toLocaleDateString()} - {new Date(app.end_date).toLocaleDateString()}
                          <span className="ml-2">({calculateDays(app.start_date, app.end_date)} days)</span>
                        </p>
                        {app.approver && (
                          <p className="text-xs text-muted-foreground">
                            {app.status} by {app.approver.first_name} {app.approver.last_name}
                          </p>
                        )}
                      </div>
                    </>
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
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Leave Application Details</DialogTitle>
                        <DialogDescription>
                          Review and manage this leave application
                        </DialogDescription>
                      </DialogHeader>
                      
                      {selectedApp?.id === app.id && (
                        <div className="space-y-4">
                          <div>
                            <Label>Employee</Label>
                            <p className="text-sm font-medium">
                              {selectedApp.profiles?.first_name} {selectedApp.profiles?.last_name}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Start Date</Label>
                              <p className="text-sm">{new Date(selectedApp.start_date).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <Label>End Date</Label>
                              <p className="text-sm">{new Date(selectedApp.end_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          <div>
                            <Label>Duration</Label>
                            <p className="text-sm">{calculateDays(selectedApp.start_date, selectedApp.end_date)} days</p>
                          </div>
                          
                          <div>
                            <Label>Reason</Label>
                            <div className="mt-1 p-2 bg-muted rounded text-sm">
                              {selectedApp.reason}
                            </div>
                          </div>
                          
                          <div>
                            <Label>Status</Label>
                            <Badge className={getStatusColor(selectedApp.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(selectedApp.status)}
                                {selectedApp.status.charAt(0).toUpperCase() + selectedApp.status.slice(1)}
                              </span>
                            </Badge>
                          </div>
                          
                          <div>
                            <Label>Applied On</Label>
                            <p className="text-sm">{new Date(selectedApp.created_at).toLocaleString()}</p>
                          </div>

                          {selectedApp.status === 'pending' && (
                            <div className="flex gap-2 pt-4">
                              <Button 
                                onClick={() => handleApproveReject(selectedApp.id, 'approved')}
                                disabled={isProcessing}
                                className="flex-1"
                                variant="default"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                {isProcessing ? 'Processing...' : 'Approve'}
                              </Button>
                              <Button 
                                onClick={() => handleApproveReject(selectedApp.id, 'rejected')}
                                disabled={isProcessing}
                                className="flex-1"
                                variant="destructive"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                {isProcessing ? 'Processing...' : 'Reject'}
                              </Button>
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

export default AdminLeaveManager;