import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Send } from 'lucide-react';

const LeaveApplicationForm = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    // Validate dates
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      toast({
        title: "Invalid date",
        description: "Start date cannot be in the past.",
        variant: "destructive",
      });
      return;
    }

    if (end < start) {
      toast({
        title: "Invalid date range",
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.reason.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a reason for your leave application.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('leave_applications')
        .insert({
          user_id: profile.id,
          start_date: formData.startDate,
          end_date: formData.endDate,
          reason: formData.reason,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Leave application submitted",
        description: "Your leave application has been submitted for approval.",
      });

      // Reset form
      setFormData({
        startDate: '',
        endDate: '',
        reason: '',
      });
    } catch (error) {
      console.error('Error submitting leave application:', error);
      toast({
        title: "Error",
        description: "Failed to submit leave application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Apply for Leave
        </CardTitle>
        <CardDescription>
          Submit a leave application for admin approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
                min={formData.startDate || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason for Leave</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Please provide a detailed reason for your leave application..."
              required
              rows={4}
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Submitting...' : 'Submit Leave Application'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default LeaveApplicationForm;