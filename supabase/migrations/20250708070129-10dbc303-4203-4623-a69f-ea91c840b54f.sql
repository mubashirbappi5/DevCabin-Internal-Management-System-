-- Enable required extension for gen_random_uuid (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create work_submissions table
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
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT work_submissions_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'revision_needed'))
);

-- Enable Row Level Security
ALTER TABLE public.work_submissions ENABLE ROW LEVEL SECURITY;

-- SELECT policy: users can view their own submissions or all if admin/project_manager
CREATE POLICY "Users can view their own submissions and all if admin/PM" 
ON public.work_submissions 
FOR SELECT 
USING (
  submitted_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'project_manager')
  )
);

-- INSERT policy: users can create their own submissions only
CREATE POLICY "Users can create their own submissions" 
ON public.work_submissions 
FOR INSERT 
WITH CHECK (
  submitted_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- UPDATE policy: users can update their own submissions or admins/project managers can update any
CREATE POLICY "Users can update their own submissions or admins can review" 
ON public.work_submissions 
FOR UPDATE 
USING (
  submitted_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'project_manager')
  )
);

-- Foreign key constraints
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

-- Function to update updated_at on row update
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at before UPDATE
CREATE TRIGGER update_work_submissions_updated_at
BEFORE UPDATE ON public.work_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for work screenshots if not exists
INSERT INTO storage.buckets (id, name, public) 
SELECT 'work-screenshots', 'work-screenshots', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'work-screenshots'
);

-- Storage RLS policies for work-screenshots bucket

-- Users can insert only if file path folder prefix matches their auth.uid()
CREATE POLICY "Users can upload their work screenshots" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'work-screenshots' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own screenshots only
CREATE POLICY "Users can update their own work screenshots" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'work-screenshots' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Public read access to all screenshots in this bucket
CREATE POLICY "Work screenshots are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'work-screenshots'
);
