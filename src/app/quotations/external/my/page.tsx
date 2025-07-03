"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCompanyStore } from "@/lib/companies";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Variants } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { FileText, X, MoreHorizontal } from "lucide-react";
import Cookies from 'js-cookie';
import { getAllQuotations, getQuotationRequests } from "@/lib/quotations";
import { type Quotation } from "@/types/quotation";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ExternalFeature = {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
};

const ITEMS_PER_PAGE = 15;

const EXTERNAL_STATUS_COLORS: Record<string, string> = {
  "Pending": "text-yellow-800",
  "pending": "text-yellow-800",
  "Approved": "text-green-800",
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

export default function MyExternalQuotationsPage() {
  const router = useRouter();
  const { loadCompanies, companies } = useCompanyStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isAnimationMounted, setIsAnimationMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [userRole, setUserRole] = useState<string>('');
  const [externalFeatures, setExternalFeatures] = useState<ExternalFeature[]>([]);

  // Animation variants
  const containerVariants: Variants = {
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
        type: "spring",
        stiffness: 100,
      },
    },
  } as const;

  // Load quotations
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getAllQuotations();
        const requestsData = await getQuotationRequests();
        
        // Get user's email from cookie
        const userEmail = Cookies.get('userEmail');
        const accessType = Cookies.get('accessType');
        const userCompany = Cookies.get('company');
        
        if (!userEmail || accessType !== 'external') {
          console.error('No valid user found');
          router.push('/login');
          return;
        }

        // Get user role from cookie if not set in state
        let currentRole = userRole;
        if (!currentRole) {
          const externalType = Cookies.get('externalType');
          currentRole = externalType ? 
            (externalType.startsWith('ext_') ? externalType : `ext_${externalType}`) : 
            'ext_client';
        }
        
        // Check if the feature exists and user has permission
        const feature = externalFeatures.find(f => f.id === 'view_company_data_only');
        const canViewOnlyCompanyData = feature?.allowedRoles.includes(currentRole) || false;
        
        console.log('User can view only company data:', canViewOnlyCompanyData);

        // Find quotation requests that belong to the user
        const userQuotationRequests = requestsData.filter(request => 
          request.userEmail === userEmail || 
          request.actionHistory.some(action => action.toLowerCase().includes(userEmail.toLowerCase()))
        );
        
        // Get the IDs of the user's quotation requests
        // const userRequestIds = userQuotationRequests.map(request => request.id);

        // Filter quotations by:
        // 1. Created by the current user (using createdBy field)
        // 2. OR based on the user's quotation requests (by checking customerReferences or action history)
        // Sort by newest first
        let filteredQuotations = data
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .filter(q => {
            // Include quotations created by the user
            if (q.createdBy === userEmail) {
              return true;
            }

            // Get all request IDs that belong to the user
            const userRequestIds = userQuotationRequests.map(req => req.id);

            // Check if this quotation is linked to any of the user's requests via customerReferences
            if (q.customerReferences && typeof q.customerReferences === 'string' && userRequestIds.some(requestId => 
              requestId && q.customerReferences && q.customerReferences.includes(requestId)
            )) {
              return true;
            }

            // Check if action history mentions any of the user request IDs
            if (q.actionHistory) {
              const hasRequestIdInHistory = q.actionHistory.some(action => {
                const actionLower = action.toLowerCase();
                return userRequestIds.some(requestId => 
                  requestId && actionLower.includes(requestId.toLowerCase())
                );
              });
              
              if (hasRequestIdInHistory) {
                return true;
              }
            }

            // Check if the action history contains the user's email directly
            if (q.actionHistory) {
              return q.actionHistory.some(action => 
                action.toLowerCase().includes(userEmail.toLowerCase())
              );
            }

            return false;
          });
        
        // If view_company_data_only is true, additionally filter by user's company
        if (canViewOnlyCompanyData && userCompany) {
          // Defensive: map company name to ID if needed
          let companyId = userCompany;
          if (companyId && companies.length > 0) {
            const found = companies.find(
              c => c.id === companyId || c.name.toLowerCase() === companyId.toLowerCase()
            );
            if (found) companyId = found.id;
          }
          console.log(`Filtering "My" quotations by company ID "${companyId}" (before: ${filteredQuotations.length} records)`);
          filteredQuotations = filteredQuotations.filter(q => q.company === companyId);
          console.log(`After filtering: ${filteredQuotations.length} records match user's company`);
        } else {
          console.log(`Not filtering by company. Showing all ${filteredQuotations.length} of user's quotations`);
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

  // Load features and check permissions
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

    setFilteredQuotations(filtered);
  }, [quotations, searchQuery, statusFilter, yearFilter]);

  // Pagination setup
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
  };

  const handleViewDocument = (pdfUrl: string) => {
    window.open(pdfUrl, '_blank');
  };

  // Helper function to get status color
  const getExternalStatusColor = (status: string) => {
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
                <CardTitle>My Quotations</CardTitle>
                <CardDescription>
                  View quotations created by you or from your requests
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 items-center space-x-2">
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
                    {(searchQuery || statusFilter !== "all" || yearFilter !== new Date().getFullYear().toString()) && (
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
                        <TableHead>Project</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>View Document</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedQuotations.map((quotation) => (
                        <TableRow key={quotation.id}>
                          <TableCell>{quotation.quotationNo}</TableCell>
                          <TableCell>{quotation.date ? new Date(quotation.date).toLocaleDateString() : ""}</TableCell>
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
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {quotation.pdfUrl && (
                                  <DropdownMenuItem 
                                    onClick={() => quotation.pdfUrl && handleViewDocument(quotation.pdfUrl)}
                                  >
                                    View PDF
                                  </DropdownMenuItem>
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
                <CardTitle>My Quotations</CardTitle>
                <CardDescription>
                  View quotations created by you or from your requests
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center space-x-2">
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
                {(searchQuery || statusFilter !== "all" || yearFilter !== new Date().getFullYear().toString()) && (
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
                    <TableHead>Project</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>View Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedQuotations.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell>{quotation.quotationNo}</TableCell>
                      <TableCell>{quotation.date ? new Date(quotation.date).toLocaleDateString() : ""}</TableCell>
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {quotation.pdfUrl && (
                              <DropdownMenuItem 
                                onClick={() => quotation.pdfUrl && handleViewDocument(quotation.pdfUrl)}
                              >
                                View PDF
                              </DropdownMenuItem>
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
    </motion.div>
  );
} 