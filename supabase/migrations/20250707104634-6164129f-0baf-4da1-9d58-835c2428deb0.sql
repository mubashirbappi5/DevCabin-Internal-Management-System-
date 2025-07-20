-- Insert sample data for testing
INSERT INTO public.profiles (user_id, email, first_name, last_name, role) VALUES 
('00000000-0000-0000-0000-000000000001', 'admin@devcabin.com', 'Admin', 'User', 'admin'),
('00000000-0000-0000-0000-000000000002', 'pm@devcabin.com', 'Project', 'Manager', 'project_manager'),
('00000000-0000-0000-0000-000000000003', 'dev@devcabin.com', 'Dev', 'User', 'developer')
ON CONFLICT (user_id) DO NOTHING;