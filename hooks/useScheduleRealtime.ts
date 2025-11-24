
/**
 * useScheduleRealtime Hook
 * Improved realtime synchronization with better error handling and reconnection logic
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '../app/integrations/supabase/client';
import { scheduleService } from '../services/scheduleService';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeSyncOptions {
  enabled?: boolean;
  cleanerName?: string;
  onSyncComplete?: () => void;
  onError?: (error: Error) => void;
}

export function useScheduleRealtime(options: RealtimeSyncOptions = {}) {
  const { enabled = true, cleanerName, onSyncComplete, onError } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const processingRef = useRef(false);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  /**
   * Handle INSERT events
   */
  const handleInsert = useCallback(
    async (payload: any) => {
      // Prevent duplicate processing
      if (processingRef.current) {
        console.log('⏸️ Already processing an event, skipping...');
        return;
      }

      try {
        processingRef.current = true;
        console.log('📨 Realtime INSERT:', payload.new.id);
        
        const entry = scheduleService.fromDatabaseEntry(payload.new);

        // Filter by cleaner if specified
        if (cleanerName) {
          const cleaners = entry.cleanerNames || [entry.cleanerName];
          if (!cleaners.includes(cleanerName)) {
            return;
          }
        }

        // Update local cache
        const weekId = entry.weekId || scheduleService.getWeekId(new Date(entry.date));
        const currentSchedule = await scheduleService.getWeekSchedule(weekId, true);
        
        // Check if entry already exists
        if (currentSchedule.some(e => e.id === entry.id)) {
          console.log('⏭️ Entry already exists, skipping insert');
          return;
        }

        // Clear cache to force reload
        scheduleService.clearWeekCache(weekId);
        
        setLastSyncTime(new Date());
        onSyncComplete?.();
      } catch (error) {
        console.error('Error handling INSERT:', error);
        onError?.(error as Error);
      } finally {
        processingRef.current = false;
      }
    },
    [cleanerName, onSyncComplete, onError]
  );

  /**
   * Handle UPDATE events
   */
  const handleUpdate = useCallback(
    async (payload: any) => {
      // Prevent duplicate processing
      if (processingRef.current) {
        console.log('⏸️ Already processing an event, skipping...');
        return;
      }

      try {
        processingRef.current = true;
        console.log('📨 Realtime UPDATE:', payload.new.id);
        
        const entry = scheduleService.fromDatabaseEntry(payload.new);

        // Filter by cleaner if specified
        if (cleanerName) {
          const cleaners = entry.cleanerNames || [entry.cleanerName];
          if (!cleaners.includes(cleanerName)) {
            return;
          }
        }

        // Clear cache to force reload
        const weekId = entry.weekId || scheduleService.getWeekId(new Date(entry.date));
        scheduleService.clearWeekCache(weekId);
        
        setLastSyncTime(new Date());
        onSyncComplete?.();
      } catch (error) {
        console.error('Error handling UPDATE:', error);
        onError?.(error as Error);
      } finally {
        processingRef.current = false;
      }
    },
    [cleanerName, onSyncComplete, onError]
  );

  /**
   * Handle DELETE events
   */
  const handleDelete = useCallback(
    async (payload: any) => {
      // Prevent duplicate processing
      if (processingRef.current) {
        console.log('⏸️ Already processing an event, skipping...');
        return;
      }

      try {
        processingRef.current = true;
        console.log('📨 Realtime DELETE:', payload.old.id);
        
        const weekId = payload.old.week_id;
        const entryId = payload.old.id;

        if (!weekId || !entryId) {
          return;
        }

        // Clear cache to force reload
        scheduleService.clearWeekCache(weekId);
        
        setLastSyncTime(new Date());
        onSyncComplete?.();
      } catch (error) {
        console.error('Error handling DELETE:', error);
        onError?.(error as Error);
      } finally {
        processingRef.current = false;
      }
    },
    [onSyncComplete, onError]
  );

  /**
   * Setup realtime subscription
   */
  const setupSubscription = useCallback(() => {
    if (!enabled) return;

    console.log('🔌 Setting up realtime subscription...');

    const channel = supabase
      .channel('schedule-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'schedule_entries',
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'schedule_entries',
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'schedule_entries',
        },
        handleDelete
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          attemptReconnect();
        }
      });

    channelRef.current = channel;
  }, [enabled, handleInsert, handleUpdate, handleDelete]);

  /**
   * Attempt to reconnect
   */
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Max reconnection attempts reached');
      onError?.(new Error('Failed to establish realtime connection'));
      return;
    }

    reconnectAttemptsRef.current++;
    console.log(`🔄 Reconnection attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      setupSubscription();
    }, RECONNECT_DELAY * reconnectAttemptsRef.current);
  }, [setupSubscription, onError]);

  /**
   * Cleanup subscription
   */
  const cleanup = useCallback(() => {
    console.log('🔌 Cleaning up realtime subscription...');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // Setup on mount
  useEffect(() => {
    setupSubscription();
    return cleanup;
  }, [setupSubscription, cleanup]);

  return {
    isConnected,
    lastSyncTime,
  };
}
