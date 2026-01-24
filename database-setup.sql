-- Database Setup Script for Supabase
-- Run this in your Supabase SQL Editor to create the required tables

-- Enable Row Level Security
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS restock_requests ENABLE ROW LEVEL SECURITY;

-- Create tables
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  color TEXT,
  security TEXT,
  security_level TEXT CHECK (security_level IN ('low', 'medium', 'high')) DEFAULT 'medium',
  security_info TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  building_name TEXT NOT NULL,
  address TEXT,
  security TEXT,
  security_level TEXT CHECK (security_level IN ('low', 'medium', 'high')) DEFAULT 'medium',
  security_info TEXT,
  is_active BOOLEAN DEFAULT true,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cleaners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT,
  go_by TEXT,
  dob DATE,
  is_active BOOLEAN DEFAULT true,
  avatar TEXT,
  photo_url TEXT,
  specialties TEXT[] DEFAULT '{}',
  employee_id TEXT UNIQUE NOT NULL,
  security_level TEXT CHECK (security_level IN ('low', 'medium', 'high')) DEFAULT 'low',
  phone_number TEXT NOT NULL,
  email TEXT,
  hire_date DATE,
  term_date DATE,
  rehire_date DATE,
  employment_status TEXT CHECK (employment_status IN ('active', 'terminated', 'on-leave', 'suspended')) DEFAULT 'active',
  pay_type TEXT CHECK (pay_type IN ('hourly', 'salary', 'contract')) DEFAULT 'hourly',
  default_hourly_rate DECIMAL DEFAULT 15,
  notes TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  building_name TEXT,
  project_name TEXT NOT NULL,
  description TEXT,
  frequency TEXT CHECK (frequency IN ('one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly')) DEFAULT 'one-time',
  is_included_in_contract BOOLEAN DEFAULT false,
  billing_amount DECIMAL DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'completed', 'cancelled', 'on-hold')) DEFAULT 'active',
  client_status TEXT CHECK (client_status IN ('not-sent', 'sent', 'approved', 'declined')) DEFAULT 'not-sent',
  declined_reason TEXT,
  next_scheduled_date DATE,
  notes TEXT,
  work_order_number TEXT,
  invoice_number TEXT,
  estimated_price DECIMAL DEFAULT 0,
  estimated_profitability DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_labor (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES client_projects(id) ON DELETE CASCADE,
  laborer_name TEXT NOT NULL,
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate',
  hours_worked DECIMAL DEFAULT 0,
  hourly_rate DECIMAL DEFAULT 15,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES client_projects(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL,
  hours_used DECIMAL DEFAULT 0,
  cost_per_hour DECIMAL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES client_projects(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  hours_used DECIMAL DEFAULT 0,
  mileage DECIMAL DEFAULT 0,
  cost_per_hour DECIMAL DEFAULT 0,
  cost_per_mile DECIMAL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_supplies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES client_projects(id) ON DELETE CASCADE,
  supply_type TEXT NOT NULL,
  quantity DECIMAL DEFAULT 0,
  unit TEXT NOT NULL,
  cost_per_unit DECIMAL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedule_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  building_name TEXT NOT NULL,
  cleaner_name TEXT NOT NULL,
  cleaner_names TEXT[] DEFAULT '{}',
  cleaner_ids TEXT[] DEFAULT '{}',
  hours DECIMAL NOT NULL,
  cleaner_hours JSONB DEFAULT '{}'::jsonb,
  day TEXT CHECK (day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')) NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  status TEXT CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
  week_id TEXT NOT NULL,
  notes TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  is_recurring BOOLEAN DEFAULT false,
  recurring_id TEXT,
  estimated_duration INTEGER,
  actual_duration INTEGER,
  tags TEXT[] DEFAULT '{}',
  payment_type TEXT CHECK (payment_type IN ('hourly', 'flat_rate')) DEFAULT 'hourly',
  flat_rate_amount DECIMAL DEFAULT 0,
  hourly_rate DECIMAL DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('cleaning-supplies', 'equipment', 'safety')) NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  max_stock INTEGER NOT NULL DEFAULT 100,
  unit TEXT NOT NULL,
  location TEXT NOT NULL,
  cost DECIMAL NOT NULL DEFAULT 0,
  supplier TEXT NOT NULL,
  auto_reorder_enabled BOOLEAN DEFAULT false,
  reorder_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('in', 'out', 'adjustment')) NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restock_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  quantity INTEGER NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('pending', 'approved', 'ordered', 'delivered')) DEFAULT 'pending',
  notes TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_client_buildings_client_name ON client_buildings(client_name);
CREATE INDEX IF NOT EXISTS idx_cleaners_employee_id ON cleaners(employee_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_client_name ON client_projects(client_name);
CREATE INDEX IF NOT EXISTS idx_project_labor_project_id ON project_labor(project_id);
CREATE INDEX IF NOT EXISTS idx_project_equipment_project_id ON project_equipment(project_id);
CREATE INDEX IF NOT EXISTS idx_project_vehicles_project_id ON project_vehicles(project_id);
CREATE INDEX IF NOT EXISTS idx_project_supplies_project_id ON project_supplies(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_week_id ON schedule_entries(week_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_date ON schedule_entries(date);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_restock_requests_status ON restock_requests(status);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_buildings_updated_at BEFORE UPDATE ON client_buildings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cleaners_updated_at BEFORE UPDATE ON cleaners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_projects_updated_at BEFORE UPDATE ON client_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_labor_updated_at BEFORE UPDATE ON project_labor FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_equipment_updated_at BEFORE UPDATE ON project_equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_vehicles_updated_at BEFORE UPDATE ON project_vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_supplies_updated_at BEFORE UPDATE ON project_supplies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_entries_updated_at BEFORE UPDATE ON schedule_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restock_requests_updated_at BEFORE UPDATE ON restock_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Basic RLS policies (allow all for now - should be customized based on auth requirements)
CREATE POLICY "Allow all operations" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON client_buildings FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON cleaners FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON client_projects FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON project_labor FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON project_equipment FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON project_vehicles FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON project_supplies FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON schedule_entries FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON inventory_items FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON inventory_transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON restock_requests FOR ALL USING (true);
