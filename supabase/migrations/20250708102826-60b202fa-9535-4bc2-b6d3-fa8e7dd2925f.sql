-- Update RLS policy to allow all authenticated users to view projects
DROP POLICY "Users can view projects they're involved in" ON public.projects;

CREATE POLICY "All authenticated users can view projects" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (true);