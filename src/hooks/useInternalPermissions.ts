import { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { toast } from 'sonner';

interface Feature {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
}

export function useInternalPermissions() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  // Load features and set user role
  useEffect(() => {
    const loadFeatures = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/features');
        const data = await response.json();
        
        // Make sure we get an array of features
        const featuresArray = Array.isArray(data) ? data : data.features || [];
        setFeatures(featuresArray);

        // Get user role from cookie
        const internalType = Cookies.get('internalType');
        if (internalType) {
          setUserRole(internalType);
        }
      } catch (error) {
        console.error('Error loading internal features:', error);
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
      const currentRole = Cookies.get('internalType');
      if (!currentRole) {
        return false;
      }
      
      // Only update state if it's different
      if (currentRole !== userRole) {
        setUserRole(currentRole);
      }
      
      // Fetch fresh features from server
      const response = await fetch('/api/features');
      if (!response.ok) {
        throw new Error('Failed to fetch features');
      }
      
      const data = await response.json();
      // Make sure we get an array of features
      const freshFeatures: Feature[] = Array.isArray(data) ? data : data.features || [];
      
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
      const hasAccess = feature.allowedRoles.includes(currentRole);
      
      // If no access, show a toast
      if (!hasAccess) {
        toast.error(`You don't have permission to access this feature`);
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
      const response = await fetch('/api/features');
      const data = await response.json();
      // Make sure we get an array of features
      const featuresArray = Array.isArray(data) ? data : data.features || [];
      setFeatures(featuresArray);
      
      // Also refresh user role from cookie
      const internalType = Cookies.get('internalType');
      if (internalType) {
        setUserRole(internalType);
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