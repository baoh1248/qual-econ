
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../app/integrations/supabase/client';

export interface Client {
  id: string;
  name: string;
  isActive: boolean;
  color?: string;
  security?: string;
  securityLevel: 'low' | 'medium' | 'high';
  securityInfo?: string;
  contactInfo?: {
    email: string;
    phone: string;
    address: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClientBuilding {
  id: string;
  clientName: string;
  buildingName: string;
  address?: string;
  security?: string;
  securityLevel: 'low' | 'medium' | 'high';
  securityInfo?: string;
  isActive?: boolean;
  contactInfo?: {
    email: string;
    phone: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EmploymentHistory {
  id: string;
  employee_id: string;
  cleaner_id: string;
  start_date: string;
  end_date?: string;
  termination_reason?: string;
  position?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Cleaner {
  id: string;
  name: string;
  legal_name?: string;
  go_by?: string;
  dob?: string;
  isActive: boolean;
  avatar?: string;
  photo_url?: string;
  specialties: string[];
  employeeId: string;
  securityLevel: 'low' | 'medium' | 'high';
  phoneNumber: string;
  email?: string;
  hireDate?: string;
  term_date?: string;
  rehire_date?: string;
  employment_status?: 'active' | 'terminated' | 'on-leave' | 'suspended';
  notes?: string;
  pay_type?: 'hourly' | 'salary' | 'contract';
  defaultHourlyRate?: number;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  employment_history?: EmploymentHistory[];
  createdAt?: Date;
  updatedAt?: Date;
  user_id?: string;
}

const STORAGE_KEYS = {
  CLIENTS: 'clients_v3',
  BUILDINGS: 'client_buildings_v3',
  CLEANERS: 'cleaners_v3',
};

// Cache for frequently accessed data
const clientsCache = new Map<string, Client[]>();
const buildingsCache = new Map<string, ClientBuilding[]>();
const cleanersCache = new Map<string, Cleaner[]>();

export const useClientData = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientBuildings, setClientBuildings] = useState<ClientBuilding[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save operations
  const debouncedSave = useCallback(async (key: string, data: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(data));
        console.log(`Saved ${key} successfully`);
      } catch (err) {
        console.error(`Error saving ${key}:`, err);
        setError(`Failed to save ${key}`);
      }
    }, 300);
  }, []);

  // Optimized mock data initialization
  const initializeMockClients = useCallback(async (): Promise<Client[]> => {
    const mockClients: Client[] = [
      { 
        id: '1', 
        name: 'TechCorp Inc.', 
        isActive: true, 
        color: '#3B82F6', 
        security: 'Badge required',
        securityLevel: 'high',
        securityInfo: 'Badge required at main entrance',
        contactInfo: {
          email: 'contact@techcorp.com',
          phone: '+1 (555) 123-4567',
          address: '123 Tech Street'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: '2', 
        name: 'MedCenter Hospital', 
        isActive: true, 
        color: '#10B981', 
        security: 'ID check required',
        securityLevel: 'high',
        securityInfo: 'ID check and escort required',
        contactInfo: {
          email: 'admin@medcenter.com',
          phone: '+1 (555) 234-5678',
          address: '789 Health Blvd'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: '3', 
        name: 'Downtown Mall', 
        isActive: true, 
        color: '#F59E0B', 
        security: 'Security desk check-in',
        securityLevel: 'medium',
        securityInfo: 'Security desk check-in required',
        contactInfo: {
          email: 'management@downtownmall.com',
          phone: '+1 (555) 345-6789',
          address: '321 Shopping St'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];
    
    // Save asynchronously without blocking
    debouncedSave(STORAGE_KEYS.CLIENTS, mockClients);
    return mockClients;
  }, [debouncedSave]);

  const initializeMockBuildings = useCallback(async (): Promise<ClientBuilding[]> => {
    const mockBuildings: ClientBuilding[] = [
      { 
        id: '1', 
        clientName: 'TechCorp Inc.', 
        buildingName: 'Main Office', 
        address: '123 Tech Street',
        security: 'Badge required at main entrance',
        securityLevel: 'high',
        securityInfo: 'Badge required at main entrance',
        isActive: true,
        contactInfo: {
          email: 'mainoffice@techcorp.com',
          phone: '+1 (555) 123-4567'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: '2', 
        clientName: 'TechCorp Inc.', 
        buildingName: 'Warehouse', 
        address: '456 Storage Ave',
        security: 'Key code: 1234',
        securityLevel: 'medium',
        securityInfo: 'Key code access required',
        isActive: true,
        contactInfo: {
          email: 'warehouse@techcorp.com',
          phone: '+1 (555) 123-4568'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: '3', 
        clientName: 'MedCenter Hospital', 
        buildingName: 'Emergency Wing', 
        address: '789 Health Blvd',
        security: 'ID check and escort required',
        securityLevel: 'high',
        securityInfo: 'ID check and escort required',
        isActive: true,
        contactInfo: {
          email: 'emergency@medcenter.com',
          phone: '+1 (555) 234-5678'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: '4', 
        clientName: 'Downtown Mall', 
        buildingName: 'Food Court', 
        address: '321 Shopping St',
        security: 'Security desk check-in',
        securityLevel: 'medium',
        securityInfo: 'Security desk check-in required',
        isActive: true,
        contactInfo: {
          email: 'foodcourt@downtownmall.com',
          phone: '+1 (555) 345-6789'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];
    
    debouncedSave(STORAGE_KEYS.BUILDINGS, mockBuildings);
    return mockBuildings;
  }, [debouncedSave]);

  const initializeMockCleaners = useCallback(async (): Promise<Cleaner[]> => {
    const mockCleaners: Cleaner[] = [
      { 
        id: '1', 
        name: 'John Doe',
        legal_name: 'Jonathan Michael Doe',
        go_by: 'John',
        dob: '1990-05-15',
        isActive: true, 
        specialties: ['Office Cleaning', 'Deep Cleaning'],
        employeeId: 'EMP-001',
        securityLevel: 'high',
        phoneNumber: '+1 (555) 123-4567',
        email: 'john.doe@cleaningcompany.com',
        hireDate: '2023-01-15',
        employment_status: 'active',
        pay_type: 'hourly',
        defaultHourlyRate: 18.00,
        notes: 'Excellent performance, reliable and punctual.',
        emergencyContact: {
          name: 'Jane Doe',
          phone: '+1 (555) 987-6543',
          relationship: 'Spouse'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: '2', 
        name: 'Jane Smith',
        legal_name: 'Jane Elizabeth Smith',
        go_by: 'Jane',
        dob: '1988-08-22',
        isActive: true, 
        specialties: ['Medical Facilities', 'Sanitization'],
        employeeId: 'EMP-002',
        securityLevel: 'medium',
        phoneNumber: '+1 (555) 234-5678',
        email: 'jane.smith@cleaningcompany.com',
        hireDate: '2023-03-20',
        employment_status: 'active',
        pay_type: 'hourly',
        defaultHourlyRate: 16.50,
        notes: 'Specialized in medical facility cleaning.',
        emergencyContact: {
          name: 'Bob Smith',
          phone: '+1 (555) 876-5432',
          relationship: 'Brother'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: '3', 
        name: 'Johnson Smith',
        legal_name: 'Johnson Robert Smith',
        go_by: 'Johnson',
        dob: '1992-11-10',
        isActive: true, 
        specialties: ['Industrial', 'Equipment Maintenance'],
        employeeId: 'EMP-003',
        securityLevel: 'low',
        phoneNumber: '+1 (555) 345-6789',
        email: 'johnson.smith@cleaningcompany.com',
        hireDate: '2023-05-10',
        employment_status: 'active',
        pay_type: 'hourly',
        defaultHourlyRate: 15.00,
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];
    
    debouncedSave(STORAGE_KEYS.CLEANERS, mockCleaners);
    return mockCleaners;
  }, [debouncedSave]);

  // Load cleaners from Supabase
  const loadCleanersFromSupabase = useCallback(async (): Promise<Cleaner[]> => {
    try {
      console.log('Loading cleaners from Supabase...');
      
      const { data, error } = await supabase
        .from('cleaners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading cleaners from Supabase:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('No cleaners found in Supabase, using mock data');
        return await initializeMockCleaners();
      }

      // Transform Supabase data to match our Cleaner interface
      const cleaners: Cleaner[] = data.map(row => ({
        id: row.id,
        name: row.name,
        legal_name: row.legal_name || undefined,
        go_by: row.go_by || undefined,
        dob: row.dob || undefined,
        employeeId: row.employee_id || `EMP-${row.id.slice(-6)}`,
        securityLevel: row.security_level as 'low' | 'medium' | 'high',
        phoneNumber: row.phone_number || '',
        email: row.email || undefined,
        specialties: row.specialties || [],
        hireDate: row.hire_date || undefined,
        term_date: row.term_date || undefined,
        rehire_date: row.rehire_date || undefined,
        employment_status: row.employment_status as 'active' | 'terminated' | 'on-leave' | 'suspended' || 'active',
        notes: row.notes || undefined,
        photo_url: row.photo_url || undefined,
        pay_type: row.pay_type as 'hourly' | 'salary' | 'contract' || 'hourly',
        defaultHourlyRate: row.default_hourly_rate || 15.00,
        emergencyContact: row.emergency_contact_name ? {
          name: row.emergency_contact_name,
          phone: row.emergency_contact_phone || '',
          relationship: row.emergency_contact_relationship || undefined
        } : undefined,
        isActive: row.is_active !== false,
        createdAt: row.created_at ? new Date(row.created_at) : undefined,
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
        user_id: row.user_id || undefined,
      }));

      console.log(`Loaded ${cleaners.length} cleaners from Supabase`);
      
      // Save to local storage as backup
      debouncedSave(STORAGE_KEYS.CLEANERS, cleaners);
      
      return cleaners;
    } catch (error) {
      console.error('Failed to load cleaners from Supabase:', error);
      // Fall back to local storage or mock data
      const localData = await AsyncStorage.getItem(STORAGE_KEYS.CLEANERS);
      if (localData) {
        return JSON.parse(localData);
      }
      return await initializeMockCleaners();
    }
  }, [debouncedSave, initializeMockCleaners]);

  // Optimized data loading with parallel operations
  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    
    try {
      console.log('Loading client data...');
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      // Load all data in parallel for better performance
      const [clientsData, buildingsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CLIENTS),
        AsyncStorage.getItem(STORAGE_KEYS.BUILDINGS),
      ]);

      // Process clients
      if (clientsData) {
        const parsedClients = JSON.parse(clientsData);
        setClients(parsedClients);
        clientsCache.set('all', parsedClients);
      } else {
        const mockClients = await initializeMockClients();
        setClients(mockClients);
        clientsCache.set('all', mockClients);
      }

      // Process buildings
      if (buildingsData) {
        const parsedBuildings = JSON.parse(buildingsData);
        setClientBuildings(parsedBuildings);
        buildingsCache.set('all', parsedBuildings);
      } else {
        const mockBuildings = await initializeMockBuildings();
        setClientBuildings(mockBuildings);
        buildingsCache.set('all', mockBuildings);
      }

      // Load cleaners from Supabase (this will handle fallback to local/mock data)
      const loadedCleaners = await loadCleanersFromSupabase();
      setCleaners(loadedCleaners);
      cleanersCache.set('all', loadedCleaners);

      console.log('Client data loaded successfully');
    } catch (err) {
      console.error('Error loading client data:', err);
      setError('Failed to load client data');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [initializeMockBuildings, initializeMockClients, loadCleanersFromSupabase]);

  // Optimized save functions with caching
  const saveClients = useCallback(async (newClients: Client[]) => {
    setClients(newClients);
    clientsCache.set('all', newClients);
    debouncedSave(STORAGE_KEYS.CLIENTS, newClients);
  }, [debouncedSave]);

  const saveBuildings = useCallback(async (newBuildings: ClientBuilding[]) => {
    setClientBuildings(newBuildings);
    buildingsCache.set('all', newBuildings);
    debouncedSave(STORAGE_KEYS.BUILDINGS, newBuildings);
  }, [debouncedSave]);

  const saveCleaners = useCallback(async (newCleaners: Cleaner[]) => {
    setCleaners(newCleaners);
    cleanersCache.set('all', newCleaners);
    debouncedSave(STORAGE_KEYS.CLEANERS, newCleaners);
  }, [debouncedSave]);

  // Optimized CRUD operations
  const addClient = useCallback(async (client: Omit<Client, 'id'> | Client) => {
    const newClient = 'id' in client ? client : { ...client, id: `client-${Date.now()}` };
    const updatedClients = [...clients, newClient];
    await saveClients(updatedClients);
  }, [clients, saveClients]);

  const updateClient = useCallback(async (clientId: string, updates: Partial<Client>) => {
    const updatedClients = clients.map(client =>
      client.id === clientId ? { ...client, ...updates, updatedAt: new Date() } : client
    );
    await saveClients(updatedClients);
  }, [clients, saveClients]);

  const deleteClient = useCallback(async (clientId: string) => {
    const updatedClients = clients.filter(client => client.id !== clientId);
    await saveClients(updatedClients);
  }, [clients, saveClients]);

  const addClientBuilding = useCallback(async (building: Omit<ClientBuilding, 'id'> | ClientBuilding) => {
    const newBuilding = 'id' in building ? building : { ...building, id: `building-${Date.now()}` };
    const updatedBuildings = [...clientBuildings, newBuilding];
    await saveBuildings(updatedBuildings);
  }, [clientBuildings, saveBuildings]);

  const updateClientBuilding = useCallback(async (buildingId: string, updates: Partial<ClientBuilding>) => {
    const updatedBuildings = clientBuildings.map(building =>
      building.id === buildingId ? { ...building, ...updates, updatedAt: new Date() } : building
    );
    await saveBuildings(updatedBuildings);
  }, [clientBuildings, saveBuildings]);

  const deleteClientBuilding = useCallback(async (buildingId: string) => {
    const updatedBuildings = clientBuildings.filter(building => building.id !== buildingId);
    await saveBuildings(updatedBuildings);
  }, [clientBuildings, saveBuildings]);

  const addCleaner = useCallback(async (cleaner: Omit<Cleaner, 'id'> | Cleaner) => {
    const newCleaner = 'id' in cleaner ? cleaner : { ...cleaner, id: `cleaner-${Date.now()}` };
    
    try {
      // Try to save to Supabase first
      const { error } = await supabase
        .from('cleaners')
        .insert({
          id: newCleaner.id,
          name: newCleaner.name,
          legal_name: newCleaner.legal_name || null,
          go_by: newCleaner.go_by || null,
          dob: newCleaner.dob || null,
          employee_id: newCleaner.employeeId,
          security_level: newCleaner.securityLevel,
          phone_number: newCleaner.phoneNumber,
          email: newCleaner.email || null,
          specialties: newCleaner.specialties || [],
          hire_date: newCleaner.hireDate || null,
          term_date: newCleaner.term_date || null,
          rehire_date: newCleaner.rehire_date || null,
          employment_status: newCleaner.employment_status || 'active',
          notes: newCleaner.notes || null,
          photo_url: newCleaner.photo_url || null,
          pay_type: newCleaner.pay_type || 'hourly',
          default_hourly_rate: newCleaner.defaultHourlyRate || 15.00,
          emergency_contact_name: newCleaner.emergencyContact?.name || null,
          emergency_contact_phone: newCleaner.emergencyContact?.phone || null,
          emergency_contact_relationship: newCleaner.emergencyContact?.relationship || null,
          is_active: newCleaner.isActive !== false,
          user_id: newCleaner.user_id || null,
        });

      if (error) {
        console.error('Error adding cleaner to Supabase:', error);
        throw error;
      }

      console.log('Cleaner added to Supabase successfully');
    } catch (error) {
      console.error('Failed to add cleaner to Supabase, saving locally:', error);
    }

    // Update local state
    const updatedCleaners = [...cleaners, newCleaner];
    await saveCleaners(updatedCleaners);
  }, [cleaners, saveCleaners]);

  const updateCleaner = useCallback(async (cleanerId: string, updates: Partial<Cleaner>) => {
    try {
      // Try to update in Supabase first
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.legal_name !== undefined) updateData.legal_name = updates.legal_name || null;
      if (updates.go_by !== undefined) updateData.go_by = updates.go_by || null;
      if (updates.dob !== undefined) updateData.dob = updates.dob || null;
      if (updates.employeeId !== undefined) updateData.employee_id = updates.employeeId;
      if (updates.securityLevel !== undefined) updateData.security_level = updates.securityLevel;
      if (updates.phoneNumber !== undefined) updateData.phone_number = updates.phoneNumber;
      if (updates.email !== undefined) updateData.email = updates.email || null;
      if (updates.specialties !== undefined) updateData.specialties = updates.specialties;
      if (updates.hireDate !== undefined) updateData.hire_date = updates.hireDate || null;
      if (updates.term_date !== undefined) updateData.term_date = updates.term_date || null;
      if (updates.rehire_date !== undefined) updateData.rehire_date = updates.rehire_date || null;
      if (updates.employment_status !== undefined) updateData.employment_status = updates.employment_status;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.photo_url !== undefined) updateData.photo_url = updates.photo_url || null;
      if (updates.pay_type !== undefined) updateData.pay_type = updates.pay_type;
      if (updates.defaultHourlyRate !== undefined) updateData.default_hourly_rate = updates.defaultHourlyRate;
      if (updates.emergencyContact !== undefined) {
        updateData.emergency_contact_name = updates.emergencyContact?.name || null;
        updateData.emergency_contact_phone = updates.emergencyContact?.phone || null;
        updateData.emergency_contact_relationship = updates.emergencyContact?.relationship || null;
      }
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('cleaners')
        .update(updateData)
        .eq('id', cleanerId);

      if (error) {
        console.error('Error updating cleaner in Supabase:', error);
        throw error;
      }

      console.log('Cleaner updated in Supabase successfully');
    } catch (error) {
      console.error('Failed to update cleaner in Supabase, updating locally:', error);
    }

    // Update local state
    const updatedCleaners = cleaners.map(cleaner =>
      cleaner.id === cleanerId ? { ...cleaner, ...updates, updatedAt: new Date() } : cleaner
    );
    await saveCleaners(updatedCleaners);
  }, [cleaners, saveCleaners]);

  const deleteCleaner = useCallback(async (cleanerId: string) => {
    try {
      // Try to delete from Supabase first
      const { error } = await supabase
        .from('cleaners')
        .delete()
        .eq('id', cleanerId);

      if (error) {
        console.error('Error deleting cleaner from Supabase:', error);
        throw error;
      }

      console.log('Cleaner deleted from Supabase successfully');
    } catch (error) {
      console.error('Failed to delete cleaner from Supabase, deleting locally:', error);
    }

    // Update local state
    const updatedCleaners = cleaners.filter(cleaner => cleaner.id !== cleanerId);
    await saveCleaners(updatedCleaners);
  }, [cleaners, saveCleaners]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Initialize data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    clients,
    clientBuildings,
    cleaners,
    isLoading,
    error,
    addClient,
    updateClient,
    deleteClient,
    addClientBuilding,
    updateClientBuilding,
    deleteClientBuilding,
    addCleaner,
    updateCleaner,
    deleteCleaner,
    clearError,
    loadData,
  };
};
