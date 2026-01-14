
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

const STORAGE_KEY = 'inventory_transfer_logs';

export async function logInventoryTransfer(transfer: Omit<InventoryTransfer, 'id'>): Promise<void> {
  try {
    console.log('Logging inventory transfer:', transfer);
    
    // Calculate total value if not provided
    const totalValue = transfer.totalValue || transfer.items.reduce((sum, item) => {
      return sum + (item.totalCost || 0);
    }, 0);
    
    // Generate unique ID
    const transferWithId: InventoryTransfer = {
      ...transfer,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      totalValue,
    };

    // Fetch existing transfer logs
    const existingLogs = await getInventoryTransferLogs();

    // Append the new transfer to the logs
    const updatedLogs = [...existingLogs, transferWithId];

    // Save the updated logs
    await saveInventoryTransferLogs(updatedLogs);
    
    console.log('Inventory transfer logged successfully with total value:', totalValue);
  } catch (error) {
    console.error('Failed to log inventory transfer:', error);
    throw error;
  }
}

export async function getInventoryTransferLogs(): Promise<InventoryTransfer[]> {
  try {
    const logsJson = await AsyncStorage.getItem(STORAGE_KEY);
    if (!logsJson) {
      return [];
    }
    
    const logs = JSON.parse(logsJson);
    console.log(`Retrieved ${logs.length} inventory transfer logs`);
    return logs;
  } catch (error) {
    console.error('Failed to retrieve inventory transfer logs:', error);
    return [];
  }
}

export async function saveInventoryTransferLogs(logs: InventoryTransfer[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    console.log(`Saved ${logs.length} inventory transfer logs`);
  } catch (error) {
    console.error('Failed to save inventory transfer logs:', error);
    throw error;
  }
}

export async function deleteInventoryTransferLog(transferId: string): Promise<void> {
  try {
    const existingLogs = await getInventoryTransferLogs();
    const updatedLogs = existingLogs.filter(log => log.id !== transferId);
    await saveInventoryTransferLogs(updatedLogs);
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
