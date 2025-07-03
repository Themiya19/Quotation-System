"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCompanyStore } from "@/lib/companies";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Cookies from 'js-cookie';
import { getAllQuotations, updateQuotation } from "@/lib/quotations";
import { type Quotation } from "@/types/quotation";
import { savePoFile } from "@/lib/poUpload";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

const ITEMS_PER_PAGE = 15;

const EXTERNAL_STATUS_COLORS: Record<string, string> = {
  "Pending": "text-yellow-800",
  "pending": "text-yellow-800",
  "approved": "text-green-800",
  "Rejected": "text-red-800",
  "rejected": "text-red-800",
  "Revision Requested": "text-blue-800",
  "revision requested": "text-blue-800",
  "Sent": "text-blue-800",
  "sent": "text-blue-800",
  "Viewed": "text-purple-800",
  "viewed": "text-purple-800",
};

const poFormSchema = z.object({
  poNo: z.string().min(1, "PO number is required"),
  poFile: z.any().refine((file) => file?.length === 1, "PO file is required"),
});

interface ExternalFeature {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
}

type User = {
  email: string;
  name: string;
  type: string;
  phoneNumber: string | null;
  internalType?: string | null;
  department?: string | null;
  company?: string | null;
  externalType?: string | null;
};

export default function ExternalQuotationsPage() {
  const router = useRouter();
  const { companies, loadCompanies } = useCompanyStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isAnimationMounted, setIsAnimationMounted] = useState(false);
  const [isPoDialogOpen, setIsPoDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [externalFeatures, setExternalFeatures] = useState<ExternalFeature[]>([]);
  const [userRole, setUserRole] = useState<string>('');

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      }
    }
  } as const;

  const itemVariants = {
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

  const form = useForm<z.infer<typeof poFormSchema>>({
    resolver: zodResolver(poFormSchema),
    defaultValues: {
      poNo: "",
      poFile: undefined,
    },
  });

  // Function to get company name from ID
  const getCompanyName = useCallback((companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : companyId;
  }, [companies]);

  // Load quotations
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getAllQuotations();
        // Get user's company from cookie
        const userEmail = Cookies.get('userEmail');
        const accessType = Cookies.get('accessType');
        const userCompany = Cookies.get('company');
        
        if (!userEmail || accessType !== 'external') {
          console.error('No valid user found');
          router.push('/login');
          return;
        }

        // Check if user has permission to view only their company data
        // Get user role from cookie if not set in state
        let currentRole = userRole;
        if (!currentRole) {
          const externalType = Cookies.get('externalType');
          currentRole = externalType ? 
            (externalType.startsWith('ext_') ? externalType : `ext_${externalType}`) : 
            'ext_client';
        }
        
        // Check for permissions
        const viewCompanyDataFeature = externalFeatures.find(f => f.id === 'view_company_data_only');
        const viewOwnQuotationsFeature = externalFeatures.find(f => f.id === 'view_own_quotations_only');
        
        const canViewOnlyCompanyData = viewCompanyDataFeature?.allowedRoles.includes(currentRole) || false;
        const canViewOwnQuotationsOnly = viewOwnQuotationsFeature?.allowedRoles.includes(currentRole) || false;
        
        console.log('User can view only company data:', canViewOnlyCompanyData);
        console.log('User can view own quotations only:', canViewOwnQuotationsOnly);
        
        // Filter quotations by approved status only and sort by newest first
        let filteredQuotations = data
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date, newest first
          
        // Only show approved quotations
        filteredQuotations = filteredQuotations.filter(q => q.internalStatus === "approved");
        
        // If view_own_quotations_only is true, filter by user's email
        if (canViewOwnQuotationsOnly) {
          console.log(`Filtering quotations by user email "${userEmail}" (before: ${filteredQuotations.length} records)`);
          
          // Check both created by user or user is mentioned in action history
          filteredQuotations = filteredQuotations.filter(q => {
            // Check if user created this quotation
            if (q.createdBy === userEmail) {
              return true;
            }
            
            // Check if user is mentioned in action history
            if (q.actionHistory && q.actionHistory.some(action => 
              action.toLowerCase().includes(userEmail.toLowerCase())
            )) {
              return true;
            }
            
            return false;
          });
          
          console.log(`After filtering by user: ${filteredQuotations.length} records belong to the user`);
          
          // If user gets redirected to this page but should only see their own quotations, 
          // redirect them to the my-quotations page
          if (filteredQuotations.length === 0 && canViewOwnQuotationsOnly) {
            console.log('No user quotations found. Redirecting to My Quotations page.');
            router.push('/quotations/external/my');
            return;
          }
        }
        // If view_company_data_only is true, filter by user's company
        else if (canViewOnlyCompanyData && userCompany) {
          // Defensive: map company name to ID if needed
          let companyId = userCompany;
          if (companyId && companies.length > 0) {
            const found = companies.find(
              c => c.id === companyId || c.name.toLowerCase() === companyId.toLowerCase()
            );
            if (found) companyId = found.id;
          }
          console.log(`Filtering quotations by company ID "${companyId}" (before: ${filteredQuotations.length} records)`);
          filteredQuotations = filteredQuotations.filter(q => q.company === companyId);
          console.log(`After filtering: ${filteredQuotations.length} records match user's company`);
        } else {
          console.log(`Not filtering by company. Showing all ${filteredQuotations.length} quotations`);
        }
        
        setQuotations(filteredQuotations);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading quotations:', error);
        toast.error("Failed to load quotations");
        setIsLoading(false);
      }
    };

    // Only load data after component is mounted and features are loaded
    if (isMounted && externalFeatures.length > 0) {
      loadData();
    }
  }, [router, isMounted, externalFeatures, userRole, companies]);

  useEffect(() => {
    const checkAuth = async () => {
      setIsMounted(true);
      const userEmail = Cookies.get('userEmail');
      const accessType = Cookies.get('accessType');
      const userCompany = Cookies.get('company');
      const externalType = Cookies.get('externalType');

      // Debug logging for troubleshooting
      console.log('External page loaded with user data:', { 
        userEmail, 
        accessType, 
        userCompany,
        externalType
      });

      if (!userEmail || accessType !== 'external' || !userCompany) {
        toast.error('Please log in as an external user');
        router.push('/login');
        return;
      }

      // Load companies data
      await loadCompanies();
      
      // Enable animations after client-side hydration is complete
      setIsAnimationMounted(true);
    };

    checkAuth();
  }, [router, loadCompanies]);

  useEffect(() => {
    let filtered = [...quotations];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (quotation) =>
          quotation.quotationNo.toLowerCase().includes(query) ||
          quotation.project.toLowerCase().includes(query) ||
          quotation.title.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (quotation) => quotation.externalStatus === statusFilter
      );
    }

    // Apply year filter
    if (yearFilter) {
      filtered = filtered.filter((quotation) => {
        const quotationYear = new Date(quotation.date).getFullYear().toString();
        return quotationYear === yearFilter;
      });
    }

    // Apply company filter
    if (companyFilter !== "all") {
      filtered = filtered.filter(
        (quotation) => quotation.company === companyFilter
      );
    }

    // No need to reverse here since data is already sorted by date
    setFilteredQuotations(filtered);
  }, [quotations, searchQuery, statusFilter, yearFilter, companyFilter]);

  // Add after the filtering effect
  const totalPages = Math.ceil(filteredQuotations.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedQuotations = filteredQuotations.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setYearFilter(new Date().getFullYear().toString());
    setCompanyFilter("all");
  };

  const handleViewDocument = (pdfUrl: string) => {
    // Just open the URL directly as stored in the database
    window.open(pdfUrl, '_blank');
  };

  const handleViewPO = (poFileUrl: string) => {
    // Just open the URL directly as stored in the database
    window.open(poFileUrl, '_blank');
  };

  const handleAction = async (quotation: Quotation, action: 'approve' | 'reject' | 'revise') => {
    try {
      // Perform a real-time permission check before allowing the action
      const response = await fetch('/api/auth/users');
      
      if (!response.ok) {
        throw new Error('Failed to verify permissions');
      }
      
      const data = await response.json();
      const currentUser = (data.users as User[]).find((u) => u.email === Cookies.get('userEmail'));
      
      if (!currentUser || currentUser.type !== 'external') {
        toast.error('Session expired. Please log in again.');
        router.push('/login');
        return;
      }
      
      // Get the latest features to check permissions
      const featuresResponse = await fetch('/api/external-features');
      if (!featuresResponse.ok) {
        throw new Error('Failed to verify feature permissions');
      }
      
      const featuresData = await featuresResponse.json();
      const features = featuresData.features;
      
      // Format external type consistently
      const externalType = currentUser.externalType;
      const formattedRole = externalType ? 
        (externalType.startsWith('ext_') ? externalType : `ext_${externalType}`) : 
        'ext_client';
      
      // Check if user has permission to approve quotations
      const approveFeature = features.find((f: ExternalFeature) => f.id === 'approve_quotations');
      if (!approveFeature || !approveFeature.allowedRoles.includes(formattedRole)) {
        toast.error('You no longer have permission to perform this action.');
        // Update local state to match server state
        setUserRole(formattedRole);
        Cookies.set('externalType', formattedRole, { expires: 7 });
        setExternalFeatures(features);
        return;
      }
    
      const newStatus = action === 'approve' ? 'approved' : 
                         action === 'reject' ? 'Rejected' : 
                         'Revision Requested';
      
      // Call API to update quotation
      const updated = await updateQuotation(quotation.id, { externalStatus: newStatus });
      if (updated) {
        setQuotations(prevQuotations => 
          prevQuotations.map(q => q.id === quotation.id ? updated : q)
        );
        setFilteredQuotations(prevQuotations => 
          prevQuotations.map(q => q.id === quotation.id ? updated : q)
        );
        toast.success(`Quotation ${action}d successfully!`);
        if (action === 'approve') {
          setSelectedQuotation(updated);
          setIsPoDialogOpen(true);
        }
      } else {
        toast.error(`Failed to ${action} quotation`);
      }
    } catch (error) {
      console.error('Error updating quotation:', error);
      toast.error(`Failed to ${action} quotation`);
    }
  };

  const onSubmitPO = async (values: z.infer<typeof poFormSchema>) => {
    if (!selectedQuotation) return;
    try {
      // Perform a real-time permission check before allowing PO submission
      const response = await fetch('/api/auth/users');
      
      if (!response.ok) {
        throw new Error('Failed to verify permissions');
      }
      
      const data = await response.json();
      const currentUser = (data.users as User[]).find((u) => u.email === Cookies.get('userEmail'));
      
      if (!currentUser || currentUser.type !== 'external') {
        toast.error('Session expired. Please log in again.');
        router.push('/login');
        return;
      }
      
      // Get the latest features to check permissions
      const featuresResponse = await fetch('/api/external-features');
      if (!featuresResponse.ok) {
        throw new Error('Failed to verify feature permissions');
      }
      
      const featuresData = await featuresResponse.json();
      const features = featuresData.features;
      
      // Format external type consistently
      const externalType = currentUser.externalType;
      const formattedRole = externalType ? 
        (externalType.startsWith('ext_') ? externalType : `ext_${externalType}`) : 
        'ext_client';
      
      // Check if user has permission to approve quotations (required for PO submission)
      const approveFeaturePO = features.find((f: ExternalFeature) => f.id === 'approve_quotations');
      if (!approveFeaturePO || !approveFeaturePO.allowedRoles.includes(formattedRole)) {
        toast.error('You no longer have permission to submit PO.');
        // Update local state to match server state
        setUserRole(formattedRole);
        Cookies.set('externalType', formattedRole, { expires: 7 });
        setExternalFeatures(features);
        setIsPoDialogOpen(false);
        return;
      }
      
      const file = values.poFile[0];
      
      // Save the PO file and get its URL
      const poFileUrl = await savePoFile(file, selectedQuotation.quotationNo);

      // Call API to update quotation
      const updated = await updateQuotation(selectedQuotation.id, { poNo: values.poNo, poFileUrl });
      if (updated) {
        setQuotations(prevQuotations => 
          prevQuotations.map(q => q.id === selectedQuotation.id ? updated : q)
        );
        toast.success("PO submitted successfully!");
        setIsPoDialogOpen(false);
        form.reset();
        setSelectedQuotation(null);
      } else {
        toast.error("Failed to submit PO");
      }
    } catch (error) {
      console.error('Error submitting PO:', error);
      toast.error("Failed to submit PO");
    }
  };

  // Add useEffect to fetch features and set user role
  useEffect(() => {
    const loadFeatures = async () => {
      try {
        const response = await fetch('/api/external-features');
        const data = await response.json();
        setExternalFeatures(data.features);
      } catch (error) {
        console.error('Error loading external features:', error);
      }
    };

    // Get user role from cookie
    const externalType = Cookies.get('externalType');
    if (externalType) {
      // Check if externalType already has the ext_ prefix
      setUserRole(externalType.startsWith('ext_') ? externalType : `ext_${externalType}`);
    }

    loadFeatures();
  }, []);

  // Update permission check function
  const hasPermission = (featureId: string) => {
    // If features aren't loaded yet, return false
    if (externalFeatures.length === 0) {
      console.log('No features loaded yet');
      return false;
    }
    
    // Get user role from cookie if not set in state
    let currentRole = userRole;
    if (!currentRole) {
      const externalType = Cookies.get('externalType');
      currentRole = externalType ? 
        (externalType.startsWith('ext_') ? externalType : `ext_${externalType}`) : 
        'ext_client';
      
      // Update the state
      setUserRole(currentRole);
    }
    
    // For debugging
    console.log('Checking permission for:', {
      featureId,
      currentRole,
      features: externalFeatures,
      allowedRoles: externalFeatures.find(f => f.id === featureId)?.allowedRoles
    });

    const feature = externalFeatures.find(f => f.id === featureId);
    if (!feature) {
      console.warn(`Feature ${featureId} not found in:`, externalFeatures);
      return false;
    }

    const hasAccess = feature.allowedRoles.includes(currentRole);
    console.log(`Permission result for ${featureId}: ${hasAccess}`);
    return hasAccess;
  };

  // Add permission checks
  const canApproveQuotations = hasPermission('approve_quotations');
  const canRequestQuotations = hasPermission('request_quotations');
  // Add top-level canViewOnlyCompanyData for use in render
  const viewCompanyDataFeature = externalFeatures.find(f => f.id === 'view_company_data_only');
  const canViewOnlyCompanyData = viewCompanyDataFeature?.allowedRoles.includes(userRole) || false;

  // Add a polling mechanism to check for role changes
  useEffect(() => {
    // Only run this effect if the user is logged in
    if (!isMounted || !Cookies.get('userEmail')) return;
    
    // Function to check for role updates
    const checkForRoleUpdates = async () => {
      try {
        const email = Cookies.get('userEmail');
        // Skip if no email is found
        if (!email) return;
        
        // Call API to check for user data - using existing users API
        const response = await fetch(`/api/auth/users`);
        
        if (response.ok) {
          const data = await response.json();
          // Find the current user in the users list
          const userData = (data.users as User[]).find((u) => u.email === email);
          
          if (userData && userData.type === 'external') {
            const currentExtType = Cookies.get('externalType');
            // Format the external type consistently
            const newExtType = userData.externalType
              ? (userData.externalType.startsWith('ext_') ? userData.externalType : `ext_${userData.externalType}`)
              : 'ext_client';
            
            // If role has changed, update cookie and reload features
            if (currentExtType !== newExtType) {
              console.log('Role changed from', currentExtType, 'to', newExtType);
              Cookies.set('externalType', newExtType, { expires: 7 });
              setUserRole(newExtType);
              
              // Reload features to update permissions
              const featuresResponse = await fetch('/api/external-features');
              const featuresData = await featuresResponse.json();
              setExternalFeatures(featuresData.features);
              
              // Force re-render of components
              toast.info("Your permissions have been updated");
            }
          }
        }
      } catch (error) {
        console.error('Error checking for role updates:', error);
      }
    };
    
    // Check immediately on page load
    checkForRoleUpdates();
    
    // Set up interval to check periodically (every 30 seconds)
    const intervalId = setInterval(checkForRoleUpdates, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [isMounted]);

  // Add this helper function inside the component
  const getExternalStatusColor = (status: string) => {
    // Case insensitive match by checking both the exact status and lowercase version
    return EXTERNAL_STATUS_COLORS[status] || 
           EXTERNAL_STATUS_COLORS[status?.toLowerCase()] || 
           "text-gray-800";
  };

  // During SSR and initial hydration, render without motion components
  if (!isAnimationMounted || isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>All Quotations</CardTitle>
                <CardDescription>
                  View all your quotations
                </CardDescription>
              </div>
              {canRequestQuotations && (
                <Button onClick={() => router.push("/quotations/external/request")} className="ml-4">
                  Request New Quotation
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 items-center space-x-2 flex-wrap gap-2">
                    <Input
                      placeholder="Search quotations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 w-[150px] lg:w-[250px]"
                    />
                    <Input
                      type="number"
                      placeholder="Filter by year..."
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      className="h-9 w-[120px]"
                      min={2000}
                      max={new Date().getFullYear()}
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9 w-[150px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="revision">Revision Requested</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Hide company filter if user can only view their own company data */}
                    {!canViewOnlyCompanyData && (
                      <Select value={companyFilter} onValueChange={setCompanyFilter}>
                        <SelectTrigger className="h-9 w-[180px]">
                          <SelectValue placeholder="Filter by company" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Companies</SelectItem>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {(searchQuery || statusFilter !== "all" || yearFilter !== new Date().getFullYear().toString() || companyFilter !== "all") && (
                      <Button
                        variant="ghost"
                        onClick={resetFilters}
                        className="h-8 px-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quotation No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>View Document</TableHead>
                        <TableHead>Client Status</TableHead>
                        <TableHead>PO No</TableHead>
                        <TableHead>PO File</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedQuotations.map((quotation) => (
                        <TableRow key={quotation.id}>
                          <TableCell>{quotation.quotationNo}</TableCell>
                          <TableCell>{quotation.date ? new Date(quotation.date).toLocaleDateString() : ""}</TableCell>
                          <TableCell>{getCompanyName(quotation.company)}</TableCell>
                          <TableCell>{quotation.project}</TableCell>
                          <TableCell>{quotation.title}</TableCell>
                          <TableCell className="text-right">
                            {quotation.currency} {(quotation.amount ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => quotation.pdfUrl && handleViewDocument(quotation.pdfUrl)}
                              disabled={!quotation.pdfUrl}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </TableCell>
                          <TableCell>
                            <span className={getExternalStatusColor(quotation.externalStatus || "")}>
                              {quotation.externalStatus}
                            </span>
                          </TableCell>
                          <TableCell>{quotation.poNo || "-"}</TableCell>
                          <TableCell>
                            {quotation.poFileUrl ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => quotation.poFileUrl && handleViewPO(quotation.poFileUrl)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canApproveQuotations && quotation.externalStatus === "approved" && (
                                  <DropdownMenuItem 
                                    onClick={() => handleAction(quotation, 'revise')}
                                    className="text-purple-800"
                                  >
                                    Request Revise
                                  </DropdownMenuItem>
                                )}
                                {canApproveQuotations && quotation.externalStatus !== "approved" && 
                                  quotation.externalStatus !== "Rejected" && 
                                  quotation.externalStatus !== "Revision Requested" && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => handleAction(quotation, 'approve')}
                                      className="text-green-800"
                                    >
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleAction(quotation, 'reject')}
                                      className="text-red-800"
                                    >
                                      Reject
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleAction(quotation, 'revise')}
                                      className="text-blue-800"
                                    >
                                      Request Revise
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between px-2">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredQuotations.length)} of {filteredQuotations.length} entries
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // After hydration, render with animations
  return (
    <motion.div 
      className="container mx-auto py-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>All Quotations</CardTitle>
                <CardDescription>
                  View all your quotations
                </CardDescription>
              </div>
              {canRequestQuotations && (
                <Button onClick={() => router.push("/quotations/external/request")} className="ml-4">
                  Request New Quotation
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center space-x-2 flex-wrap gap-2">
                <Input
                  placeholder="Search quotations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-[150px] lg:w-[250px]"
                />
                <Input
                  type="number"
                  placeholder="Filter by year..."
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="h-9 w-[120px]"
                  min={2000}
                  max={new Date().getFullYear()}
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="revision">Revision Requested</SelectItem>
                  </SelectContent>
                </Select>
                {/* Hide company filter if user can only view their own company data */}
                {!canViewOnlyCompanyData && (
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="h-9 w-[180px]">
                      <SelectValue placeholder="Filter by company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {(searchQuery || statusFilter !== "all" || yearFilter !== new Date().getFullYear().toString() || companyFilter !== "all") && (
                  <Button
                    variant="ghost"
                    onClick={resetFilters}
                    className="h-8 px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>View Document</TableHead>
                    <TableHead>Client Status</TableHead>
                    <TableHead>PO No</TableHead>
                    <TableHead>PO File</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedQuotations.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell>{quotation.quotationNo}</TableCell>
                      <TableCell>{quotation.date ? new Date(quotation.date).toLocaleDateString() : ""}</TableCell>
                      <TableCell>{getCompanyName(quotation.company)}</TableCell>
                      <TableCell>{quotation.project}</TableCell>
                      <TableCell>{quotation.title}</TableCell>
                      <TableCell className="text-right">
                        {quotation.currency} {(quotation.amount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quotation.pdfUrl && handleViewDocument(quotation.pdfUrl)}
                          disabled={!quotation.pdfUrl}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                      <TableCell>
                        <span className={getExternalStatusColor(quotation.externalStatus || "")}>
                          {quotation.externalStatus}
                        </span>
                      </TableCell>
                      <TableCell>{quotation.poNo || "-"}</TableCell>
                      <TableCell>
                        {quotation.poFileUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => quotation.poFileUrl && handleViewPO(quotation.poFileUrl)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canApproveQuotations && quotation.externalStatus === "approved" && (
                              <DropdownMenuItem 
                                onClick={() => handleAction(quotation, 'revise')}
                                className="text-purple-800"
                              >
                                Request Revise
                              </DropdownMenuItem>
                            )}
                            {canApproveQuotations && quotation.externalStatus !== "approved" && 
                              quotation.externalStatus !== "Rejected" && 
                              quotation.externalStatus !== "Revision Requested" && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => handleAction(quotation, 'approve')}
                                  className="text-green-800"
                                >
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleAction(quotation, 'reject')}
                                  className="text-red-800"
                                >
                                  Reject
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleAction(quotation, 'revise')}
                                  className="text-blue-800"
                                >
                                  Request Revise
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between px-2">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredQuotations.length)} of {filteredQuotations.length} entries
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      
      <Dialog open={isPoDialogOpen} onOpenChange={setIsPoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Purchase Order</DialogTitle>
            <DialogDescription>
              Enter the PO number and upload the PO file for the approved quotation.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitPO)} className="space-y-4">
              <FormField
                control={form.control}
                name="poNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PO Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter PO number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="poFile"
                render={({ field: { onChange, ref } }) => (
                  <FormItem>
                    <FormLabel>PO File</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => onChange(e.target.files)}
                        ref={ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit">Submit PO</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
} 