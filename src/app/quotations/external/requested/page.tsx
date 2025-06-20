"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCompanyStore } from "@/lib/companies";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Cookies from 'js-cookie';
import { getQuotationRequests } from "@/lib/quotations";
import { type QuotationRequest } from "@/types/quotationRequest";
import { QuotationsTable } from "@/components/QuotationsTable";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { motion } from "framer-motion";

const ITEMS_PER_PAGE = 15;

interface ExternalFeature {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
}

// Add UserRow interface for type safety
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

export default function RequestedQuotationsPage() {
  const router = useRouter();
  const { companies, loadCompanies } = useCompanyStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isAnimationMounted, setIsAnimationMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<QuotationRequest[]>([]);
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
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const, // <-- this is the key fix
        stiffness: 100,
        damping: 20, // optional, but recommended for spring
      },
    },
  };

  // Load quotations
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getQuotationRequests();
        // Check user credentials
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
        
        // If view_own_quotations_only is true, filter by user's email
        let filteredRequests = [...data];
        if (canViewOwnQuotationsOnly) {
          console.log(`Filtering quotation requests by user email "${userEmail}" (before: ${filteredRequests.length} records)`);
          
          // Filter quotations to only show those created by the current user
          filteredRequests = filteredRequests.filter(quotation => {
            // Check if userEmail field matches current user
            if (quotation.userEmail === userEmail) {
              return true;
            }
            
            // Check if user email appears in action history
            return quotation.actionHistory.some(action => 
              action.toLowerCase().includes(userEmail.toLowerCase())
            );
          });
          
          console.log(`After filtering by user: ${filteredRequests.length} records belong to the user`);
          
          // If user gets redirected to this page but should only see their own quotations, 
          // redirect them to the my-quotation-requests page
          if (filteredRequests.length === 0 && canViewOwnQuotationsOnly) {
            console.log('No user quotations found. Redirecting to My Requests page.');
            router.push('/quotations/external/requested/my');
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
          console.log(`Filtering quotation requests by company ID "${companyId}" (before: ${filteredRequests.length} records)`);
          filteredRequests = filteredRequests.filter(q => q.company === companyId);
          console.log(`After filtering: ${filteredRequests.length} records match user's company`);
        } else {
          console.log(`Not filtering by company. Showing all ${filteredRequests.length} quotation requests`);
        }

        setQuotations(filteredRequests);
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
          quotation.project.toLowerCase().includes(query) ||
          quotation.title.toLowerCase().includes(query) ||
          quotation.customerName.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (quotation) => quotation.status === statusFilter.toLowerCase()
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

    // Sort to show most recent quotations first (like the internal table)
    filtered = filtered.reverse();

    setFilteredQuotations(filtered);
  }, [quotations, searchQuery, statusFilter, yearFilter, companyFilter]);

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
    window.open(pdfUrl, '_blank');
  };

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

  // Add permission check
  const canRequestQuotations = hasPermission('request_quotations');

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
          const userData = data.users.find((u: UserRow) => u.email === email);
          
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

  // Also update the effect that loads features to handle external type format properly
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

  // Add top-level canViewOnlyCompanyData for use in render
  const viewCompanyDataFeature = externalFeatures.find(f => f.id === 'view_company_data_only');
  const canViewOnlyCompanyData = viewCompanyDataFeature?.allowedRoles.includes(userRole) || false;

  // During SSR and initial hydration, render without motion components
  if (!isAnimationMounted || isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Quotation Requests</CardTitle>
                <CardDescription>
                  View all quotation requests
                </CardDescription>
              </div>
              {canRequestQuotations && (
                <Button 
                  onClick={() => router.push("/quotations/external/request")} 
                  className="ml-4"
                >
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
                    <SelectItem value="Pending Review">Pending Review</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
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
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <QuotationsTable 
                quotations={paginatedQuotations} 
                onViewDocument={handleViewDocument}
              />
            )}
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Quotation Requests</CardTitle>
                <CardDescription>
                  View all quotation requests
                </CardDescription>
              </div>
              {canRequestQuotations && (
                <Button 
                  onClick={() => router.push("/quotations/external/request")} 
                  className="ml-4"
                >
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
                    <SelectItem value="Pending Review">Pending Review</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
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
            <QuotationsTable 
              quotations={paginatedQuotations} 
              onViewDocument={handleViewDocument}
            />
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
    </motion.div>
  );
} 