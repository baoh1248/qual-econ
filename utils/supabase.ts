
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database table names
export const TABLES = {
  CLIENTS: 'clients',
  CLIENT_BUILDINGS: 'client_buildings',
  CLEANERS: 'cleaners',
  SCHEDULE_ENTRIES: 'schedule_entries',
  INVENTORY_ITEMS: 'inventory_items',
  INVENTORY_TRANSACTIONS: 'inventory_transactions',
  RESTOCK_REQUESTS: 'restock_requests',
  CLIENT_PROJECTS: 'client_projects',
  PROJECT_COMPLETIONS: 'project_completions',
  CLEANER_VACATIONS: 'cleaner_vacations',
} as const;

// Database types
export interface DatabaseClient {
  id: string;
  name: string;
  is_active: boolean;
  color?: string;
  security?: string;
  security_level: 'low' | 'medium' | 'high';
  security_info?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseClientBuilding {
  id: string;
  client_name: string;
  building_name: string;
  address?: string;
  security?: string;
  security_level: 'low' | 'medium' | 'high';
  security_info?: string;
  is_active: boolean;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseCleaner {
  id: string;
  name: string;
  is_active: boolean;
  avatar?: string;
  specialties: string[];
  employee_id: string;
  security_level: 'low' | 'medium' | 'high';
  phone_number: string;
  email?: string;
  hire_date?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseScheduleEntry {
  id: string;
  client_name: string;
  building_name: string;
  cleaner_name: string;
  cleaner_names?: string[];
  cleaner_ids?: string[];
  hours: number;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  date: string;
  start_time?: string;
  end_time?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  week_id: string;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  is_recurring?: boolean;
  recurring_id?: string;
  estimated_duration?: number;
  actual_duration?: number;
  tags?: string[];
  payment_type?: 'hourly' | 'flat_rate';
  flat_rate_amount?: number;
  hourly_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseInventoryItem {
  id: string;
  name: string;
  category: 'cleaning-supplies' | 'equipment' | 'safety';
  current_stock: number;
  min_stock: number;
  max_stock: number;
  unit: string;
  location: string;
  cost: number;
  supplier: string;
  auto_reorder_enabled: boolean;
  reorder_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseInventoryTransaction {
  id: string;
  item_id: string;
  item_name: string;
  transaction_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  performed_by: string;
  location?: string;
  created_at: string;
}

export interface DatabaseRestockRequest {
  id: string;
  item_id: string;
  item_name: string;
  requested_by: string;
  requested_at: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'ordered' | 'delivered';
  notes: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseClientProject {
  id: string;
  client_name: string;
  project_name: string;
  description?: string;
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  is_included_in_contract: boolean;
  billing_amount: number;
  status: 'active' | 'completed' | 'cancelled' | 'on-hold';
  next_scheduled_date?: string;
  last_completed_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseProjectCompletion {
  id: string;
  project_id: string;
  completed_date: string;
  completed_by: string;
  hours_spent: number;
  notes?: string;
  photos_count: number;
  created_at: string;
}

export interface DatabaseCleanerVacation {
  id: string;
  cleaner_id: string;
  cleaner_name: string;
  start_date: string;
  end_date: string;
  reason?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// Helper functions to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '');
};

export const getSupabaseStatus = () => {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      message: 'Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.',
    };
  }
  
  return {
    configured: true,
    message: 'Supabase is configured and ready to use.',
  };
};

// Database initialization SQL (for reference - these would be run in Supabase dashboard)
export const DATABASE_SCHEMA = `
-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaner_vacations ENABLE ROW LEVEL SECURITY;

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
  is_active BOOLEAN DEFAULT true,
  avatar TEXT,
  specialties TEXT[] DEFAULT '{}',
  employee_id TEXT UNIQUE NOT NULL,
  security_level TEXT CHECK (security_level IN ('low', 'medium', 'high')) DEFAULT 'low',
  phone_number TEXT NOT NULL,
  email TEXT,
  hire_date DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
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

CREATE TABLE IF NOT EXISTS client_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  description TEXT,
  frequency TEXT CHECK (frequency IN ('one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly')) NOT NULL,
  is_included_in_contract BOOLEAN DEFAULT false,
  billing_amount DECIMAL DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'completed', 'cancelled', 'on-hold')) DEFAULT 'active',
  next_scheduled_date DATE,
  last_completed_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES client_projects(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  completed_by TEXT NOT NULL,
  hours_spent DECIMAL NOT NULL,
  notes TEXT,
  photos_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cleaner_vacations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cleaner_id UUID REFERENCES cleaners(id) ON DELETE CASCADE,
  cleaner_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  notes TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_client_buildings_client_name ON client_buildings(client_name);
CREATE INDEX IF NOT EXISTS idx_cleaners_employee_id ON cleaners(employee_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_week_id ON schedule_entries(week_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_date ON schedule_entries(date);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_restock_requests_status ON restock_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_projects_client_name ON client_projects(client_name);
CREATE INDEX IF NOT EXISTS idx_client_projects_status ON client_projects(status);
CREATE INDEX IF NOT EXISTS idx_project_completions_project_id ON project_completions(project_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_vacations_cleaner_id ON cleaner_vacations(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_vacations_status ON cleaner_vacations(status);

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
CREATE TRIGGER update_schedule_entries_updated_at BEFORE UPDATE ON schedule_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restock_requests_updated_at BEFORE UPDATE ON restock_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_projects_updated_at BEFORE UPDATE ON client_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cleaner_vacations_updated_at BEFORE UPDATE ON cleaner_vacations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Basic RLS policies (allow all for now - should be customized based on auth requirements)
CREATE POLICY "Allow all operations" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON client_buildings FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON cleaners FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON schedule_entries FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON inventory_items FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON inventory_transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON restock_requests FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON client_projects FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON project_completions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON cleaner_vacations FOR ALL USING (true);
`;
