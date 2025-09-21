
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Client {
  id: string;
  name: string;
  isActive: boolean;
  color: string;
  security?: string;
  securityLevel: 'low' | 'medium' | 'high';
}

export interface ClientBuilding {
  id: string;
  clientName: string;
  buildingName: string;
  address?: string;
  security?: string;
  securityLevel: 'low' | 'medium' | 'high';
}

export interface Cleaner {
  id: string;
  name: string;
  isActive: boolean;
  avatar?: string;
  specialties: string[];
  employeeId: string; // New field for ID number
  securityLevel: 'low' | 'medium' | 'high'; // New field for security level
  phoneNumber: string; // New field for phone number
  email?: string; // Optional email field
  hireDate?: string; // Optional hire date
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string; // Keep for backward compatibility but won't be used in new forms
  }; // Optional emergency contact
}

const STORAGE_KEYS = {
  CLIENTS: 'clients_v2',
  BUILDINGS: 'client_buildings_v2',
  CLEANERS: 'cleaners_v2',
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
        securityLevel: 'high'
      },
      { 
        id: '2', 
        name: 'MedCenter Hospital', 
        isActive: true, 
        color: '#10B981', 
        security: 'ID check required',
        securityLevel: 'high'
      },
      { 
        id: '3', 
        name: 'Downtown Mall', 
        isActive: true, 
        color: '#F59E0B', 
        security: 'Security desk check-in',
        securityLevel: 'medium'
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
        securityLevel: 'high'
      },
      { 
        id: '2', 
        clientName: 'TechCorp Inc.', 
        buildingName: 'Warehouse', 
        address: '456 Storage Ave',
        security: 'Key code: 1234',
        securityLevel: 'medium'
      },
      { 
        id: '3', 
        clientName: 'MedCenter Hospital', 
        buildingName: 'Emergency Wing', 
        address: '789 Health Blvd',
        security: 'ID check and escort required',
        securityLevel: 'high'
      },
      { 
        id: '4', 
        clientName: 'Downtown Mall', 
        buildingName: 'Food Court', 
        address: '321 Shopping St',
        security: 'Security desk check-in',
        securityLevel: 'medium'
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
        isActive: true, 
        specialties: ['Office Cleaning', 'Deep Cleaning'],
        employeeId: '4',
        securityLevel: 'high',
        phoneNumber: '+1 (555) 123-4567',
        email: 'john.doe@cleaningcompany.com',
        hireDate: '2023-01-15',
        emergencyContact: {
          name: 'Jane Doe',
          phone: '+1 (555) 987-6543',
          relationship: 'Spouse'
        }
      },
      { 
        id: '2', 
        name: 'Jane Smith', 
        isActive: true, 
        specialties: ['Medical Facilities', 'Sanitization'],
        employeeId: '2',
        securityLevel: 'medium',
        phoneNumber: '+1 (555) 234-5678',
        email: 'jane.smith@cleaningcompany.com',
        hireDate: '2023-03-20',
        emergencyContact: {
          name: 'Bob Smith',
          phone: '+1 (555) 876-5432',
          relationship: 'Brother'
        }
      },
      { 
        id: '3', 
        name: 'Johnson Smith', 
        isActive: true, 
        specialties: ['Industrial', 'Equipment Maintenance'],
        employeeId: '9',
        securityLevel: 'low',
        phoneNumber: '+1 (555) 345-6789',
        email: 'johnson.smith@cleaningcompany.com',
        hireDate: '2023-05-10'
      },
    ];
    
    debouncedSave(STORAGE_KEYS.CLEANERS, mockCleaners);
    return mockCleaners;
  }, [debouncedSave]);

  // Optimized data loading with parallel operations
  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    
    try {
      console.log('Loading client data...');
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      // Load all data in parallel for better performance
      const [clientsData, buildingsData, cleanersData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CLIENTS),
        AsyncStorage.getItem(STORAGE_KEYS.BUILDINGS),
        AsyncStorage.getItem(STORAGE_KEYS.CLEANERS),
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

      // Process cleaners
      if (cleanersData) {
        const parsedCleaners = JSON.parse(cleanersData);
        setCleaners(parsedCleaners);
        cleanersCache.set('all', parsedCleaners);
      } else {
        const mockCleaners = await initializeMockCleaners();
        setCleaners(mockCleaners);
        cleanersCache.set('all', mockCleaners);
      }

      console.log('Client data loaded successfully');
    } catch (err) {
      console.error('Error loading client data:', err);
      setError('Failed to load client data');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [initializeMockBuildings, initializeMockCleaners, initializeMockClients]);

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
  const addClient = useCallback(async (client: Client) => {
    const updatedClients = [...clients, client];
    await saveClients(updatedClients);
  }, [clients, saveClients]);

  const updateClient = useCallback(async (clientId: string, updates: Partial<Client>) => {
    const updatedClients = clients.map(client =>
      client.id === clientId ? { ...client, ...updates } : client
    );
    await saveClients(updatedClients);
  }, [clients, saveClients]);

  const deleteClient = useCallback(async (clientId: string) => {
    const updatedClients = clients.filter(client => client.id !== clientId);
    await saveClients(updatedClients);
  }, [clients, saveClients]);

  const addBuilding = useCallback(async (building: ClientBuilding) => {
    const updatedBuildings = [...clientBuildings, building];
    await saveBuildings(updatedBuildings);
  }, [clientBuildings, saveBuildings]);

  const updateBuilding = useCallback(async (buildingId: string, updates: Partial<ClientBuilding>) => {
    const updatedBuildings = clientBuildings.map(building =>
      building.id === buildingId ? { ...building, ...updates } : building
    );
    await saveBuildings(updatedBuildings);
  }, [clientBuildings, saveBuildings]);

  const deleteBuilding = useCallback(async (buildingId: string) => {
    const updatedBuildings = clientBuildings.filter(building => building.id !== buildingId);
    await saveBuildings(updatedBuildings);
  }, [clientBuildings, saveBuildings]);

  const addCleaner = useCallback(async (cleaner: Cleaner) => {
    const updatedCleaners = [...cleaners, cleaner];
    await saveCleaners(updatedCleaners);
  }, [cleaners, saveCleaners]);

  const updateCleaner = useCallback(async (cleanerId: string, updates: Partial<Cleaner>) => {
    const updatedCleaners = cleaners.map(cleaner =>
      cleaner.id === cleanerId ? { ...cleaner, ...updates } : cleaner
    );
    await saveCleaners(updatedCleaners);
  }, [cleaners, saveCleaners]);

  const deleteCleaner = useCallback(async (cleanerId: string) => {
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
    addBuilding,
    updateBuilding,
    deleteBuilding,
    addCleaner,
    updateCleaner,
    deleteCleaner,
    clearError,
    loadData,
  };
};
