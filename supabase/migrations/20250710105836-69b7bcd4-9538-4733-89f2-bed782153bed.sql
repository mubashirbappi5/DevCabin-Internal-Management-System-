-- Create a function to get current user role (to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Update RLS policies to use the security definer function
DROP POLICY IF EXISTS "Users can view their own attendance and admins can view all" ON public.daily_attendance;
DROP POLICY IF EXISTS "Users can view their own leave applications and admins can view all" ON public.leave_applications;

-- Create new policies using security definer function
CREATE POLICY "Users can view their own attendance and admins can view all"
ON public.daily_attendance
FOR SELECT
USING (
  user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  public.get_current_user_role() IN ('admin', 'project_manager')
);

CREATE POLICY "Users can view their own leave applications and admins can view all"
ON public.leave_applications
FOR SELECT
USING (
  user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  public.get_current_user_role() IN ('admin', 'project_manager')
);

-- Create function to auto-mark absent members
CREATE OR REPLACE FUNCTION public.auto_mark_absent_members()
RETURNS void AS $$
DECLARE
  current_time TIME;
  current_date DATE;
  member_record RECORD;
BEGIN
  current_time := CURRENT_TIME;
  current_date := CURRENT_DATE;
  
  -- Only run this function after 2:00 PM (14:00)
  IF current_time < '14:00:00' THEN
    RETURN;
  END IF;
  
  -- Mark all active members as absent if they haven't marked attendance today
  FOR member_record IN 
    SELECT p.id as user_id
    FROM profiles p
    WHERE p.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM daily_attendance da 
      WHERE da.user_id = p.id 
      AND da.date = current_date
    )
    AND NOT EXISTS (
      SELECT 1 FROM leave_applications la
      WHERE la.user_id = p.id
      AND la.status = 'approved'
      AND la.start_date <= current_date
      AND la.end_date >= current_date
    )
  LOOP
    INSERT INTO daily_attendance (user_id, date, status, notes)
    VALUES (
      member_record.user_id,
      current_date,
      'absent',
      'Auto-marked absent - no attendance submitted within working hours'
    )
    ON CONFLICT (user_id, date) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;