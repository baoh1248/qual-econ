
import { supabase } from '../app/integrations/supabase/client';

export interface InventoryTransferItem {
  name: string;
  quantity: number;
  unit: string;
  unitCost?: number;
  totalCost?: number;
}

export interface InventoryTransfer {
  id: string;
  items: InventoryTransferItem[];
  destination: string;
  timestamp: string; // ISO 8601 format
  transferredBy: string;
  notes?: string;
  totalValue?: number;
  type: 'outgoing' | 'incoming'; // 'outgoing' = to client, 'incoming' = from supplier
  source?: string; // For incoming transfers, name of supplier
  orderNumber?: string; // For incoming transfers, order/invoice number
}

export async function logInventoryTransfer(transfer: Omit<InventoryTransfer, 'id'>): Promise<void> {
  try {
    // Calculate total value if not provided
    const totalValue = transfer.totalValue || transfer.items.reduce((sum, item) => {
      return sum + (item.totalCost || 0);
    }, 0);

    // Generate unique ID
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    const { error } = await supabase
      .from('inventory_transfers')
      .insert({
        id,
        items: transfer.items,
        destination: transfer.destination,
        timestamp: transfer.timestamp,
        transferred_by: transfer.transferredBy,
        notes: transfer.notes || null,
        total_value: totalValue,
        type: transfer.type || 'outgoing',
        source: transfer.source || null,
        order_number: transfer.orderNumber || null,
      });

    if (error) {
      throw error;
    }

    console.log('Inventory transfer logged successfully with total value:', totalValue);
  } catch (error) {
    console.error('Failed to log inventory transfer:', error);
    throw error;
  }
}

export async function getInventoryTransferLogs(): Promise<InventoryTransfer[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_transfers')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      throw error;
    }

    // Map database columns to app interface
    const logs: InventoryTransfer[] = (data || []).map((row: any) => ({
      id: row.id,
      items: row.items || [],
      destination: row.destination || '',
      timestamp: row.timestamp,
      transferredBy: row.transferred_by || '',
      notes: row.notes || undefined,
      totalValue: parseFloat(row.total_value) || 0,
      type: row.type || 'outgoing',
      source: row.source || undefined,
      orderNumber: row.order_number || undefined,
    }));

    console.log(`Retrieved ${logs.length} inventory transfer logs`);
    return logs;
  } catch (error) {
    console.error('Failed to retrieve inventory transfer logs:', error);
    return [];
  }
}

export async function saveInventoryTransferLogs(logs: InventoryTransfer[]): Promise<void> {
  // This function is no longer needed with Supabase (individual inserts/deletes handle everything).
  // Kept for backward compatibility but should not be called.
  console.warn('saveInventoryTransferLogs is deprecated with Supabase storage');
}

export async function deleteInventoryTransferLog(transferId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('inventory_transfers')
      .delete()
      .eq('id', transferId);

    if (error) {
      throw error;
    }

    console.log(`Deleted inventory transfer log: ${transferId}`);
  } catch (error) {
    console.error('Failed to delete inventory transfer log:', error);
    throw error;
  }
}

export function formatTransferSummary(transfer: InventoryTransfer): string {
  const itemSummaries = transfer.items.map(item =>
    `${item.quantity} ${item.name}`
  );

  const date = new Date(transfer.timestamp);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = date.toLocaleDateString([], { month: '2-digit', day: '2-digit' });

  if (transfer.type === 'incoming') {
    const source = transfer.source || 'Supplier';
    return `${itemSummaries.join(' and ')} received from ${source} at ${timeString} on ${dateString}`;
  } else {
    return `${itemSummaries.join(' and ')} sent to ${transfer.destination} at ${timeString} on ${dateString}`;
  }
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
