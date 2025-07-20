-- Add INSERT policy for notifications table to allow users to send messages
CREATE POLICY "Users can create notifications for messaging" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid()
  )
);