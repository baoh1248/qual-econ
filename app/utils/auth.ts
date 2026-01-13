/**
 * Authentication Utilities
 * Handles password hashing, verification, and session management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Session storage keys
export const AUTH_KEYS = {
  USER_ID: 'user_id',
  USER_NAME: 'user_name',
  USER_PHONE: 'user_phone',
  USER_ROLE: 'user_role',
  USER_ROLE_LEVEL: 'user_role_level',
  USER_ROLE_ID: 'user_role_id',
  SESSION_TOKEN: 'session_token',
  LAST_LOGIN: 'last_login',
};

/**
 * Hash a password using SHA-256
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hash - Stored password hash
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const inputHash = await hashPassword(password);
    return inputHash === hash;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * User session data interface
 */
export interface UserSession {
  id: string;
  name: string;
  phone: string;
  role: string;
  roleLevel: number;
  roleId: string;
  lastLogin: string;
}

/**
 * Save user session to AsyncStorage
 * @param session - User session data
 */
export async function saveSession(session: UserSession): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [AUTH_KEYS.USER_ID, session.id],
      [AUTH_KEYS.USER_NAME, session.name],
      [AUTH_KEYS.USER_PHONE, session.phone],
      [AUTH_KEYS.USER_ROLE, session.role],
      [AUTH_KEYS.USER_ROLE_LEVEL, session.roleLevel.toString()],
      [AUTH_KEYS.USER_ROLE_ID, session.roleId],
      [AUTH_KEYS.LAST_LOGIN, session.lastLogin],
    ]);
  } catch (error) {
    console.error('Error saving session:', error);
    throw new Error('Failed to save session');
  }
}

/**
 * Get current user session from AsyncStorage
 * @returns User session or null if not logged in
 */
export async function getSession(): Promise<UserSession | null> {
  try {
    const keys = Object.values(AUTH_KEYS);
    const values = await AsyncStorage.multiGet(keys);
    const sessionData: Record<string, string | null> = {};

    values.forEach(([key, value]) => {
      sessionData[key] = value;
    });

    if (!sessionData[AUTH_KEYS.USER_ID]) {
      return null;
    }

    return {
      id: sessionData[AUTH_KEYS.USER_ID]!,
      name: sessionData[AUTH_KEYS.USER_NAME] || '',
      phone: sessionData[AUTH_KEYS.USER_PHONE] || '',
      role: sessionData[AUTH_KEYS.USER_ROLE] || '',
      roleLevel: parseInt(sessionData[AUTH_KEYS.USER_ROLE_LEVEL] || '0'),
      roleId: sessionData[AUTH_KEYS.USER_ROLE_ID] || '',
      lastLogin: sessionData[AUTH_KEYS.LAST_LOGIN] || '',
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Clear user session from AsyncStorage
 */
export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(AUTH_KEYS));

    // Also clear legacy cleaner session keys
    await AsyncStorage.multiRemove(['cleaner_id', 'cleaner_name', 'cleaner_phone']);
  } catch (error) {
    console.error('Error clearing session:', error);
    throw new Error('Failed to clear session');
  }
}

/**
 * Check if user is authenticated
 * @returns True if user has valid session
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Check if user has a specific role
 * @param requiredRole - Role name to check
 * @returns True if user has the role
 */
export async function hasRole(requiredRole: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return session.role === requiredRole;
}

/**
 * Check if user has minimum role level
 * Role levels: 1=Cleaner, 2=Supervisor, 3=Manager, 4=Admin
 * @param minLevel - Minimum role level required
 * @returns True if user meets or exceeds the level
 */
export async function hasMinRoleLevel(minLevel: number): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return session.roleLevel >= minLevel;
}

/**
 * Check if user is a cleaner (level 1)
 */
export async function isCleaner(): Promise<boolean> {
  return hasRole('cleaner');
}

/**
 * Check if user is supervisor or higher (level >= 2)
 */
export async function isManagement(): Promise<boolean> {
  return hasMinRoleLevel(2);
}

/**
 * Check if user is admin (level 4)
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole('admin');
}

/**
 * Get user's role display name
 */
export async function getRoleDisplayName(): Promise<string> {
  const session = await getSession();
  if (!session) return 'Guest';

  const roleNames: Record<string, string> = {
    cleaner: 'Cleaner',
    supervisor: 'Supervisor',
    manager: 'Manager',
    admin: 'Admin/Owner',
  };

  return roleNames[session.role] || session.role;
}

/**
 * Validate phone number format
 * @param phone - Phone number to validate
 * @returns True if valid format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Must be 10 digits (US format)
  return cleaned.length === 10;
}

/**
 * Format phone number for display
 * @param phone - Phone number to format
 * @returns Formatted phone number (XXX) XXX-XXXX
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length !== 10) {
    return phone;
  }

  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
}

/**
 * Clean phone number for storage
 * @param phone - Phone number to clean
 * @returns Digits only
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Generate a random session token
 */
export async function generateSessionToken(): Promise<string> {
  return await Crypto.randomUUID();
}

/**
 * Role level constants
 */
export const ROLE_LEVELS = {
  CLEANER: 1,
  SUPERVISOR: 2,
  MANAGER: 3,
  ADMIN: 4,
} as const;

/**
 * Role name constants
 */
export const ROLES = {
  CLEANER: 'cleaner',
  SUPERVISOR: 'supervisor',
  MANAGER: 'manager',
  ADMIN: 'admin',
} as const;
