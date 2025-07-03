"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { RequestedQuotationsTable } from "@/components/quotations/requested-quotations-table";
import { getQuotationRequests } from "@/lib/quotations";
import { type QuotationRequest } from "@/types/quotationRequest";
import Cookies from 'js-cookie';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Variants } from "framer-motion";
import { ExternalFeature } from "@/types/external-features";

interface Department {
  id: string;
  name: string;
  description: string;
}

interface UserRow {
  email: string;
  name: string;
  type: string;
  phoneNumber: string | null;
  internalType?: string | null;
  department?: string | null;
  company?: string | null;
  externalType?: string | null;
}

export default function InternalRequestedQuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isFilteredByOwner, setIsFilteredByOwner] = useState(false);
  const [isFilteredByDepartment, setIsFilteredByDepartment] = useState(false);
  const [userDepartmentName, setUserDepartmentName] = useState('');

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      }
    }
  } as const;

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
  } as const;

  useEffect(() => {
    const checkAuth = async () => {
      const userEmail = Cookies.get('userEmail');
      const accessType = Cookies.get('accessType');
      const userType = Cookies.get('internalType');

      if (!userEmail || accessType !== 'internal') {
        toast.error('Please log in as an internal user');
        router.push('/login');
        return;
      }
      
      // Check if user should be restricted to their own quotation requests
      try {
        const response = await fetch('/api/features');
        const features: ExternalFeature[] = await response.json();
        
        // Check for "view own quotations only" permission
        const viewOwnQuotationsFeature = features.find((f: ExternalFeature) => f.id === 'view_own_quotations_only');
        const canOnlyViewOwn = viewOwnQuotationsFeature?.allowedRoles.includes(userType || '');
        
        // If user has this restriction, redirect to My Quotation Requests page
        if (canOnlyViewOwn) {
          router.push('/quotations/request');
          return;
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        // Continue with loading even if permission check fails
      }

      // Try to get department name
      const userDepartment = Cookies.get('department');
      if (userDepartment) {
        try {
          const response = await fetch('/api/departments');
          const departments = await response.json();
          const department = departments.find((d: Department) => d.id === userDepartment);
          if (department) {
            setUserDepartmentName(department.name);
          } else {
            setUserDepartmentName(userDepartment);
          }
        } catch (error) {
          console.error('Error loading department info:', error);
          setUserDepartmentName(userDepartment);
        }
      }

      loadQuotations();
    };

    checkAuth();
    
    // Only enable animations after client-side hydration is complete
    setIsMounted(true);
  }, [router]);

  const loadQuotations = async () => {
    try {
      setIsLoading(true);
      const data = await getQuotationRequests();
      
      // Get user info from cookies
      const userEmail = Cookies.get('userEmail') || '';
      const userType = Cookies.get('internalType');
      const userDepartment = Cookies.get('department');
      
      // Check if user has permission restrictions
      // Fetch features to check permissions
      const response = await fetch('/api/features');
      const features: ExternalFeature[] = await response.json();
      
      // Check for "view own quotations only" permission
      const viewOwnQuotationsFeature = features.find((f: ExternalFeature) => f.id === 'view_own_quotations_only');
      const shouldFilterByOwner = viewOwnQuotationsFeature?.allowedRoles.includes(userType || '');
      setIsFilteredByOwner(!!shouldFilterByOwner);
      
      // Check for "view department data only" permission
      const viewDepartmentFeature = features.find((f: ExternalFeature) => f.id === 'view_department_data');
      const shouldFilterByDepartment = viewDepartmentFeature?.allowedRoles.includes(userType || '');
      setIsFilteredByDepartment(!!shouldFilterByDepartment);
      
      let filteredData = data;
      
      // Apply filters based on permissions
      if (shouldFilterByDepartment) {
        try {
          if (!userDepartment) {
            console.warn('Cannot filter by department: User department not set in cookies');
            // If no department cookie but filter is enabled, show only own requests
            filteredData = filteredData.filter(request => request.userEmail === userEmail);
          } else {
            // Fetch user accounts to get department information
            const usersResponse = await fetch('/api/auth/users');
            if (!usersResponse.ok) {
              throw new Error(`Failed to fetch users: ${usersResponse.statusText}`);
            }
            
            const usersData = await usersResponse.json();
            const users = usersData.users || []; // API returns { users: [...] }
            
            // Apply department filtering using the userEmail field from request
            filteredData = filteredData.filter(request => {
              // Each request has a userEmail field with the email of the creator
              if (request.userEmail) {
                // Find the user who created this request
                const creator = users.find((user: UserRow) => user.email === request.userEmail);
                
                // If we found the creator and have their department
                if (creator && creator.department) {
                  // Match by department
                  return creator.department === userDepartment;
                }
              }
              
              // If no userEmail or can't find user, fall back to checking if created by current user
              return request.userEmail === userEmail;
            });
          }
        } catch (error) {
          console.error('Error fetching users for department filtering:', error);
          // Fall back to showing only the user's own requests if we can't determine departments
          filteredData = filteredData.filter(request => request.userEmail === userEmail);
          toast.error("Could not filter by department, showing only your requests instead");
        }
      } else if (shouldFilterByOwner) {
        // Show only requests created by the current user
        filteredData = filteredData.filter(request => request.userEmail === userEmail);
      }
      
      setQuotations(filteredData);
    } catch (error) {
      console.error('Error loading quotations:', error);
      toast.error("Failed to load quotations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateQuotation = async (quotation: QuotationRequest) => {
    try {
      // Ensure the company ID is valid before navigating
      if (!quotation.company) {
        toast.error("Company information is missing");
        return;
      }
      
      // Navigate to create quotation page with the request data and action history
      const encodedHistory = encodeURIComponent(JSON.stringify(quotation.actionHistory));
      router.push(`/quotations/new?requestId=${quotation.id}&actionHistory=${encodedHistory}`);
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast.error("Failed to create quotation");
    }
  };

  const handleReject = async (quotation: QuotationRequest) => {
    try {
      // Call API to reject the quotation request
      const response = await fetch(`/api/quotation-requests/${quotation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'rejected',
          actionHistory: [
            ...quotation.actionHistory,
            `Rejected on ${new Date().toLocaleString()}`
          ]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject quotation request');
      }

      // Update the quotation in the local state
      setQuotations(prevQuotations =>
        prevQuotations.map(q =>
          q.id === quotation.id
            ? { 
                ...q, 
                status: 'rejected',
                actionHistory: [
                  ...q.actionHistory,
                  `Rejected on ${new Date().toLocaleString()}`
                ]
              }
            : q
        )
      );

      toast.success("Quotation request rejected successfully");
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      toast.error("Failed to reject quotation request");
    }
  };

  // During SSR and initial hydration, render without motion components
  if (!isMounted) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">All Quotation Requests</h1>
            {isFilteredByOwner && (
              <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                My requests only
              </span>
            )}
            {isFilteredByDepartment && (
              <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                {userDepartmentName} department only
              </span>
            )}
          </div>
          <Button asChild>
            <Link href="/quotations/my-requests">Request New Quotation</Link>
          </Button>
        </div>

        <Card>
          <CardContent>
            <RequestedQuotationsTable
              quotations={quotations}
              isLoading={isLoading}
              onCreateQuotation={handleCreateQuotation}
              onReject={handleReject}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // After hydration, render with animations
  return (
    <motion.div 
      className="container mx-auto py-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div 
        className="flex justify-between items-center mb-6" 
        variants={itemVariants}
      >
        <div>
          <h1 className="text-2xl font-bold">All Quotation Requests</h1>
          {isFilteredByOwner && (
            <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              My requests only
            </span>
          )}
          {isFilteredByDepartment && (
            <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              {userDepartmentName} department only
            </span>
          )}
        </div>
        <Button asChild>
          <Link href="/quotations/my-requests">Request New Quotation</Link>
        </Button>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent>
            <RequestedQuotationsTable
              quotations={quotations}
              isLoading={isLoading}
              onCreateQuotation={handleCreateQuotation}
              onReject={handleReject}
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
} 