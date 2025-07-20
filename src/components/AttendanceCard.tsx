import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, CheckCircle, XCircle, Clock } from 'lucide-react';

interface AttendanceStatus {
  status: 'present' | 'absent' | 'leave';
  screenshot_url?: string;
  check_in_time?: string;
  notes?: string;
}

interface AttendanceCardProps {
  todayAttendance?: AttendanceStatus;
  onAttendanceUpdate: () => void;
}

const AttendanceCard = ({ todayAttendance, onAttendanceUpdate }: AttendanceCardProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setScreenshot(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive"
        });
      }
    }
  };

  const uploadScreenshot = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('attendance-screenshots')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('attendance-screenshots')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const markAttendance = async () => {
    if (!profile?.id) return;

    // Check working hours (8:00 AM to 11:00 PM)
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour < 8 || currentHour >= 23) {
      toast({
        title: "Outside working hours",
        description: "Attendance can only be marked between 8:00 AM and 11:00 PM.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let screenshotUrl = '';
      
      if (screenshot) {
        screenshotUrl = await uploadScreenshot(screenshot);
      }

      const status = screenshot ? 'present' : 'absent';
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('daily_attendance')
        .upsert({
          user_id: profile.id,
          date: today,
          status,
          screenshot_url: screenshotUrl || null,
          check_in_time: screenshot ? new Date().toISOString() : null,
          notes: notes || null,
        }, {
          onConflict: 'user_id,date'
        });

      if (error) throw error;

      toast({
        title: "Attendance marked",
        description: `You are marked as ${status} for today.`,
      });

      setScreenshot(null);
      setNotes('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      onAttendanceUpdate();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive"
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Daily Attendance
        </CardTitle>
        <CardDescription>
          Upload a screenshot to mark your attendance as present
          <br />
          <span className="text-xs text-muted-foreground">
            Working Hours: 8:00 AM - 11:00 PM daily
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {todayAttendance ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Today's Status:</span>
              <Badge className={getStatusColor(todayAttendance.status)}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(todayAttendance.status)}
                  {todayAttendance.status.charAt(0).toUpperCase() + todayAttendance.status.slice(1)}
                </span>
              </Badge>
            </div>
            
            {todayAttendance.check_in_time && (
              <div className="text-sm text-muted-foreground">
                Check-in: {new Date(todayAttendance.check_in_time).toLocaleTimeString()}
              </div>
            )}
            
            {todayAttendance.screenshot_url && (
              <div>
                <Label className="text-sm font-medium">Screenshot:</Label>
                <img 
                  src={todayAttendance.screenshot_url} 
                  alt="Attendance screenshot" 
                  className="mt-1 w-full max-w-xs rounded-lg border"
                />
              </div>
            )}
            
            {todayAttendance.notes && (
              <div>
                <Label className="text-sm font-medium">Notes:</Label>
                <p className="text-sm text-muted-foreground mt-1">{todayAttendance.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="screenshot" className="text-sm font-medium">
                Upload Screenshot (Required for Present status)
              </Label>
              <Input
                ref={fileInputRef}
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="mt-1"
              />
              {screenshot && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {screenshot.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={markAttendance}
                disabled={isSubmitting}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Marking Attendance...' : 'Mark Attendance'}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                {screenshot 
                  ? 'You will be marked as Present' 
                  : 'Without screenshot, you will be marked as Absent'
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceCard;