
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../app/integrations/supabase/client';
import { geocodeAddress, isValidCoordinates } from '../utils/geocoding';

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
  name: string;
  address?: string;
  security?: string;
  securityLevel: 'low' | 'medium' | 'high';
  securityInfo?: string;
  isActive?: boolean;
  priority?: 'low' | 'medium' | 'high';
  contactInfo?: {
    email: string;
    phone: string;
  };
  // Geofence coordinates
  latitude?: number;
  longitude?: number;
  geofenceRadiusFt?: number;
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

export interface CompensationRecord {
  id: string;
  employee_id: string;
  cleaner_id: string;
  pay_type: 'hourly' | 'salary' | 'contract';
  rate: number;
  effective_date: string;
  end_date?: string;
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
  default_hourly_rate?: number;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  employment_history?: EmploymentHistory[];
  compensation_history?: CompensationRecord[];
  createdAt?: Date;
  updatedAt?: Date;
  user_id?: string;
}

const STORAGE_KEYS = {
  CLIENTS: 'clients_v3',
  BUILDINGS: 'client_buildings_v3',
  CLEANERS: 'cleaners_v3',
};

export const useClientData = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientBuildings, setClientBuildings] = useState<ClientBuilding[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback(async (key: string, data: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(data));
        console.log(`✅ Saved ${key} successfully`);
      } catch (err) {
        console.error(`❌ Error saving ${key}:`, err);
        setError(`Failed to save ${key}`);
      }
    }, 300);
  }, []);

  const loadClientsFromSupabase = useCallback(async (): Promise<Client[]> => {
    try {
      console.log('🔄 Loading clients from Supabase...');
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading clients from Supabase:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ No clients found in Supabase');
        return [];
      }

      const clients: Client[] = data.map(row => ({
        id: row.id,
        name: row.name,
        securityLevel: row.security_level as 'low' | 'medium' | 'high',
        securityInfo: row.security || undefined,
        security: row.security || undefined,
        isActive: row.is_active !== false,
        color: row.color || '#3B82F6',
        createdAt: row.created_at ? new Date(row.created_at) : undefined,
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
      }));

      console.log(`✅ Loaded ${clients.length} clients from Supabase`);
      
      await AsyncStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
      
      return clients;
    } catch (error) {
      console.error('❌ Failed to load clients from Supabase:', error);
      const localData = await AsyncStorage.getItem(STORAGE_KEYS.CLIENTS);
      if (localData) {
        return JSON.parse(localData);
      }
      return [];
    }
  }, []);

  const loadBuildingsFromSupabase = useCallback(async (): Promise<ClientBuilding[]> => {
    try {
      console.log('🔄 Loading buildings from Supabase...');
      
      const { data, error } = await supabase
        .from('client_buildings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading buildings from Supabase:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ No buildings found in Supabase');
        return [];
      }

      const buildings: ClientBuilding[] = data.map(row => ({
        id: row.id,
        clientName: row.client_name,
        buildingName: row.building_name,
        name: row.building_name,
        address: row.address || undefined,
        security: row.security || undefined,
        securityLevel: row.security_level as 'low' | 'medium' | 'high',
        securityInfo: row.security || undefined,
        isActive: true,
        priority: 'medium',
        latitude: row.latitude || undefined,
        longitude: row.longitude || undefined,
        geofenceRadiusFt: row.geofence_radius_ft || 300,
        createdAt: row.created_at ? new Date(row.created_at) : undefined,
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
      }));

      console.log(`✅ Loaded ${buildings.length} buildings from Supabase`);
      
      await AsyncStorage.setItem(STORAGE_KEYS.BUILDINGS, JSON.stringify(buildings));
      
      return buildings;
    } catch (error) {
      console.error('❌ Failed to load buildings from Supabase:', error);
      const localData = await AsyncStorage.getItem(STORAGE_KEYS.BUILDINGS);
      if (localData) {
        return JSON.parse(localData);
      }
      return [];
    }
  }, []);

  const loadCleanersFromSupabase = useCallback(async (): Promise<Cleaner[]> => {
    try {
      console.log('🔄 Loading cleaners from Supabase...');
      
      const { data, error } = await supabase
        .from('cleaners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading cleaners from Supabase:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ No cleaners found in Supabase');
        return [];
      }

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
        default_hourly_rate: row.default_hourly_rate || 15.00,
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

      console.log(`✅ Loaded ${cleaners.length} cleaners from Supabase`);
      
      await AsyncStorage.setItem(STORAGE_KEYS.CLEANERS, JSON.stringify(cleaners));
      
      return cleaners;
    } catch (error) {
      console.error('❌ Failed to load cleaners from Supabase:', error);
      const localData = await AsyncStorage.getItem(STORAGE_KEYS.CLEANERS);
      if (localData) {
        return JSON.parse(localData);
      }
      return [];
    }
  }, []);

  const loadData = useCallback(async () => {
    if (loadingRef.current) {
      console.log('⚠️ Load already in progress, skipping...');
      return;
    }
    
    try {
      console.log('🔄 === LOADING ALL CLIENT DATA ===');
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      const [clientsData, buildingsData, cleanersData] = await Promise.all([
        loadClientsFromSupabase(),
        loadBuildingsFromSupabase(),
        loadCleanersFromSupabase(),
      ]);

      setClients(clientsData);
      setClientBuildings(buildingsData);
      setCleaners(cleanersData);

      console.log('✅ === ALL CLIENT DATA LOADED SUCCESSFULLY ===');
      console.log(`   - Clients: ${clientsData.length}`);
      console.log(`   - Buildings: ${buildingsData.length}`);
      console.log(`   - Cleaners: ${cleanersData.length}`);
    } catch (err) {
      console.error('❌ Error loading client data:', err);
      setError('Failed to load client data');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [loadClientsFromSupabase, loadBuildingsFromSupabase, loadCleanersFromSupabase]);

  const refreshData = useCallback(async () => {
    console.log('🔄 === REFRESHING ALL CLIENT DATA ===');
    loadingRef.current = false;
    await loadData();
  }, [loadData]);

  const saveClients = useCallback(async (newClients: Client[]) => {
    console.log('💾 Saving clients to state and storage');
    setClients(newClients);
    await AsyncStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(newClients));
  }, []);

  const saveBuildings = useCallback(async (newBuildings: ClientBuilding[]) => {
    console.log('💾 Saving buildings to state and storage');
    setClientBuildings(newBuildings);
    await AsyncStorage.setItem(STORAGE_KEYS.BUILDINGS, JSON.stringify(newBuildings));
  }, []);

  const saveCleaners = useCallback(async (newCleaners: Cleaner[]) => {
    console.log('💾 Saving cleaners to state and storage');
    setCleaners(newCleaners);
    await AsyncStorage.setItem(STORAGE_KEYS.CLEANERS, JSON.stringify(newCleaners));
  }, []);

  const addClient = useCallback(async (client: Omit<Client, 'id'> | Client) => {
    try {
      const newClient = 'id' in client ? client : { ...client, id: `client-${Date.now()}` };
      
      console.log('🔄 Adding client to Supabase:', newClient.name);
      
      const { error } = await supabase
        .from('clients')
        .insert({
          id: newClient.id,
          name: newClient.name,
          security_level: newClient.securityLevel,
          security: newClient.securityInfo || newClient.security || null,
          is_active: newClient.isActive !== false,
          color: newClient.color || '#3B82F6',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('❌ Error adding client to Supabase:', error);
        throw error;
      }

      console.log('✅ Client added to Supabase successfully');
      
      await refreshData();
    } catch (error) {
      console.error('❌ Failed to add client to Supabase, saving locally:', error);
      const updatedClients = [...clients, newClient];
      await saveClients(updatedClients);
    }
  }, [clients, saveClients, refreshData]);

  const updateClient = useCallback(async (clientId: string, updates: Partial<Client>) => {
    try {
      console.log('🔄 Updating client in Supabase:', clientId);
      
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.securityLevel !== undefined) updateData.security_level = updates.securityLevel;
      if (updates.securityInfo !== undefined) updateData.security = updates.securityInfo || null;
      if (updates.security !== undefined) updateData.security = updates.security || null;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.color !== undefined) updateData.color = updates.color;
      
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);

      if (error) {
        console.error('❌ Error updating client in Supabase:', error);
        throw error;
      }

      console.log('✅ Client updated in Supabase successfully');
      
      await refreshData();
    } catch (error) {
      console.error('❌ Failed to update client in Supabase, updating locally:', error);
      const updatedClients = clients.map(client =>
        client.id === clientId ? { ...client, ...updates, updatedAt: new Date() } : client
      );
      await saveClients(updatedClients);
    }
  }, [clients, saveClients, refreshData]);

  const deleteClient = useCallback(async (clientId: string) => {
    const updatedClients = clients.filter(client => client.id !== clientId);
    await saveClients(updatedClients);
  }, [clients, saveClients]);

  const addClientBuilding = useCallback(async (building: Omit<ClientBuilding, 'id'> | ClientBuilding) => {
    try {
      const newBuilding = 'id' in building ? building : { ...building, id: `building-${Date.now()}` };

      console.log('🔄 Adding building to Supabase:', newBuilding.buildingName);

      // Geocode address if provided and no coordinates exist
      let latitude = newBuilding.latitude;
      let longitude = newBuilding.longitude;

      if (newBuilding.address && !isValidCoordinates(latitude, longitude)) {
        console.log('🌍 Geocoding address:', newBuilding.address);
        const geocodeResult = await geocodeAddress(newBuilding.address);
        if (geocodeResult.success) {
          latitude = geocodeResult.latitude;
          longitude = geocodeResult.longitude;
          console.log('✅ Geocoded successfully:', latitude, longitude);
        } else {
          console.warn('⚠️ Geocoding failed:', geocodeResult.error);
        }
      }

      const { error } = await supabase
        .from('client_buildings')
        .insert({
          id: newBuilding.id,
          client_name: newBuilding.clientName,
          building_name: newBuilding.buildingName,
          security_level: newBuilding.securityLevel,
          security: newBuilding.securityInfo || newBuilding.security || null,
          address: newBuilding.address || null,
          latitude: latitude || null,
          longitude: longitude || null,
          geofence_radius_ft: newBuilding.geofenceRadiusFt || 300,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('❌ Error adding building to Supabase:', error);
        throw error;
      }

      console.log('✅ Building added to Supabase successfully');

      await refreshData();
    } catch (error) {
      console.error('❌ Failed to add building to Supabase, saving locally:', error);
      const updatedBuildings = [...clientBuildings, newBuilding];
      await saveBuildings(updatedBuildings);
    }
  }, [clientBuildings, saveBuildings, refreshData]);

  const updateClientBuilding = useCallback(async (buildingId: string, updates: Partial<ClientBuilding>) => {
    try {
      console.log('🔄 Updating building in Supabase:', buildingId);

      const updateData: any = {};
      if (updates.buildingName !== undefined) updateData.building_name = updates.buildingName;
      if (updates.clientName !== undefined) updateData.client_name = updates.clientName;
      if (updates.securityLevel !== undefined) updateData.security_level = updates.securityLevel;
      if (updates.securityInfo !== undefined) updateData.security = updates.securityInfo || null;
      if (updates.security !== undefined) updateData.security = updates.security || null;
      if (updates.address !== undefined) updateData.address = updates.address || null;
      if (updates.geofenceRadiusFt !== undefined) updateData.geofence_radius_ft = updates.geofenceRadiusFt;

      // If address is being updated, geocode it
      if (updates.address && !isValidCoordinates(updates.latitude, updates.longitude)) {
        console.log('🌍 Geocoding updated address:', updates.address);
        const geocodeResult = await geocodeAddress(updates.address);
        if (geocodeResult.success) {
          updateData.latitude = geocodeResult.latitude;
          updateData.longitude = geocodeResult.longitude;
          console.log('✅ Geocoded successfully:', geocodeResult.latitude, geocodeResult.longitude);
        } else {
          console.warn('⚠️ Geocoding failed:', geocodeResult.error);
        }
      } else if (updates.latitude !== undefined || updates.longitude !== undefined) {
        // Manual coordinate update
        if (updates.latitude !== undefined) updateData.latitude = updates.latitude;
        if (updates.longitude !== undefined) updateData.longitude = updates.longitude;
      }

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('client_buildings')
        .update(updateData)
        .eq('id', buildingId);

      if (error) {
        console.error('❌ Error updating building in Supabase:', error);
        throw error;
      }

      console.log('✅ Building updated in Supabase successfully');

      await refreshData();
    } catch (error) {
      console.error('❌ Failed to update building in Supabase, updating locally:', error);
      const updatedBuildings = clientBuildings.map(building =>
        building.id === buildingId ? { ...building, ...updates, updatedAt: new Date() } : building
      );
      await saveBuildings(updatedBuildings);
    }
  }, [clientBuildings, saveBuildings, refreshData]);

  const deleteClientBuilding = useCallback(async (buildingId: string) => {
    const updatedBuildings = clientBuildings.filter(building => building.id !== buildingId);
    await saveBuildings(updatedBuildings);
  }, [clientBuildings, saveBuildings]);

  const addCleaner = useCallback(async (cleaner: Omit<Cleaner, 'id'> | Cleaner) => {
    const newCleaner = 'id' in cleaner ? cleaner : { ...cleaner, id: `cleaner-${Date.now()}` };
    
    try {
      console.log('🔄 Adding cleaner to Supabase:', newCleaner.name);
      
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
        console.error('❌ Error adding cleaner to Supabase:', error);
        throw error;
      }

      console.log('✅ Cleaner added to Supabase successfully');
      
      await refreshData();
    } catch (error) {
      console.error('❌ Failed to add cleaner to Supabase, saving locally:', error);
      const updatedCleaners = [...cleaners, newCleaner];
      await saveCleaners(updatedCleaners);
    }
  }, [cleaners, saveCleaners, refreshData]);

  const updateCleaner = useCallback(async (cleanerId: string, updates: Partial<Cleaner>) => {
    try {
      console.log('🔄 Updating cleaner in Supabase:', cleanerId);
      
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
        console.error('❌ Error updating cleaner in Supabase:', error);
        throw error;
      }

      console.log('✅ Cleaner updated in Supabase successfully');
      
      await refreshData();
    } catch (error) {
      console.error('❌ Failed to update cleaner in Supabase, updating locally:', error);
      const updatedCleaners = cleaners.map(cleaner =>
        cleaner.id === cleanerId ? { ...cleaner, ...updates, updatedAt: new Date() } : cleaner
      );
      await saveCleaners(updatedCleaners);
    }
  }, [cleaners, saveCleaners, refreshData]);

  const deleteCleaner = useCallback(async (cleanerId: string) => {
    try {
      console.log('🔄 Deleting cleaner from Supabase:', cleanerId);
      
      const { error } = await supabase
        .from('cleaners')
        .delete()
        .eq('id', cleanerId);

      if (error) {
        console.error('❌ Error deleting cleaner from Supabase:', error);
        throw error;
      }

      console.log('✅ Cleaner deleted from Supabase successfully');
      
      await refreshData();
    } catch (error) {
      console.error('❌ Failed to delete cleaner from Supabase, deleting locally:', error);
      const updatedCleaners = cleaners.filter(cleaner => cleaner.id !== cleanerId);
      await saveCleaners(updatedCleaners);
    }
  }, [cleaners, saveCleaners, refreshData]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Geocode all buildings that have addresses but no coordinates
  const geocodeAllBuildings = useCallback(async (): Promise<{ success: number; failed: number }> => {
    console.log('🌍 Starting batch geocoding of all buildings...');
    let success = 0;
    let failed = 0;

    const buildingsToGeocode = clientBuildings.filter(
      b => b.address && !isValidCoordinates(b.latitude, b.longitude)
    );

    console.log(`📍 Found ${buildingsToGeocode.length} buildings to geocode`);

    for (const building of buildingsToGeocode) {
      if (!building.address) continue;

      console.log(`🔄 Geocoding: ${building.buildingName} - ${building.address}`);
      const result = await geocodeAddress(building.address);

      if (result.success) {
        try {
          const { error } = await supabase
            .from('client_buildings')
            .update({
              latitude: result.latitude,
              longitude: result.longitude,
              updated_at: new Date().toISOString(),
            })
            .eq('id', building.id);

          if (!error) {
            success++;
            console.log(`✅ Geocoded ${building.buildingName}: ${result.latitude}, ${result.longitude}`);
          } else {
            failed++;
            console.error(`❌ Failed to save coordinates for ${building.buildingName}:`, error);
          }
        } catch (err) {
          failed++;
          console.error(`❌ Error updating ${building.buildingName}:`, err);
        }
      } else {
        failed++;
        console.warn(`⚠️ Could not geocode ${building.buildingName}: ${result.error}`);
      }

      // Rate limiting: wait 1 second between requests (Nominatim requirement)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`🏁 Batch geocoding complete: ${success} success, ${failed} failed`);

    // Refresh data to get updated coordinates
    await refreshData();

    return { success, failed };
  }, [clientBuildings, refreshData]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
    refreshData,
    geocodeAllBuildings,
  };
};
