/**
 * Permission Hooks
 * React hooks for checking user permissions
 */

import { useState, useEffect, useCallback } from 'react';
import {
  hasPermission,
  getPermissionLevel,
  getAllPermissions,
  clearPermissionCache,
} from '../utils/permissions';

/**
 * Hook to check if user has a specific permission
 * @param permissionModule - Permission module to check
 */
export function useHasPermission(permissionModule: string) {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await hasPermission(permissionModule);
        setAllowed(result);
      } catch (error) {
        console.error('Error checking permission:', error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permissionModule]);

  return { allowed, loading };
}

/**
 * Hook to get user's permission level for a module
 * @param permissionModule - Permission module to check
 */
export function usePermissionLevel(permissionModule: string) {
  const [level, setLevel] = useState<string>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLevel = async () => {
      try {
        const result = await getPermissionLevel(permissionModule);
        setLevel(result);
      } catch (error) {
        console.error('Error fetching permission level:', error);
        setLevel('none');
      } finally {
        setLoading(false);
      }
    };

    fetchLevel();
  }, [permissionModule]);

  return { level, loading };
}

/**
 * Hook to get all user permissions
 */
export function useAllPermissions() {
  const [permissions, setPermissions] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAllPermissions();
      setPermissions(result);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions(new Map());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const refreshPermissions = useCallback(() => {
    clearPermissionCache();
    fetchPermissions();
  }, [fetchPermissions]);

  return { permissions, loading, refreshPermissions };
}

/**
 * Hook to check multiple permissions at once
 * @param permissionModules - Array of permission modules to check
 */
export function useMultiplePermissions(permissionModules: string[]) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const results: Record<string, boolean> = {};
        await Promise.all(
          permissionModules.map(async (module) => {
            results[module] = await hasPermission(module);
          })
        );
        setPermissions(results);
      } catch (error) {
        console.error('Error checking multiple permissions:', error);
        const emptyResults: Record<string, boolean> = {};
        permissionModules.forEach((module) => {
          emptyResults[module] = false;
        });
        setPermissions(emptyResults);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [permissionModules.join(',')]); // Use join to make dependency stable

  return { permissions, loading };
}

/**
 * Hook to conditionally render content based on permission
 * @param permissionModule - Permission module to check
 * @param fallback - Content to show if permission denied (optional)
 */
export function usePermissionGuard(permissionModule: string) {
  const { allowed, loading } = useHasPermission(permissionModule);

  const PermissionGuard = useCallback(
    ({
      children,
      fallback = null,
    }: {
      children: React.ReactNode;
      fallback?: React.ReactNode;
    }) => {
      if (loading) return null;
      return allowed ? <>{children}</> : <>{fallback}</>;
    },
    [allowed, loading]
  );

  return { allowed, loading, PermissionGuard };
}
