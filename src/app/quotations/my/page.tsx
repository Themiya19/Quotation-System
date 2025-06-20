"use client";

import { QuotationsTable } from "@/components/quotations/quotations-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getAllQuotations, approveQuotation, rejectQuotation, requestReviseQuotation, deleteQuotation } from "@/lib/quotations";
import { useState, useEffect } from "react";
import { type Quotation } from "@/types/quotation";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { checkInternalPermissionRealtime } from '@/lib/permissions';
import { secureInternalAction } from '@/lib/secureAction';
import Cookies from 'js-cookie';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

// Add Feature interface for type safety
interface Feature {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
}

// Utility function for department filtering
function filterQuotationsByDepartment(quotations: Quotation[], userDepartment: string) {
  return quotations.filter(q => q.createdByDepartment === userDepartment);
}

export default function MyQuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [user, setUser] = useState<{ email: string; role: string; department: string } | null>(null);
  const [permissions, setPermissions] = useState({
    canCreateQuotation: false,
    canApproveQuotations: false,
    canRejectQuotations: false,
    canRequestRevision: false,
    canEditQuotations: false,
    canDeleteQuotations: false,
    canApproveClientActions: false
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<string | null>(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      }
    }
  };

  // Load user info from cookies once
  useEffect(() => {
    const email = Cookies.get('userEmail') || '';
    const role = Cookies.get('internalType') || '';
    const department = Cookies.get('department') || '';
    setUser({ email, role, department });
  }, []);

  // Load features and quotations after user info is available
  useEffect(() => {
    const fetchFeaturesAndQuotations = async () => {
      setIsLoading(true);
      try {
        const [featuresRes, allQuotations] = await Promise.all([
          fetch('/api/features').then(res => res.json()),
          getAllQuotations()
        ]);
        setFeatures(featuresRes);
        if (user) {
          // Filter by user
          let filtered = allQuotations.filter(q => q.createdBy === user.email);
          // Check if department filtering is enabled
          const viewDepartmentFeature = featuresRes.find((f: Feature) => f.id === 'view_department_data');
          const shouldFilterByDepartment = viewDepartmentFeature?.allowedRoles.includes(user.role);
          if (shouldFilterByDepartment) {
            filtered = filterQuotationsByDepartment(filtered, user.department);
          }
          setQuotations(filtered);
        }
      } catch {
        toast.error("Failed to load quotations");
      } finally {
        setIsLoading(false);
      }
    };
    if (user) fetchFeaturesAndQuotations();
  }, [user]);

  // Permissions
  useEffect(() => {
    const checkAllPermissions = async () => {
      try {
        let featuresData = features;
        if (features.length === 0) {
          const response = await fetch('/api/features');
          featuresData = await response.json();
          setFeatures(featuresData);
        }
        const userRole = user?.role;
        const hasPermission = (featureId: string) => {
          const feature = featuresData.find((f: Feature) => f.id === featureId);
          return feature?.allowedRoles.includes(userRole || '') || false;
        };
        setPermissions({
          canCreateQuotation: hasPermission('create_quotations'),
          canApproveQuotations: hasPermission('approve_quotations'),
          canRejectQuotations: hasPermission('approve_quotations'),
          canRequestRevision: hasPermission('approve_quotations'),
          canEditQuotations: hasPermission('edit_quotations'),
          canDeleteQuotations: hasPermission('delete_quotations'),
          canApproveClientActions: hasPermission('approve_client_actions')
        });
      } catch {
        setPermissions({
          canCreateQuotation: false,
          canApproveQuotations: false,
          canRejectQuotations: false,
          canRequestRevision: false,
          canEditQuotations: false,
          canDeleteQuotations: false,
          canApproveClientActions: false
        });
      }
    };
    if (user) checkAllPermissions();
    setIsMounted(true);
  }, [user, features]);

  const handleApprove = async (id: string) => {
    await secureInternalAction(
      'approve_quotations',
      async () => {
        try {
          const updated = await approveQuotation(id);
          if (updated) {
            setQuotations(prevQuotations => 
              prevQuotations.map(quotation => 
                quotation.id === id ? updated : quotation
              )
            );
            toast.success('Quotation approved successfully');
          } else {
            toast.error('Failed to approve quotation');
          }
        } catch (error) {
          console.error('Error approving quotation:', error);
          toast.error('Failed to approve quotation');
        }
      }
    );
  };

  const handleReject = async (id: string) => {
    await secureInternalAction(
      'approve_quotations',
      async () => {
        try {
          const updated = await rejectQuotation(id);
          if (updated) {
            setQuotations(prevQuotations => 
              prevQuotations.map(quotation => 
                quotation.id === id ? updated : quotation
              )
            );
            toast.success('Quotation rejected successfully');
          } else {
            toast.error('Failed to reject quotation');
          }
        } catch (error) {
          console.error('Error rejecting quotation:', error);
          toast.error('Failed to reject quotation');
        }
      }
    );
  };

  const handleRequestRevise = async (id: string) => {
    await secureInternalAction(
      'approve_quotations',
      async () => {
        try {
          const updated = await requestReviseQuotation(id);
          if (updated) {
            setQuotations(prevQuotations => 
              prevQuotations.map(quotation => 
                quotation.id === id ? updated : quotation
              )
            );
            toast.success('Revision requested successfully');
          } else {
            toast.error('Failed to request revision');
          }
        } catch (error) {
          console.error('Error requesting revision:', error);
          toast.error('Failed to request revision');
        }
      }
    );
  };

  const handleRevise = async (id: string) => {
    await secureInternalAction(
      'approve_quotations',
      async () => {
        try {
          router.push(`/quotations/revise/${id}`);
        } catch (error) {
          console.error('Error navigating to revise page:', error);
          toast.error('Failed to navigate to revise page');
        }
      }
    );
  };

  const handleEdit = async (id: string) => {
    await secureInternalAction(
      'edit_quotations',
      async () => {
        try {
          router.push(`/quotations/edit/${id}`);
        } catch (error) {
          console.error('Error navigating to edit page:', error);
          toast.error('Failed to navigate to edit page');
        }
      }
    );
  };

  const handleDelete = async (id: string) => {
    const hasPermission = await checkInternalPermissionRealtime('delete_quotations');
    if (!hasPermission) {
      toast.error("You don't have permission to delete quotations");
      return;
    }
    
    setQuotationToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!quotationToDelete) return;

    await secureInternalAction(
      'delete_quotations',
      async () => {
        try {
          await deleteQuotation(quotationToDelete);
          setQuotations(prevQuotations => 
            prevQuotations.filter(quotation => quotation.id !== quotationToDelete)
          );
          toast.success('Quotation deleted successfully');
          setIsDeleteDialogOpen(false);
          setQuotationToDelete(null);
        } catch (error) {
          console.error('Error deleting quotation:', error);
          toast.error('Failed to delete quotation');
        }
      }
    );
  };

  const handleClientApprove = async () => {
    await secureInternalAction(
      'approve_client_actions',
      async () => {
        try {
          // Implement client approval logic if needed
          toast.success('Client approval processed successfully');
        } catch (error) {
          console.error('Error processing client approval:', error);
          toast.error('Failed to process client approval');
        }
      }
    );
  };

  const handleClientReject = async () => {
    await secureInternalAction(
      'approve_client_actions',
      async () => {
        try {
          // Implement client rejection logic if needed
          toast.success('Client rejection processed successfully');
        } catch (error) {
          console.error('Error processing client rejection:', error);
          toast.error('Failed to process client rejection');
        }
      }
    );
  };

  // Determine if department filtering is active
  const departmentFilteringActive = !!(user?.department && features?.find(f =>
    f.id === 'view_department_data' &&
    f.allowedRoles.includes(user.role)
  ));

  if (!isMounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Quotations</h1>
            {user?.department && features?.find(f =>
              f.id === 'view_department_data' &&
              f.allowedRoles.includes(user.role)
            ) && (
              <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                {user.department} department view only
              </span>
            )}
          </div>
          <div className="flex gap-4">
            {permissions.canCreateQuotation && (
              <Button asChild>
                <Link href="/quotations/new">Create New Quotation</Link>
              </Button>
            )}
          </div>
        </div>

        <QuotationsTable
          quotations={quotations}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestRevise={handleRequestRevise}
          onRevise={handleRevise}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClientApprove={handleClientApprove}
          onClientReject={handleClientReject}
          isLoading={isLoading}
          permissions={permissions}
          hideDepartmentFilter={departmentFilteringActive}
        />

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Quotation</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this quotation? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto px-4 py-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div 
        className="flex justify-between items-center mb-6" 
        variants={itemVariants}
      >
        <div>
          <h1 className="text-2xl font-bold">My Quotations</h1>
          {user?.department && features?.find(f =>
            f.id === 'view_department_data' &&
            f.allowedRoles.includes(user.role)
          ) && (
            <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              {user.department} department view only
            </span>
          )}
        </div>
        <div className="flex gap-4">
          {permissions.canCreateQuotation && (
            <Button asChild>
              <Link href="/quotations/new">Create New Quotation</Link>
            </Button>
          )}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <QuotationsTable
          quotations={quotations}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestRevise={handleRequestRevise}
          onRevise={handleRevise}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClientApprove={handleClientApprove}
          onClientReject={handleClientReject}
          isLoading={isLoading}
          permissions={permissions}
          hideDepartmentFilter={departmentFilteringActive}
        />
      </motion.div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quotation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this quotation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
} 