/**
 * Authentication Hooks
 * React hooks for managing authentication state
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  getSession,
  clearSession,
  isAuthenticated,
  hasRole,
  hasMinRoleLevel,
  getRoleDisplayName,
  UserSession,
  ROLE_LEVELS,
} from '../utils/auth';

/**
 * Hook to get current user session
 */
export function useSession() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const userSession = await getSession();
      setSession(userSession);
    } catch (error) {
      console.error('Error loading session:', error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const refreshSession = useCallback(() => {
    loadSession();
  }, [loadSession]);

  return { session, loading, refreshSession };
}

/**
 * Hook to check authentication status
 */
export function useAuth() {
  const { session, loading, refreshSession } = useSession();
  const router = useRouter();

  const logout = useCallback(async () => {
    try {
      await clearSession();
      router.replace('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, [router]);

  return {
    user: session,
    isAuthenticated: session !== null,
    loading,
    logout,
    refreshSession,
  };
}

/**
 * Hook to protect routes - redirects if not authenticated
 */
export function useProtectedRoute() {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/');
    }
  }, [session, loading, router]);

  return { loading, session };
}

/**
 * Hook to protect routes with role requirement
 * @param minRoleLevel - Minimum role level required (1-4)
 */
export function useRoleProtectedRoute(minRoleLevel: number) {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!session) {
        // Not authenticated - redirect to login
        router.replace('/');
      } else if (session.roleLevel < minRoleLevel) {
        // Authenticated but insufficient role - redirect to their dashboard
        if (session.roleLevel === ROLE_LEVELS.CLEANER) {
          router.replace('/cleaner');
        } else {
          router.replace('/supervisor');
        }
      }
    }
  }, [session, loading, minRoleLevel, router]);

  return { loading, session, hasAccess: session?.roleLevel >= minRoleLevel };
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(roleName: string) {
  const [hasRoleAccess, setHasRoleAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const result = await hasRole(roleName);
        setHasRoleAccess(result);
      } catch (error) {
        console.error('Error checking role:', error);
        setHasRoleAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [roleName]);

  return { hasRole: hasRoleAccess, loading };
}

/**
 * Hook to check if user meets minimum role level
 */
export function useMinRoleLevel(minLevel: number) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLevel = async () => {
      try {
        const result = await hasMinRoleLevel(minLevel);
        setHasAccess(result);
      } catch (error) {
        console.error('Error checking role level:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkLevel();
  }, [minLevel]);

  return { hasAccess, loading };
}

/**
 * Hook to get user role display name
 */
export function useRoleDisplayName() {
  const [displayName, setDisplayName] = useState('Guest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDisplayName = async () => {
      try {
        const name = await getRoleDisplayName();
        setDisplayName(name);
      } catch (error) {
        console.error('Error fetching role display name:', error);
        setDisplayName('Guest');
      } finally {
        setLoading(false);
      }
    };

    fetchDisplayName();
  }, []);

  return { displayName, loading };
}

/**
 * Hook to check if user is authenticated with redirect
 * Returns true if authenticated, redirects to login if not
 */
export function useRequireAuth() {
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        router.replace('/');
      }
      setAuthChecked(true);
    };

    checkAuth();
  }, [router]);

  return authChecked;
}

/**
 * Hook to redirect user based on their role
 * Cleaners go to /cleaner, management goes to /supervisor
 */
export function useRoleBasedRedirect() {
  const { session, loading } = useSession();
  const router = useRouter();

  const redirect = useCallback(() => {
    if (!loading && session) {
      if (session.roleLevel === ROLE_LEVELS.CLEANER) {
        router.replace('/cleaner');
      } else {
        // Supervisor, Manager, Admin all go to management interface
        router.replace('/supervisor');
      }
    }
  }, [session, loading, router]);

  return { redirect, loading, session };
}
