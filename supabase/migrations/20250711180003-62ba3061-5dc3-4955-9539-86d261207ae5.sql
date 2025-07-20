-- Fix RLS policies for work_submissions to resolve security violations

-- First, let's create a more robust INSERT policy
DROP POLICY IF EXISTS "All authenticated users can create work submissions" ON public.work_submissions;

-- Create a simpler and more reliable INSERT policy
CREATE POLICY "Users can submit work" 
ON public.work_submissions 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow if the submitted_by matches the user's profile id
  submitted_by IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
  )
  OR
  -- Also allow if the submitted_by is null and we set it via trigger
  submitted_by IS NULL
);

-- Create a function to automatically set submitted_by to the correct profile id
CREATE OR REPLACE FUNCTION public.set_work_submission_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically set submitted_by to the current user's profile id if not set
  IF NEW.submitted_by IS NULL THEN
    NEW.submitted_by := (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set the submitted_by field
DROP TRIGGER IF EXISTS set_work_submission_user_trigger ON public.work_submissions;
CREATE TRIGGER set_work_submission_user_trigger
  BEFORE INSERT ON public.work_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_work_submission_user();

-- Also ensure we have the SELECT policy
DROP POLICY IF EXISTS "Users can view their own submissions and admins can view all" ON public.work_submissions;

CREATE POLICY "Users can view work submissions" 
ON public.work_submissions 
FOR SELECT 
TO authenticated
USING (
  -- Users can see their own submissions
  submitted_by IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
  )
  OR
  -- Admins and PMs can see all submissions
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'project_manager')
  )
);

-- Update policy for updates
DROP POLICY IF EXISTS "Users can update own submissions and admins can review all" ON public.work_submissions;

CREATE POLICY "Users can update work submissions" 
ON public.work_submissions 
FOR UPDATE 
TO authenticated
USING (
  -- Users can update their own submissions
  submitted_by IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
  )
  OR
  -- Admins and PMs can review/update all submissions
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'project_manager')
  )
);