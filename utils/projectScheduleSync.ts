
import { ScheduleEntry } from '../hooks/useScheduleStorage';

interface ClientProject {
  id: string;
  client_name: string;
  building_name?: string;
  project_name: string;
  description?: string;
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_scheduled_date?: string;
  status: 'active' | 'completed' | 'cancelled' | 'on-hold';
  notes?: string;
  billing_amount?: number;
  is_included_in_contract?: boolean;
  work_order_number?: string;
  invoice_number?: string;
}

/**
 * Get the day of week from a date string
 */
export function getDayOfWeek(dateStr: string): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' {
  const date = new Date(dateStr);
  const days: ('sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[] = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];
  return days[date.getDay()] as any;
}

/**
 * Get the week ID from a date string
 */
export function getWeekIdFromDate(dateStr: string): string {
  const date = new Date(dateStr);
  const startOfWeek = new Date(date);
  const dayOfWeek = startOfWeek.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(startOfWeek.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const year = startOfWeek.getFullYear();
  const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
  const day = String(startOfWeek.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert a project with a scheduled date to a schedule entry
 */
export function projectToScheduleEntry(project: ClientProject): Omit<ScheduleEntry, 'id'> | null {
  if (!project.next_scheduled_date || project.status !== 'active') {
    return null;
  }

  const date = project.next_scheduled_date;
  const day = getDayOfWeek(date);
  const weekId = getWeekIdFromDate(date);

  // Build notes: project name header + any project notes
  const noteParts = [`Project: ${project.project_name}`];
  if (project.description) noteParts.push(project.description);
  if (project.notes) noteParts.push(project.notes);
  if (project.work_order_number) noteParts.push(`WO#: ${project.work_order_number}`);
  if (project.invoice_number) noteParts.push(`INV#: ${project.invoice_number}`);

  // Use flat rate if billing_amount is set and not contract-included
  const hasBillingAmount = typeof project.billing_amount === 'number' && project.billing_amount > 0;
  const isBillable = hasBillingAmount && !project.is_included_in_contract;

  return {
    clientName: project.client_name,
    buildingName: project.building_name || project.client_name,
    cleanerName: 'Unassigned',
    cleanerNames: [],
    day,
    date,
    hours: 4, // Default 4 hours
    startTime: '09:00',
    endTime: '13:00',
    status: 'scheduled',
    weekId,
    notes: noteParts.join('\n'),
    priority: 'medium',
    paymentType: isBillable ? 'flat_rate' : 'hourly',
    flatRateAmount: isBillable ? project.billing_amount : undefined,
    hourlyRate: 15,
    // Mark this as a project-based shift
    isProject: true,
    projectId: project.id,
    projectName: project.project_name,
  };
}

/**
 * Check if a schedule entry already exists for a project
 */
export function scheduleEntryExistsForProject(
  scheduleEntries: ScheduleEntry[],
  project: ClientProject
): boolean {
  if (!project.next_scheduled_date) {
    return false;
  }

  return scheduleEntries.some(entry => 
    entry.clientName === project.client_name &&
    entry.date === project.next_scheduled_date &&
    (entry.projectId === project.id || entry.notes?.includes(project.project_name))
  );
}
