-- MediCareDemo Database Setup
-- Run this script in your Supabase SQL Editor to set up the complete database schema

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  bio TEXT,
  image_url TEXT,
  accepting_patients BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  doctor_id UUID REFERENCES doctors(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for profiles table

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin users can view all profiles
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- 6. Create RLS Policies for doctors table

-- Anyone can view doctors
DROP POLICY IF EXISTS "Anyone can view doctors" ON doctors;
CREATE POLICY "Anyone can view doctors" ON doctors
  FOR SELECT USING (true);

-- Only admin users can insert/update/delete doctors
DROP POLICY IF EXISTS "Admin can manage doctors" ON doctors;
CREATE POLICY "Admin can manage doctors" ON doctors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- 7. Create RLS Policies for appointments table

-- Users can view their own appointments
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
CREATE POLICY "Users can view own appointments" ON appointments
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own appointments (allow NULL user_id for anonymous bookings)
DROP POLICY IF EXISTS "Users can insert own appointments" ON appointments;
CREATE POLICY "Users can insert own appointments" ON appointments
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Users can update their own appointments
DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;
CREATE POLICY "Users can update own appointments" ON appointments
  FOR UPDATE USING (user_id = auth.uid());

-- Admin users can view all appointments
DROP POLICY IF EXISTS "Admin can view all appointments" ON appointments;
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Admin users can manage all appointments
DROP POLICY IF EXISTS "Admin can manage all appointments" ON appointments;
CREATE POLICY "Admin can manage all appointments" ON appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- 8. Create performance indexes

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Doctors indexes
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_accepting_patients ON doctors(accepting_patients);

-- 9. Insert sample doctors data
INSERT INTO doctors (name, specialty, bio, accepting_patients) 
VALUES 
  ('Dr. Sarah Johnson', 'Cardiology', 'Experienced cardiologist with over 15 years of practice. Specializes in preventive cardiology and heart disease management.', true),
  ('Dr. Michael Chen', 'Pediatrics', 'Dedicated pediatrician focused on child health and development. Board certified in pediatrics with special interest in childhood nutrition.', true),
  ('Dr. Emily Rodriguez', 'Dermatology', 'Board-certified dermatologist specializing in skin health, cosmetic procedures, and skin cancer prevention.', true),
  ('Dr. David Kim', 'Orthopedics', 'Orthopedic surgeon with expertise in sports medicine and joint replacement surgery. Currently not accepting new patients.', false),
  ('Dr. Lisa Thompson', 'Internal Medicine', 'Primary care physician with a holistic approach to health. Focuses on preventive care and chronic disease management.', true),
  ('Dr. James Wilson', 'Neurology', 'Neurologist specializing in movement disorders and headache management. Fellowship trained in Parkinson disease treatment.', true),
  ('Dr. Maria Garcia', 'Obstetrics & Gynecology', 'Board-certified OB/GYN providing comprehensive women health care including prenatal care and minimally invasive surgery.', true),
  ('Dr. Robert Brown', 'Psychiatry', 'Psychiatrist with expertise in anxiety, depression, and cognitive behavioral therapy. Integrative approach to mental health.', true)
ON CONFLICT (id) DO NOTHING;

-- 10. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_doctors_updated_at ON doctors;
CREATE TRIGGER update_doctors_updated_at 
    BEFORE UPDATE ON doctors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 12. Create view for appointment details (optional)
CREATE OR REPLACE VIEW appointment_details AS
SELECT 
    a.id,
    a.name as patient_name,
    a.email,
    a.phone,
    a.appointment_date,
    a.appointment_time,
    a.notes,
    a.status,
    a.created_at,
    a.updated_at,
    d.name as doctor_name,
    d.specialty as doctor_specialty,
    d.image_url as doctor_image
FROM appointments a
LEFT JOIN doctors d ON a.doctor_id = d.id;

-- Grant access to the view
GRANT SELECT ON appointment_details TO authenticated;
GRANT SELECT ON appointment_details TO anon;

-- 13. Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_admin)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    false
  );
  RETURN new;
END;
$$ language plpgsql security definer;

-- 14. Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'MediCareDemo database setup completed successfully!';
    RAISE NOTICE 'Tables created: profiles, doctors, appointments';
    RAISE NOTICE 'Sample data inserted: % doctors', (SELECT COUNT(*) FROM doctors);
    RAISE NOTICE 'Automatic profile creation trigger enabled';
    RAISE NOTICE 'Next steps: Configure your frontend with Supabase credentials';
END $$;
