-- Fix storage policies for attendance screenshots
DROP POLICY IF EXISTS "Users can upload their own attendance screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own attendance screenshots" ON storage.objects;

-- Create more permissive storage policies
CREATE POLICY "Anyone can upload to attendance-screenshots bucket"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'attendance-screenshots');

CREATE POLICY "Anyone can update files in attendance-screenshots bucket"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'attendance-screenshots');