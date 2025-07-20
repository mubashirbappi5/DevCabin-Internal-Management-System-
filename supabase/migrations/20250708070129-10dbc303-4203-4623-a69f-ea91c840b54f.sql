-- Create work submissions table
CREATE TABLE public.work_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  link_url TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_by UUID NOT NULL,
  project_id UUID,
  task_id UUID,
  review_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT work_submissions_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'revision_needed'))
);

-- Enable Row Level Security
ALTER TABLE public.work_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own submissions and all if admin/PM" 
ON public.work_submissions 
FOR SELECT 
USING (
  submitted_by = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'project_manager')
  )
);

CREATE POLICY "Users can create their own submissions" 
ON public.work_submissions 
FOR INSERT 
WITH CHECK (submitted_by = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own submissions or admins can review" 
ON public.work_submissions 
FOR UPDATE 
USING (
  submitted_by = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'project_manager')
  )
);

-- Create storage bucket for work screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('work-screenshots', 'work-screenshots', true);

-- Create storage policies
CREATE POLICY "Users can upload their work screenshots" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'work-screenshots' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Work screenshots are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'work-screenshots');

CREATE POLICY "Users can update their own work screenshots" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'work-screenshots' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_work_submissions_updated_at
BEFORE UPDATE ON public.work_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraints
ALTER TABLE public.work_submissions 
ADD CONSTRAINT work_submissions_submitted_by_fkey 
FOREIGN KEY (submitted_by) REFERENCES public.profiles(id);

ALTER TABLE public.work_submissions 
ADD CONSTRAINT work_submissions_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE public.work_submissions 
ADD CONSTRAINT work_submissions_task_id_fkey 
FOREIGN KEY (task_id) REFERENCES public.tasks(id);

ALTER TABLE public.work_submissions 
ADD CONSTRAINT work_submissions_reviewed_by_fkey 
FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);