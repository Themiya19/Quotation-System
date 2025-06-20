"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateInternalRoleState } from "@/lib/permissions";
import type { UserData } from "@/lib/user";

export function InternalRoleListener() {
  const [showPermissionChangedDialog, setShowPermissionChangedDialog] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [initialRender, setInitialRender] = useState(true);
  const [isAccountDeleted, setIsAccountDeleted] = useState(false);

  useEffect(() => {
    // Skip first render to avoid SSR issues
    if (initialRender) {
      setInitialRender(false);
      return;
    }

    const checkForRoleUpdates = async () => {
      try {
        const email = Cookies.get('userEmail');
        const userType = Cookies.get('accessType');
        
        // Only run for internal users
        if (!email || userType !== 'internal') return;
        
        const response = await fetch(`/api/auth/users`);
        
        if (response.ok) {
          const data = await response.json();
          const userData = data.users.find((u: UserData) => u.email === email);
          
          // Check if user account no longer exists (was deleted)
          if (!userData) {
            console.log('User account not found - may have been deleted');
            
            // Set account deleted flag
            setIsAccountDeleted(true);
            
            // Show account deleted dialog and block UI
            setIsBlocked(true);
            setShowPermissionChangedDialog(true);
            
            // Clear cookies after a short delay
            setTimeout(() => {
              // Clear all cookies
              Object.keys(Cookies.get()).forEach(cookie => {
                Cookies.remove(cookie);
              });
              
              // Redirect to login
              window.location.href = '/login';
            }, 3000);
            
            return;
          }
          
          if (userData && userData.type === 'internal') {
            const currentInternalType = Cookies.get('internalType');
            const newInternalType = userData.internalType || '';
            
            // If role has changed, update cookie
            if (currentInternalType !== newInternalType) {
              console.log('Internal role changed from', currentInternalType, 'to', newInternalType);
              
              // Update cookie with the new role
              updateInternalRoleState(newInternalType);
              
              // Immediately block UI interactions and show a modal
              setIsBlocked(true);
              setShowPermissionChangedDialog(true);
              
              // Still reload after a short delay to ensure everything is updated
              setTimeout(() => {
                window.location.reload();
              }, 3000);
            }
          }
        }
      } catch (error) {
        console.error('Error checking for role updates:', error);
      }
    };
    
    // Check immediately on mount
    checkForRoleUpdates();
    
    // Set up interval to check periodically (every 10 seconds)
    const intervalId = setInterval(checkForRoleUpdates, 10000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [initialRender]);

  // If blocked, create a full-screen overlay to prevent any interactions
  if (isBlocked) {
    return (
      <>
        <div className="fixed inset-0 bg-background/80 z-50" 
             style={{ pointerEvents: 'all', backdropFilter: 'blur(2px)' }}>
        </div>
        <Dialog open={showPermissionChangedDialog} onOpenChange={setShowPermissionChangedDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{isAccountDeleted ? 'Account Deleted' : 'Permissions Changed'}</DialogTitle>
              <DialogDescription>
                {isAccountDeleted ? (
                  'Your account has been deleted by an administrator. You will be redirected to the login page.'
                ) : (
                  'Your account permissions have been updated by an administrator. The page will reload momentarily to apply these changes.'
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center mt-4">
              <Button onClick={() => {
                if (isAccountDeleted) {
                  // Clear all cookies
                  Object.keys(Cookies.get()).forEach(cookie => {
                    Cookies.remove(cookie);
                  });
                  // Redirect to login
                  window.location.href = '/login';
                } else {
                  window.location.reload();
                }
              }}>
                {isAccountDeleted ? 'Go to Login' : 'Reload Now'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // This component doesn't render anything when not blocked
  return null;
} 