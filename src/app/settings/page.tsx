"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompanyStore } from "@/lib/companies";
import { toast } from "sonner";
import { checkFeaturePermission } from "@/lib/permissions";

// Import our new components
import UserManagement from "@/components/settings/UserManagement";
import CompanyManagement from "@/components/settings/CompanyManagement";
import FeatureManagement from "@/components/settings/FeatureManagement";
import RoleManagement from "@/components/settings/RoleManagement";
import MyCompanies from "@/components/settings/MyCompanies";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'my-companies'; // Default to my-companies if no tab specified
  
  const [isMounted, setIsMounted] = useState(false);
  const [departments, setDepartments] = useState<Array<{id: string, name: string, description: string}>>([]);
  const [profileRoles, setProfileRoles] = useState([]);
  const [externalRoles, setExternalRoles] = useState([]);
  const [permissions, setPermissions] = useState({
    canManageUsers: false,
    canManageCompanies: false,
    canManageRoles: false,
    canManageFeatures: false,
    canViewRoles: false,
    canManageMyCompany: false
  });
  const { companies, loadCompanies } = useCompanyStore();

  useEffect(() => {
    setIsMounted(true);
    
    const checkPermissions = async () => {
      try {
        // Check user permissions for various settings sections
        const [
          canManageUsers,
          canManageCompanies,
          canManageRoles,
          canManageFeatures,
          canManageMyCompany
        ] = await Promise.all([
          checkFeaturePermission('manage_users'),
          checkFeaturePermission('manage_companies'),
          checkFeaturePermission('manage_roles'),
          checkFeaturePermission('manage_features'),
          checkFeaturePermission('manage_my_company')
        ]);
        
        // User can view roles if they can manage roles OR manage features
        const canViewRoles = canManageRoles || canManageFeatures;
        
        setPermissions({
          canManageUsers,
          canManageCompanies,
          canManageRoles,
          canManageFeatures,
          canViewRoles,
          canManageMyCompany
        });
        
        // Redirect if user is trying to access a tab they don't have permission for
        if ((activeTab === 'users' && !canManageUsers) ||
            (activeTab === 'companies' && !canManageCompanies) ||
            // For roles tab, check if they have permission to at least view roles
            (activeTab === 'roles' && !canViewRoles) ||
            (activeTab === 'features' && !canManageFeatures)) {
          toast.error("You don't have permission to access this page");
          router.push('/settings?tab=my-companies');
          return;
        }
        
        // Load other data if user has permission to be on this page
        loadCompanies();
        
        // Load profile roles
        fetch('/api/roles')
          .then(res => res.json())
          .then(data => {
            const roles = Array.isArray(data) ? data : data.roles || [];
            setProfileRoles(roles);
          })
          .catch(error => {
            console.error('Failed to load roles:', error);
            setProfileRoles([]);
          });
        
        // Load external roles  
        fetch('/api/external-roles')
          .then(res => res.json())
          .then(data => {
            setExternalRoles(data.roles);
          })
          .catch(error => {
            console.error('Failed to load external roles:', error);
            setExternalRoles([]);
          });
          
        // Load departments
        fetch('/api/departments')
          .then(res => res.json())
          .then(data => setDepartments(data))
          .catch(error => console.error('Failed to load departments:', error));
      } catch (error) {
        console.error('Error checking permissions:', error);
        toast.error("An error occurred while checking permissions");
      }
    };
    
    if (typeof window !== 'undefined') {
      checkPermissions();
    }
  }, [router, loadCompanies, activeTab]);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      {activeTab === 'users' && permissions.canManageUsers && (
        <UserManagement 
          companies={companies} 
          profileRoles={profileRoles} 
          externalRoles={externalRoles} 
          departments={departments}
        />
      )}

      {activeTab === 'companies' && permissions.canManageCompanies && (
        <CompanyManagement />
      )}

      {activeTab === 'features' && permissions.canManageFeatures && (
        <FeatureManagement />
      )}

      {activeTab === 'roles' && permissions.canViewRoles && (
        <RoleManagement />
      )}
      
      {activeTab === 'my-companies' && (
        <MyCompanies />
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
} 