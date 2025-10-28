
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured, TABLES } from '../utils/supabase';

interface DatabaseConfig {
  useSupabase: boolean;
  fallbackToLocal: boolean;
}

interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  syncInProgress: boolean;
}

export const useDatabase = () => {
  const [config, setConfig] = useState<DatabaseConfig>({
    useSupabase: isSupabaseConfigured(),
    fallbackToLocal: true,
  });
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    lastSync: null,
    pendingChanges: 0,
    syncInProgress: false,
  });

  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!config.useSupabase) return false;
    
    try {
      const { error } = await supabase.from(TABLES.CLIENTS).select('count').limit(1);
      const isConnected = !error;
      setSyncStatus(prev => ({ ...prev, isOnline: isConnected }));
      return isConnected;
    } catch (err) {
      console.error('Supabase connection check failed:', err);
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
      return false;
    }
  }, [config.useSupabase]);

  useEffect(() => {
    const initializeDatabase = async () => {
      console.log('Initializing database...');
      
      if (isSupabaseConfigured()) {
        console.log('Supabase is configured, checking connection...');
        const isConnected = await checkConnection();
        
        if (isConnected) {
          console.log('✅ Supabase connection established');
          setConfig(prev => ({ ...prev, useSupabase: true }));
        } else {
          console.log('❌ Supabase connection failed, falling back to local storage');
          setConfig(prev => ({ ...prev, useSupabase: false }));
        }
      } else {
        console.log('Supabase not configured, using local storage only');
        setConfig(prev => ({ ...prev, useSupabase: false }));
      }
    };

    initializeDatabase();
  }, [checkConnection]);

  const executeLocalQuery = useCallback(async <T>(
    operation: 'select' | 'insert' | 'update' | 'delete',
    table: string,
    data?: any,
    filters?: any
  ): Promise<T[]> => {
    const storageKey = `local_${table}`;
    
    try {
      const existingData = await AsyncStorage.getItem(storageKey);
      let records: T[] = existingData ? JSON.parse(existingData) : [];
      
      switch (operation) {
        case 'select':
          if (filters) {
            records = records.filter((record: any) => {
              return Object.entries(filters).every(([key, value]) => record[key] === value);
            });
          }
          return records;
          
        case 'insert':
          const newRecord = Array.isArray(data) ? data : [data];
          records = [...records, ...newRecord];
          await AsyncStorage.setItem(storageKey, JSON.stringify(records));
          return newRecord;
          
        case 'update':
          if (filters) {
            records = records.map((record: any) => {
              const matches = Object.entries(filters).every(([key, value]) => record[key] === value);
              return matches ? { ...record, ...data, updated_at: new Date().toISOString() } : record;
            });
            await AsyncStorage.setItem(storageKey, JSON.stringify(records));
          }
          return records;
          
        case 'delete':
          if (filters) {
            const deletedRecords = records.filter((record: any) => {
              return Object.entries(filters).every(([key, value]) => record[key] === value);
            });
            records = records.filter((record: any) => {
              return !Object.entries(filters).every(([key, value]) => record[key] === value);
            });
            await AsyncStorage.setItem(storageKey, JSON.stringify(records));
            return deletedRecords;
          }
          return [];
          
        default:
          throw new Error(`Unsupported local operation: ${operation}`);
      }
    } catch (err) {
      console.error(`Local storage operation failed:`, err);
      throw err;
    }
  }, []);

  const executeQuery = useCallback(async <T>(
    operation: 'select' | 'insert' | 'update' | 'delete',
    table: string,
    data?: any,
    filters?: any
  ): Promise<T[]> => {
    try {
      if (config.useSupabase && syncStatus.isOnline) {
        console.log(`╔════════════════════════════════════════╗`);
        console.log(`║ SUPABASE ${operation.toUpperCase().padEnd(6)} OPERATION`);
        console.log(`╚════════════════════════════════════════╝`);
        console.log(`Table: ${table}`);
        console.log(`Filters:`, filters);
        console.log(`Data:`, data);
        
        let query = supabase.from(table);
        
        switch (operation) {
          case 'select':
            if (filters) {
              Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
              });
            }
            const { data: selectData, error: selectError } = await query.select('*');
            if (selectError) {
              console.error('SELECT ERROR:', selectError);
              throw selectError;
            }
            console.log(`✓ SELECT returned ${selectData?.length || 0} rows`);
            return selectData || [];
            
          case 'insert':
            const { data: insertData, error: insertError } = await query.insert(data).select();
            if (insertError) {
              console.error('INSERT ERROR:', insertError);
              throw insertError;
            }
            console.log(`✓ INSERT successful, returned ${insertData?.length || 0} rows`);
            return insertData || [];
            
          case 'update':
            let updateQuery = query.update(data);
            if (filters) {
              Object.entries(filters).forEach(([key, value]) => {
                updateQuery = updateQuery.eq(key, value);
              });
            }
            const { data: updateData, error: updateError } = await updateQuery.select();
            if (updateError) {
              console.error('UPDATE ERROR:', updateError);
              throw updateError;
            }
            console.log(`✓ UPDATE successful, returned ${updateData?.length || 0} rows`);
            return updateData || [];
            
          case 'delete':
            let deleteQuery = query.delete();
            if (filters) {
              Object.entries(filters).forEach(([key, value]) => {
                deleteQuery = deleteQuery.eq(key, value);
              });
            }
            const { data: deleteData, error: deleteError } = await deleteQuery.select();
            if (deleteError) {
              console.error('DELETE ERROR:', deleteError);
              throw deleteError;
            }
            console.log(`✓ DELETE successful, returned ${deleteData?.length || 0} rows`);
            return deleteData || [];
            
          default:
            throw new Error(`Unsupported operation: ${operation}`);
        }
      } else {
        console.log(`Executing ${operation} on ${table} via AsyncStorage`);
        return await executeLocalQuery<T>(operation, table, data, filters);
      }
    } catch (err) {
      console.error(`╔════════════════════════════════════════╗`);
      console.error(`║ DATABASE OPERATION FAILED             ║`);
      console.error(`╚════════════════════════════════════════╝`);
      console.error(`Operation: ${operation}`);
      console.error(`Table: ${table}`);
      console.error('Error:', err);
      setError(`Database operation failed: ${err}`);
      
      if (config.fallbackToLocal && config.useSupabase) {
        console.log('Falling back to local storage...');
        return await executeLocalQuery<T>(operation, table, data, filters);
      }
      
      throw err;
    }
  }, [config, syncStatus.isOnline, executeLocalQuery]);

  const syncToSupabase = useCallback(async () => {
    if (!config.useSupabase || !syncStatus.isOnline) {
      console.log('Sync skipped: Supabase not available');
      return;
    }

    setSyncStatus(prev => ({ ...prev, syncInProgress: true }));
    
    try {
      console.log('Starting sync to Supabase...');
      
      const tables = [TABLES.CLIENTS, TABLES.CLIENT_BUILDINGS, TABLES.CLEANERS, TABLES.SCHEDULE_ENTRIES];
      
      for (const table of tables) {
        const localData = await executeLocalQuery('select', table);
        
        if (localData.length > 0) {
          console.log(`Syncing ${localData.length} records from ${table}`);
          
          const { error } = await supabase.from(table).upsert(localData);
          
          if (error) {
            console.error(`Sync failed for ${table}:`, error);
          } else {
            console.log(`✅ Synced ${table} successfully`);
          }
        }
      }
      
      setSyncStatus(prev => ({ 
        ...prev, 
        lastSync: new Date(), 
        pendingChanges: 0,
        syncInProgress: false 
      }));
      
      console.log('✅ Sync completed successfully');
    } catch (err) {
      console.error('Sync failed:', err);
      setError(`Sync failed: ${err}`);
      setSyncStatus(prev => ({ ...prev, syncInProgress: false }));
    }
  }, [config.useSupabase, syncStatus.isOnline, executeLocalQuery]);

  const syncFromSupabase = useCallback(async () => {
    if (!config.useSupabase || !syncStatus.isOnline) {
      console.log('Sync skipped: Supabase not available');
      return;
    }

    try {
      console.log('Starting sync from Supabase...');
      
      const tables = [TABLES.CLIENTS, TABLES.CLIENT_BUILDINGS, TABLES.CLEANERS, TABLES.SCHEDULE_ENTRIES];
      
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        
        if (error) {
          console.error(`Sync failed for ${table}:`, error);
          continue;
        }
        
        if (data && data.length > 0) {
          console.log(`Syncing ${data.length} records to local ${table}`);
          const storageKey = `local_${table}`;
          await AsyncStorage.setItem(storageKey, JSON.stringify(data));
        }
      }
      
      console.log('✅ Sync from Supabase completed successfully');
    } catch (err) {
      console.error('Sync from Supabase failed:', err);
      setError(`Sync from Supabase failed: ${err}`);
    }
  }, [config.useSupabase, syncStatus.isOnline]);

  useEffect(() => {
    if (syncStatus.isOnline && syncStatus.pendingChanges > 0) {
      console.log('Auto-syncing pending changes...');
      syncToSupabase();
    }
  }, [syncStatus.isOnline, syncStatus.pendingChanges, syncToSupabase]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const enableSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Please set environment variables.');
      return false;
    }
    
    const isConnected = await checkConnection();
    if (isConnected) {
      setConfig(prev => ({ ...prev, useSupabase: true }));
      await syncFromSupabase();
      return true;
    } else {
      setError('Failed to connect to Supabase');
      return false;
    }
  }, [checkConnection, syncFromSupabase]);

  const disableSupabase = useCallback(() => {
    setConfig(prev => ({ ...prev, useSupabase: false }));
    setSyncStatus(prev => ({ ...prev, isOnline: false }));
  }, []);

  return {
    config,
    syncStatus,
    error,
    executeQuery,
    executeLocalQuery,
    syncToSupabase,
    syncFromSupabase,
    checkConnection,
    enableSupabase,
    disableSupabase,
    clearError,
    isSupabaseConfigured: isSupabaseConfigured(),
  };
};
