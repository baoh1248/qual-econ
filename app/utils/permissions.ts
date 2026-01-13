/**
 * Permission Checking Utilities
 * Handles permission verification based on role-permission matrix
 */

import { supabase } from '../integrations/supabase/client';
import { getSession } from './auth';

/**
 * Permission modules (features) in the system
 */
export const PERMISSIONS = {
  JOB_VIEWING: 'job_viewing',
  JOB_CREATION: 'job_creation',
  JOB_COMPLETION: 'job_completion',
  CLOCK_IN_OUT: 'clock_in_out',
  TIME_SHEETS: 'time_sheets',
  SCHEDULING_BOARD: 'scheduling_board',
  GPS_TRACKING: 'gps_tracking',
  PAYROLL_VIEW: 'payroll_view',
  PAYROLL_EDIT: 'payroll_edit',
  PAY_RATE_MANAGEMENT: 'pay_rate_management',
  CLIENT_LIST_ACCESS: 'client_list_access',
  CLIENT_CONTRACT: 'client_contract',
  EQUIPMENT_TRACKING: 'equipment_tracking',
  CLEANER_MANAGEMENT: 'cleaner_management',
  REPORTS_ANALYTICS: 'reports_analytics',
  MESSAGING: 'messaging',
  ANNOUNCEMENTS: 'announcements',
  PROFILE_MANAGEMENT: 'profile_management',
  TIME_OFF_REQUEST: 'time_off_request',
  JOB_NOTES: 'job_notes',
  SHIFT_ATTENDANCE: 'shift_attendance',
  DATA_IMPORT_EXPORT: 'data_import_export',
  ROLE_PERMISSION_EDIT: 'role_permission_edit',
  BILLING_RATES: 'billing_rates',
  DELETE_DATA_USERS: 'delete_data_users',
} as const;

/**
 * Permission cache to reduce database calls
 */
const permissionCache = new Map<string, Map<string, string>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cacheTimestamp = 0;

/**
 * Clear permission cache
 */
export function clearPermissionCache(): void {
  permissionCache.clear();
  cacheTimestamp = 0;
}

/**
 * Get user's permissions from database
 * @param roleId - User's role ID
 * @returns Map of permission module to access level
 */
