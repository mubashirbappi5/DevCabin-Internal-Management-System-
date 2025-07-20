-- Add DELETE policy for work submissions (admin only)
CREATE POLICY "Only admins can delete work submissions" 
ON public.work_submissions 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);