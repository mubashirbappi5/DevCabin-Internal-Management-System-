-- Create daily attendance table
CREATE TABLE public.daily_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'absent', -- 'present', 'absent', 'leave'
  screenshot_url TEXT,
  check_in_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create leave applications table
CREATE TABLE public.leave_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_attendance
CREATE POLICY "Users can view their own attendance and admins can view all"
ON public.daily_attendance
FOR SELECT
USING (
  user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'project_manager')
  )
);

CREATE POLICY "Users can mark their own attendance"
ON public.daily_attendance
FOR INSERT
WITH CHECK (
  user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their own attendance"
ON public.daily_attendance
FOR UPDATE
USING (
  user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Create policies for leave_applications
CREATE POLICY "Users can view their own leave applications and admins can view all"
ON public.leave_applications
FOR SELECT
USING (
  user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'project_manager')
  )
);

CREATE POLICY "Users can create their own leave applications"
ON public.leave_applications
FOR INSERT
WITH CHECK (
  user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their own leave applications"
ON public.leave_applications
FOR UPDATE
USING (
  user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can approve/reject leave applications"
ON public.leave_applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'project_manager')
  )
);

-- Create storage bucket for attendance screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('attendance-screenshots', 'attendance-screenshots', true);

-- Create storage policies for attendance screenshots
CREATE POLICY "Users can view attendance screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'attendance-screenshots');

CREATE POLICY "Users can upload their own attendance screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'attendance-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own attendance screenshots"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'attendance-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create triggers for updating timestamps
CREATE TRIGGER update_daily_attendance_updated_at
BEFORE UPDATE ON public.daily_attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_applications_updated_at
BEFORE UPDATE ON public.leave_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();