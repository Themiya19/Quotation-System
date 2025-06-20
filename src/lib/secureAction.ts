import { toast } from "sonner";
import { checkInternalPermissionRealtime } from "./permissions";
import Cookies from "js-cookie";

/**
 * Securely execute an action with real-time permission check for internal users
 * @param featureId The feature ID to check permission for
 * @param action The action to execute if permission check passes
 * @param onPermissionDenied Optional callback to execute if permission is denied
 */
export async function secureInternalAction<T>(
  featureId: string,
  action: () => Promise<T>,
  onPermissionDenied?: () => void
): Promise<T | undefined> {
  try {
    // Verify user is internal
    const userType = Cookies.get('accessType');
    if (userType !== 'internal') {
      toast.error('You must be an internal user to perform this action');
      onPermissionDenied?.();
      return undefined;
    }

    // Check permission in real-time
    const hasPermission = await checkInternalPermissionRealtime(featureId);
    
    if (!hasPermission) {
      toast.error('You do not have permission to perform this action');
      onPermissionDenied?.();
      return undefined;
    }

    // Execute the action
    return await action();
  } catch (error) {
    console.error('Error executing secure action:', error);
    toast.error('An error occurred while performing this action');
    return undefined;
  }
}

/**
 * Checks if a user has permission to access a feature
 * @param featureId The feature ID to check permission for
 * @returns A promise resolving to true if user has permission, false otherwise
 */
export async function verifyInternalPermission(featureId: string): Promise<boolean> {
  try {
    // Verify user is internal
    const userType = Cookies.get('accessType');
    if (userType !== 'internal') {
      return false;
    }

    // Check permission in real-time
    return await checkInternalPermissionRealtime(featureId);
  } catch (error) {
    console.error('Error verifying permission:', error);
    return false;
  }
} 