-- Update the auto-mark absent function to use 11 PM working hours
CREATE OR REPLACE FUNCTION public.auto_mark_absent_members()
RETURNS void AS $$
DECLARE
  check_time TIME;
  check_date DATE;
  member_record RECORD;
BEGIN
  check_time := CURRENT_TIME;
  check_date := CURRENT_DATE;
  
  -- Only run this function after 11:00 PM (23:00)
  IF check_time < '23:00:00' THEN
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
      AND da.date = check_date
    )
    AND NOT EXISTS (
      SELECT 1 FROM leave_applications la
      WHERE la.user_id = p.id
      AND la.status = 'approved'
      AND la.start_date <= check_date
      AND la.end_date >= check_date
    )
  LOOP
    INSERT INTO daily_attendance (user_id, date, status, notes)
    VALUES (
      member_record.user_id,
      check_date,
      'absent',
      'Auto-marked absent - no attendance submitted within working hours (8 AM - 11 PM)'
    )
    ON CONFLICT (user_id, date) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;