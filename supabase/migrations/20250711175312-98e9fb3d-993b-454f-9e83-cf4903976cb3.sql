-- Update RLS policies for work_submissions to ensure all members can submit work

-- Drop and recreate the INSERT policy to be more explicit
DROP POLICY IF EXISTS "Users can create their own submissions" ON public.work_submissions;

-- Create a more permissive INSERT policy for all authenticated users
CREATE POLICY "All authenticated users can create work submissions" 
ON public.work_submissions 
FOR INSERT 
TO authenticated
WITH CHECK (
  submitted_by = (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Ensure the SELECT policy allows users to see their own submissions
DROP POLICY IF EXISTS "Users can view their own submissions and all if admin/PM" ON public.work_submissions;

CREATE POLICY "Users can view their own submissions and admins can view all" 
ON public.work_submissions 
FOR SELECT 
TO authenticated
USING (
  submitted_by = (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
  ) 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'project_manager')
  )
);

-- Update the UPDATE policy to be clearer
DROP POLICY IF EXISTS "Users can update their own submissions or admins can review" ON public.work_submissions;

CREATE POLICY "Users can update own submissions and admins can review all" 
ON public.work_submissions 
FOR UPDATE 
TO authenticated
USING (
  submitted_by = (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
  ) 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'project_manager')
  )
);