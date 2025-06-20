import Cookies from 'js-cookie';

export interface Feature {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
}

// Enhanced function to check internal user permissions in real-time
export async function checkFeaturePermission(featureId: string): Promise<boolean> {
  try {
    // Get user type and internal type from cookies
    const userType = Cookies.get('accessType');
    const internalType = Cookies.get('internalType');

    // If user is not internal, they don't have access to these features
    if (userType !== 'internal' || !internalType) {
      return false;
    }

    // Always fetch fresh data from the API
    const response = await fetch('/api/features');
    if (!response.ok) {
      console.error('Failed to fetch features:', response.statusText);
      return false;
    }
    
    const data = await response.json();
    const features = Array.isArray(data) ? data : data.features || [];

    // Find the specific feature
    const feature = features.find((f: Feature) => f.id === featureId);
    if (!feature) {
      console.error(`Feature ${featureId} not found`);
      return false;
    }

    // Check if user's role is in the allowed roles
    const hasPermission = feature.allowedRoles.includes(internalType);
    console.log(`Permission check for ${featureId}: ${hasPermission} (User role: ${internalType})`);
    return hasPermission;
  } catch (error) {
    console.error('Error checking feature permission:', error);
    return false;
  }
}

// Function to check permission that can be used on the client side for external users
export async function checkPermissionRealtime(featureId: string): Promise<boolean> {
  try {
    // Get current user role from cookie
    const currentRole = Cookies.get('externalType');
    
    if (!currentRole) {
      console.warn('No role found in cookies');
      return false;
    }
    
    // Fetch the latest features from the server
    const response = await fetch('/api/external-features');
    if (!response.ok) {
      console.error('Failed to fetch features');
      return false;
    }
    
    const data = await response.json();
    const features: Feature[] = data.features;
    
    // Find the requested feature
    const feature = features.find((f: Feature) => f.id === featureId);
    if (!feature) {
      console.warn(`Feature ${featureId} not found`);
      return false;
    }
    
    // Check if the current role has permission
    return feature.allowedRoles.includes(currentRole);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

// Create a custom hook for internal permissions
export async function checkInternalPermissionRealtime(featureId: string): Promise<boolean> {
  try {
    // Get user type and internal role from cookies
    const userType = Cookies.get('accessType');
    const internalRole = Cookies.get('internalType');
    
    if (userType !== 'internal' || !internalRole) {
      console.warn('Not an internal user or missing role');
      return false;
    }
    
    // Fetch latest features from server
    const response = await fetch('/api/features');
    if (!response.ok) {
      throw new Error('Failed to fetch features');
    }
    
    const data = await response.json();
    const features = Array.isArray(data) ? data : data.features || [];
    
    // Find the requested feature
    const feature = features.find((f: Feature) => f.id === featureId);
    if (!feature) {
      console.warn(`Feature ${featureId} not found`);
      return false;
    }
    
    // Check if user has permission
    const hasAccess = feature.allowedRoles.includes(internalRole);
    
    return hasAccess;
  } catch (error) {
    console.error('Error checking internal permission:', error);
    return false;
  }
}

// Function to format external type consistently
export function formatExternalType(externalType: string | undefined): string {
  if (!externalType) return 'ext_client'; // Default role
  return externalType.startsWith('ext_') ? externalType : `ext_${externalType}`;
}

// Function to update cookies and state after role change
export function updateRoleState(
  newRole: string,
  setUserRole?: (role: string) => void,
  setFeatures?: (features: Feature[]) => void,
  features?: Feature[]
): void {
  const formattedRole = formatExternalType(newRole);
  
  // Update cookie
  Cookies.set('externalType', formattedRole, { expires: 7 });
  
  // Update state if setters are provided
  if (setUserRole) {
    setUserRole(formattedRole);
  }
  
  if (setFeatures && features) {
    setFeatures(features);
  }
}

// Function to update internal role state
export function updateInternalRoleState(
  newRole: string,
  setRole?: (role: string) => void
): void {
  // Update cookie
  Cookies.set('internalType', newRole, { expires: 7 });
  
  // Update state if setter is provided
  if (setRole) {
    setRole(newRole);
  }
}

// Function to get user role
export const getUserRole = (): string | null => {
  const role = Cookies.get('internalType');
  return role || null;
};

// Function to check if user is admin
export const isAdmin = (): boolean => {
  return Cookies.get('internalType') === 'admin';
};

// Function to check if user is internal
export const isInternalUser = (): boolean => {
  return Cookies.get('accessType') === 'internal';
};

// Helper function specifically for checking analytics permission
export async function hasAnalyticsPermission(): Promise<boolean> {
  try {
    // Get user type and internal type from cookies
    const userType = Cookies.get('accessType');
    const internalType = Cookies.get('internalType');

    // If user is not internal, they don't have access
    if (userType !== 'internal' || !internalType) {
      return false;
    }

    // Fetch features from API
    const response = await fetch('/api/features');
    if (!response.ok) {
      console.error('Failed to fetch features:', response.statusText);
      return false;
    }
    
    const data = await response.json();
    const features = Array.isArray(data) ? data : data.features || [];

    // Find the analytics feature
    const analyticsFeature = features.find((f: Feature) => f.id === 'view_quotation_analytics');
    if (!analyticsFeature) {
      console.error('Analytics feature not found');
      return false;
    }

    // Check if user's role is allowed
    const hasPermission = analyticsFeature.allowedRoles.includes(internalType);
    return hasPermission;
  } catch (error) {
    console.error('Error checking analytics permission:', error);
    return false;
  }
} 