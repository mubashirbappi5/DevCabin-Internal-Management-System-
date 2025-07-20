-- Enable Row Level Security on project_members table
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_members table
-- Allow admins and project managers to manage project members
CREATE POLICY "Admins and PMs can manage project members" 
ON public.project_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'project_manager')
  )
);

-- Allow all authenticated users to view project members
CREATE POLICY "All authenticated users can view project members" 
ON public.project_members 
FOR SELECT 
USING (true);