async function fetchUserPermissions(roleId: string): Promise<Map<string, string>> {
  // Check cache
  const now = Date.now();
  if (permissionCache.has(roleId) && now - cacheTimestamp < CACHE_DURATION) {
    return permissionCache.get(roleId)!;
  }

  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        access_level,
        permissions!inner(module)
      `)
      .eq('role_id', roleId);

    if (error) throw error;

    const permissions = new Map<string, string>();
    data?.forEach((item: any) => {
      permissions.set(item.permissions.module, item.access_level);
    });

    // Update cache
    permissionCache.set(roleId, permissions);
    cacheTimestamp = now;

    return permissions;
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return new Map();
  }
}

/**
 * Check if user has a specific permission
 * @param permissionModule - Permission module to check
 * @returns True if user has access (access level is not 'none')
 */
export async function hasPermission(permissionModule: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const permissions = await fetchUserPermissions(session.roleId);
  const accessLevel = permissions.get(permissionModule);

  return accessLevel !== undefined && accessLevel !== 'none';
}

/**
 * Get user's access level for a specific permission
 * @param permissionModule - Permission module to check
 * @returns Access level string or 'none' if no access
 */
export async function getPermissionLevel(permissionModule: string): Promise<string> {
  const session = await getSession();
  if (!session) return 'none';

  const permissions = await fetchUserPermissions(session.roleId);
  return permissions.get(permissionModule) || 'none';
}

/**
 * Check if user can view all jobs (company-wide or team-wide)
 */
export async function canViewAllJobs(): Promise<boolean> {
  const level = await getPermissionLevel(PERMISSIONS.JOB_VIEWING);
  return ['view_team', 'view_company_wide', 'full_control'].includes(level);
}

/**
 * Check if user can create/edit jobs
 */
export async function canManageJobs(): Promise<boolean> {
  const level = await getPermissionLevel(PERMISSIONS.JOB_CREATION);
  return level !== 'none';
}

/**
 * Check if user can approve job completions
 */
export async function canApproveJobs(): Promise<boolean> {
  const level = await getPermissionLevel(PERMISSIONS.JOB_COMPLETION);
  return ['review_approve', 'full_access', 'full_control'].includes(level);
}

/**
 * Check if user can view all time sheets
 */
export async function canViewAllTimeSheets(): Promise<boolean> {
  const level = await getPermissionLevel(PERMISSIONS.TIME_SHEETS);
  return ['teams_time_sheets', 'view_everyone', 'full_control'].includes(level);
}

/**
 * Check if user can manage the schedule board
 */
export async function canManageSchedule(): Promise<boolean> {
  const level = await getPermissionLevel(PERMISSIONS.SCHEDULING_BOARD);
  return ['manage_team', 'full_access', 'full_control'].includes(level);
}

/**
 * Check if user can view all GPS locations
 */
export async function canViewAllGPS(): Promise<boolean> {
  const level = await getPermissionLevel(PERMISSIONS.GPS_TRACKING);
  return ['view_all_team', 'full_access', 'full_control'].includes(level);
}

/**
 * Check if user can view payroll
 */
export async function canViewPayroll(): Promise<boolean> {
  return await hasPermission(PERMISSIONS.PAYROLL_VIEW);
}

/**
 * Check if user can edit payroll
 */
export async function canEditPayroll(): Promise<boolean> {
  return await hasPermission(PERMISSIONS.PAYROLL_EDIT);
}

/**
 * Check if user can manage pay rates
 */
export async function canManagePayRates(): Promise<boolean> {
  return await hasPermission(PERMISSIONS.PAY_RATE_MANAGEMENT);
}

/**
 * Check if user can view all clients
 */
export async function canViewAllClients(): Promise<boolean> {
  const level = await getPermissionLevel(PERMISSIONS.CLIENT_LIST_ACCESS);
  return ['view_edit_clients', 'full_control'].includes(level);
}

/**
 * Check if user can manage client contracts
 */
export async function canManageContracts(): Promise<boolean> {
  const level = await getPermissionLevel(PERMISSIONS.CLIENT_CONTRACT);
  return ['view_only', 'full_control'].includes(level);
}

/**
 * Check if user can manage inventory/equipment
 */
export async function canManageInventory(): Promise<boolean> {
  const level = await getPermissionLevel(PERMISSIONS.EQUIPMENT_TRACKING);
  return level !== 'none';
}

/**
 * Check if user can manage cleaners
 */
export async function canManageCleaners(): Promise<boolean> {
  return await hasPermission(PERMISSIONS.CLEANER_MANAGEMENT);
}

/**
 * Check if user can view all reports
 */
export async function canViewAllReports(): Promise<boolean> {
  const level = await getPermissionLevel(PERMISSIONS.REPORTS_ANALYTICS);
  return ['all_reports', 'full_access', 'full_control'].includes(level);
}

/**
 * Check if user can send company-wide messages
 */
export async function canSendBroadcast(): Promise<boolean> {
  const level = await getPermissionLevel(PERMISSIONS.MESSAGING);
  return ['company_broadcast', 'full_control'].includes(level);
}

/**
 * Check if user can send announcements
 */
export async function canSendAnnouncements(): Promise<boolean> {
  const level = await getPermissionLevel(PERMISSIONS.ANNOUNCEMENTS);
  return level !== 'none' && level !== 'receive_only';
}

/**
 * Check if user can edit other users' profiles
 */
export async function canEditOtherProfiles(): Promise<boolean> {
  const level = await getPermissionLevel(PERMISSIONS.PROFILE_MANAGEMENT);
  return ['edit_any_employee', 'full_access', 'full_control'].includes(level);
}

/**
 * Check if user can approve time off requests
 */
export async function canApproveTimeOff(): Promise<boolean> {
  const level = await getPermissionLevel(PERMISSIONS.TIME_OFF_REQUEST);
  return level !== 'none' && level !== 'can_request';
}

/**
 * Check if user can edit roles and permissions
 */
export async function canEditRoles(): Promise<boolean> {
  return await hasPermission(PERMISSIONS.ROLE_PERMISSION_EDIT);
}

/**
 * Check if user can delete data/users
 */
export async function canDeleteData(): Promise<boolean> {
  return await hasPermission(PERMISSIONS.DELETE_DATA_USERS);
}

/**
 * Check if user can access management features
 * @returns True if user is supervisor or higher
 */
export async function isManagementUser(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return session.roleLevel >= 2; // Supervisor and above
}

/**
 * Check if user can only see their own data
 * @returns True if user is a cleaner (level 1)
 */
export async function isRestrictedUser(): Promise<boolean> {
  const session = await getSession();
  if (!session) return true;
  return session.roleLevel === 1; // Cleaner only
}

/**
 * Get all permissions for current user
 * @returns Map of permission module to access level
 */
export async function getAllPermissions(): Promise<Map<string, string>> {
  const session = await getSession();
  if (!session) return new Map();

  return await fetchUserPermissions(session.roleId);
}

/**
 * Permission display names for UI
 */
export const PERMISSION_NAMES: Record<string, string> = {
  [PERMISSIONS.JOB_VIEWING]: 'Job Viewing',
  [PERMISSIONS.JOB_CREATION]: 'Job Creation/Editing',
  [PERMISSIONS.JOB_COMPLETION]: 'Job Completion Reporting',
  [PERMISSIONS.CLOCK_IN_OUT]: 'Clock In/Out',
  [PERMISSIONS.TIME_SHEETS]: 'Time Sheets',
  [PERMISSIONS.SCHEDULING_BOARD]: 'Scheduling Board',
  [PERMISSIONS.GPS_TRACKING]: 'GPS Tracking',
  [PERMISSIONS.PAYROLL_VIEW]: 'Payroll View',
  [PERMISSIONS.PAYROLL_EDIT]: 'Payroll Edit',
  [PERMISSIONS.PAY_RATE_MANAGEMENT]: 'Pay Rate Management',
  [PERMISSIONS.CLIENT_LIST_ACCESS]: 'Client List Access',
  [PERMISSIONS.CLIENT_CONTRACT]: 'Client Contract Management',
  [PERMISSIONS.EQUIPMENT_TRACKING]: 'Equipment/Supply Tracking',
  [PERMISSIONS.CLEANER_MANAGEMENT]: 'Cleaner Management',
  [PERMISSIONS.REPORTS_ANALYTICS]: 'Reports & Analytics',
  [PERMISSIONS.MESSAGING]: 'Messaging/Chat',
  [PERMISSIONS.ANNOUNCEMENTS]: 'Announcements',
  [PERMISSIONS.PROFILE_MANAGEMENT]: 'Profile Management',
  [PERMISSIONS.TIME_OFF_REQUEST]: 'Time Off Requests',
  [PERMISSIONS.JOB_NOTES]: 'Job Notes & Attachments',
  [PERMISSIONS.SHIFT_ATTENDANCE]: 'Shift & Attendance Tracking',
  [PERMISSIONS.DATA_IMPORT_EXPORT]: 'Data Import/Export',
  [PERMISSIONS.ROLE_PERMISSION_EDIT]: 'Role/Permission Editing',
  [PERMISSIONS.BILLING_RATES]: 'Billing/Select Billing Rates',
  [PERMISSIONS.DELETE_DATA_USERS]: 'Delete Data/Users',
};
