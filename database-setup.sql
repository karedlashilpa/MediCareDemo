-- MediCareDemo Database Setup
-- Run this script in your Supabase SQL Editor to set up the complete database schema

-- 1. Create doctors table
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

-- 2. Create appointments table
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

-- 3. Enable Row Level Security
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for doctors table

-- Anyone can view doctors
DROP POLICY IF EXISTS "Anyone can view doctors" ON doctors;
CREATE POLICY "Anyone can view doctors" ON doctors
  FOR SELECT USING (true);

-- Only admin users can insert/update/delete doctors
DROP POLICY IF EXISTS "Admin can manage doctors" ON doctors;
CREATE POLICY "Admin can manage doctors" ON doctors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 5. Create RLS Policies for appointments table

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
CREATE POLICY "Admin can view all appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admin users can manage all appointments
DROP POLICY IF EXISTS "Admin can manage all appointments" ON appointments;
CREATE POLICY "Admin can manage all appointments" ON appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 6. Create performance indexes

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Doctors indexes
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_accepting_patients ON doctors(accepting_patients);

-- 7. Insert sample doctors data
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

-- 8. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create triggers for updated_at
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

-- 10. Create view for appointment details (optional)
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

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'MediCareDemo database setup completed successfully!';
    RAISE NOTICE 'Tables created: doctors, appointments';
    RAISE NOTICE 'Sample data inserted: % doctors', (SELECT COUNT(*) FROM doctors);
    RAISE NOTICE 'Next steps: Configure your frontend with Supabase credentials';
END $$;
