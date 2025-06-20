"use client";

import { QuotationsTable } from "@/components/quotations/quotations-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getAllQuotations, approveQuotation, rejectQuotation, requestReviseQuotation, deleteQuotation, clientApproveQuotation, clientRejectQuotation } from "@/lib/quotations";
import { useState, useEffect, useCallback } from "react";
import { type Quotation } from "@/types/quotation";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {  checkInternalPermissionRealtime } from '@/lib/permissions';
import { secureInternalAction } from '@/lib/secureAction';
import Cookies from 'js-cookie';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/ui/file-upload";

type Feature = {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
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
  
  // PO Dialog state
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [currentQuotationId, setCurrentQuotationId] = useState<string | null>(null);
  const [poNumber, setPoNumber] = useState("");
  const [poFile, setPoFile] = useState<File | null>(null);
  
  // Flag to track if we've already loaded quotations
  const [quotationsLoaded, setQuotationsLoaded] = useState(false);

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

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
      }
    }
  };

  const loadQuotations = useCallback(async () => {
    if (quotationsLoaded) return; // Prevent double loading
    
    try {
      setIsLoading(true);
      const data = await getAllQuotations();
      
      // Get user info from cookies
      // const userEmail = Cookies.get('userEmail');
      const userType = Cookies.get('internalType');
      const userDepartment = Cookies.get('department');
      
      // Check if user has department-only viewing permission
      // Fetch features to check permissions
      const response = await fetch('/api/features');
      const features = await response.json();
      // Store features in state for use in UI
      setFeatures(features);
      
      const viewDepartmentFeature = features.find((f: Feature) => f.id === 'view_department_data');
      const shouldFilterByDepartment = viewDepartmentFeature?.allowedRoles.includes(userType || '');
      
      if (shouldFilterByDepartment) {
        // Filter quotations to show only those from the user's department
        const filteredData = data.filter(quotation => {
          const quotationDepartment = quotation.createdByDepartment || ''; // Get the creator's department
          return quotationDepartment === userDepartment; // Show only if created in same department
        });
        setQuotations(filteredData);
      } else {
        // No department filtering - show all quotations
        setQuotations(data);
      }
      
      setQuotationsLoaded(true);
    } catch (error) {
      console.error('Error loading quotations:', error);
      toast.error("Failed to load quotations");
    } finally {
      setIsLoading(false);
    }
  }, [quotationsLoaded, setIsLoading, setFeatures, setQuotations, setQuotationsLoaded]);

  useEffect(() => {
    // Check if user should be restricted to My Quotations
    const checkOwnQuotationsRestriction = async () => {
      try {
        // Fetch features from API
        const response = await fetch('/api/features');
        const features = await response.json();
        setFeatures(features);
        
        // Get user role from cookie
        const userRole = Cookies.get('internalType');
        
        // Check if user is restricted to viewing only their own quotations
        const viewOwnQuotationsFeature = features.find((f: Feature) => f.id === 'view_own_quotations_only');
        const isRestrictedToOwnQuotations = viewOwnQuotationsFeature?.allowedRoles.includes(userRole || '');
        
        // If user is restricted, redirect to My Quotations page
        if (isRestrictedToOwnQuotations) {
          router.push('/quotations/my');
          return;
        }
        
        // Otherwise continue loading quotations
        loadQuotations();
      } catch (error) {
        console.error('Error checking permissions:', error);
        // Continue with loading quotations even if permission check fails
        loadQuotations();
      }
    };
    
    checkOwnQuotationsRestriction();
    
    // Only enable animations after client-side hydration is complete
    setIsMounted(true);
  }, [router, loadQuotations]);

  useEffect(() => {
    // We don't need to load quotations here anymore, 
    // but we still need to check permissions for UI elements
    const checkAllPermissions = async () => {
      try {
        // Fetch features from API
        if (features.length === 0) {
          const response = await fetch('/api/features');
          const featuresData = await response.json();
          setFeatures(featuresData);
        }
        
        // Get user role from cookie
        const userRole = Cookies.get('internalType');
        
        // Check permissions based on features data
        const hasPermission = (featureId: string) => {
          const feature = features.find((f: Feature) => f.id === featureId);
          return feature?.allowedRoles.includes(userRole || '') || false;
        };

        // Set permissions based on API data
        setPermissions({
          canCreateQuotation: hasPermission('create_quotations'),
          canApproveQuotations: hasPermission('approve_quotations'),
          canRejectQuotations: hasPermission('approve_quotations'), // Same as approve since both require manager/admin
          canRequestRevision: hasPermission('approve_quotations'), // Same as approve for revision requests
          canEditQuotations: hasPermission('edit_quotations'), // Now using specific edit_quotations permission
          canDeleteQuotations: hasPermission('delete_quotations'),
          canApproveClientActions: hasPermission('update_client_status')
        });
      } catch (error) {
        console.error('Error checking permissions:', error);
        // Set all permissions to false if API call fails
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
    
    checkAllPermissions();
  }, [features]);

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
    // Use secureInternalAction to check permissions in real-time
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
    // Use secureInternalAction to check permissions in real-time
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
    // First check permission in real-time before even showing the confirmation dialog
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

    // Use secureInternalAction to check permissions again in real-time before performing the delete
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

  const handleClientApprove = async (id: string) => {
    // Use secureInternalAction to check permissions in real-time
    await secureInternalAction(
      'update_client_status',
      async () => {
        try {
          // Get the current quotation status
          const quotation = quotations.find(q => q.id === id);
          
          if (!quotation || quotation.internalStatus !== 'approved') {
            toast.error('Quotation must be internally approved first');
            return;
          }
          
          // Check if external status is already set
          if (quotation.externalStatus && 
              quotation.externalStatus.toLowerCase() !== 'pending') {
            toast.error('Client status for this quotation is already set');
            return;
          }
          
          // Open the PO dialog instead of immediately approving
          setCurrentQuotationId(id);
          setPoNumber("");
          setPoFile(null);
          setIsPODialogOpen(true);
        } catch (error) {
          console.error('Error initiating client approval:', error);
          toast.error('Failed to initiate client approval');
        }
      }
    );
  };

  const handleClientReject = async (id: string) => {
    await secureInternalAction(
      'update_client_status',
      async () => {
        try {
          const updated = await clientRejectQuotation(id);
          if (updated) {
            setQuotations(prevQuotations => 
              prevQuotations.map(quotation => 
                quotation.id === id ? updated : quotation
              )
            );
            toast.success('Client rejection status updated successfully');
          } else {
            toast.error('Failed to update client rejection status');
          }
        } catch (error) {
          console.error('Error updating client rejection status:', error);
          toast.error('Failed to update client rejection status');
        }
      }
    );
  };

  const confirmClientApproval = async () => {
    if (!currentQuotationId) return;
    try {
      // Upload PO file if provided
      let poFileUrl = undefined;
      if (poFile) {
        const formData = new FormData();
        formData.append('file', poFile);
        formData.append('quotationId', currentQuotationId);
        
        const uploadResponse = await fetch('/api/upload/po-file', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload PO file');
        }
        
        const uploadResult = await uploadResponse.json();
        poFileUrl = uploadResult.fileUrl;
      }
      
      // Update with PO information and approve
      const updates: Partial<Pick<Quotation, 'externalStatus' | 'poNo' | 'poFileUrl'>> = { 
        externalStatus: 'approved'
      };
      
      if (poNumber) {
        updates.poNo = poNumber;
      }
      
      if (poFileUrl) {
        updates.poFileUrl = poFileUrl;
      }
      
      const result = await clientApproveQuotation(currentQuotationId);
      
      if (!result) {
        toast.error('Failed to update client approval status');
        return;
      }
      
      // Additional update for PO info if provided
      if (poNumber || poFileUrl) {
        const poUpdateResponse = await fetch('/api/quotations', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            id: currentQuotationId, 
            updates: {
              poNo: poNumber || undefined,
              poFileUrl: poFileUrl || undefined
            }
          }),
        });
        
        if (!poUpdateResponse.ok) {
          toast.error('Client approval succeeded but PO information could not be saved');
        }
      }
      
      // Update local state with the API response
      setQuotations(prevQuotations => 
        prevQuotations.map(quotation => 
          quotation.id === currentQuotationId ? result : quotation
        )
      );
      
      toast.success('Client approval status updated successfully');
      setIsPODialogOpen(false);
      setCurrentQuotationId(null);
    } catch (error) {
      console.error('Error updating client approval status:', error);
      toast.error('Failed to update client approval status');
    }
  };

  // Determine if department filtering is active
  const userType = Cookies.get('internalType') || '';
  const userDepartment = Cookies.get('department') || '';
  const departmentFilteringActive = !!(userDepartment && features?.find(f =>
    f.id === 'view_department_data' &&
    f.allowedRoles.includes(userType)
  ));

  // During SSR and initial hydration, render without motion components
  if (!isMounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">All Quotations</h1>
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

        {/* Add Delete Dialog */}
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

        {/* PO Collection Dialog */}
        <Dialog open={isPODialogOpen} onOpenChange={setIsPODialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Client Approval - PO Details</DialogTitle>
              <DialogDescription>
                Enter PO details for client approval (optional)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="po-number">PO Number</Label>
                <Input 
                  id="po-number" 
                  placeholder="Enter PO number (optional)" 
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-file">PO File</Label>
                <FileUpload
                  accept={{ 
                    'application/pdf': ['.pdf'],
                    'application/msword': ['.doc'],
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                    'image/jpeg': ['.jpg', '.jpeg'],
                    'image/png': ['.png']
                  }}
                  maxSize={5 * 1024 * 1024} // 5MB
                  onFilesSelected={(files) => setPoFile(files[0] || null)}
                  className="w-full"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPODialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={confirmClientApproval}>
                Confirm Approval
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // After hydration, render with animations
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
          <h1 className="text-2xl font-bold">All Quotations</h1>
          {Cookies.get('department') && features?.find(f => 
            f.id === 'view_department_data' && 
            f.allowedRoles.includes(Cookies.get('internalType') || '')
          ) && (
            <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              {Cookies.get('department')} department view only
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

      {/* Add Delete Dialog */}
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

      {/* PO Collection Dialog */}
      <Dialog open={isPODialogOpen} onOpenChange={setIsPODialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client Approval - PO Details</DialogTitle>
            <DialogDescription>
              Enter PO details for client approval (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="po-number">PO Number</Label>
              <Input 
                id="po-number" 
                placeholder="Enter PO number (optional)" 
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-file">PO File</Label>
              <FileUpload
                accept={{ 
                  'application/pdf': ['.pdf'],
                  'application/msword': ['.doc'],
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                  'image/jpeg': ['.jpg', '.jpeg'],
                  'image/png': ['.png']
                }}
                maxSize={5 * 1024 * 1024} // 5MB
                onFilesSelected={(files) => setPoFile(files[0] || null)}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPODialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmClientApproval}>
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
} 