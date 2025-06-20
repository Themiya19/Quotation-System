import { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import { formatExternalType, Feature } from '@/lib/permissions';

export function useExternalPermissions() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  // Load features and set user role
  useEffect(() => {
    const loadFeatures = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/external-features');
        const data = await response.json();
        setFeatures(data.features);

        // Get user role from cookie
        const externalType = Cookies.get('externalType');
        if (externalType) {
          setUserRole(formatExternalType(externalType));
        }
      } catch (error) {
        console.error('Error loading external features:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeatures();
  }, []);

  // Function to check permission with current state (not real-time)
  const hasPermission = useCallback((featureId: string): boolean => {
    if (features.length === 0 || !userRole) {
      return false;
    }

    const feature = features.find(f => f.id === featureId);
    if (!feature) {
      return false;
    }

    return feature.allowedRoles.includes(userRole);
  }, [features, userRole]);

  // Function to check permission in real-time by fetching from server
  const checkPermissionRealtime = useCallback(async (featureId: string): Promise<boolean> => {
    try {
      setLastChecked(new Date());
      
      // Refresh our role from cookie first
      const currentRole = Cookies.get('externalType');
      if (!currentRole) {
        return false;
      }
      
      const formattedRole = formatExternalType(currentRole);
      
      // Only update state if it's different
      if (formattedRole !== userRole) {
        setUserRole(formattedRole);
      }
      
      // Fetch fresh features from server
      const response = await fetch('/api/external-features');
      if (!response.ok) {
        throw new Error('Failed to fetch features');
      }
      
      const data = await response.json();
      const freshFeatures: Feature[] = data.features;
      
      // Update our features if they've changed
      if (JSON.stringify(freshFeatures) !== JSON.stringify(features)) {
        setFeatures(freshFeatures);
      }
      
      // Find the requested feature
      const feature = freshFeatures.find(f => f.id === featureId);
      if (!feature) {
        return false;
      }
      
      // Check if user has permission
      const hasAccess = feature.allowedRoles.includes(formattedRole);
      
      // If no access, show a toast
      if (!hasAccess) {
        toast.error(`You don't have permission to ${feature.name.toLowerCase()}`);
      }
      
      return hasAccess;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }, [features, userRole]);

  // Function to refresh permissions from server
  const refreshPermissions = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/external-features');
      const data = await response.json();
      setFeatures(data.features);
      
      // Also refresh user role from cookie
      const externalType = Cookies.get('externalType');
      if (externalType) {
        setUserRole(formatExternalType(externalType));
      }
      
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error refreshing permissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    features,
    userRole,
    isLoading,
    lastChecked,
    hasPermission,
    checkPermissionRealtime,
    refreshPermissions
  };
} 