
import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '../app/integrations/supabase/client';
import type { ScheduleEntry } from './useScheduleManager';

interface SyncOptions {
  enabled?: boolean;
  onSync?: () => void;
  onError?: (error: Error) => void;
}

export const useScheduleSync = (options: SyncOptions = {}) => {
  const { enabled = true, onSync, onError } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const channelRef = useRef<any>(null);

  const handleRealtimeChange = useCallback((payload: any) => {
    console.log('📡 Real-time update received:', payload.eventType);
    setLastSync(new Date());
    onSync?.();
  }, [onSync]);

  useEffect(() => {
    if (!enabled) return;

    console.log('🔌 Setting up real-time sync...');

    const channel = supabase
      .channel('schedule-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_entries',
        },
        handleRealtimeChange
      )
      .subscribe((status) => {
        console.log('📡 Sync status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 Cleaning up real-time sync...');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      setIsConnected(false);
    };
  }, [enabled, handleRealtimeChange]);

  return {
    isConnected,
    lastSync,
  };
};
