"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type QuotationRequest } from "@/types/quotationRequest";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useCompanyStore } from "@/lib/companies";
import { useRouter } from "next/navigation";

interface RequestedQuotationsTableProps {
  quotations: QuotationRequest[];
  isLoading: boolean;
  onCreateQuotation: (quotation: QuotationRequest) => void;
  onReject: (quotation: QuotationRequest) => void;
}

const ITEMS_PER_PAGE = 15;

function SimpleTableToolbar({
  searchQuery,
  onSearchChange,
  yearFilter,
  onYearFilterChange,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  yearFilter: string;
  onYearFilterChange: (value: string) => void;
}) {
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quotations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <Input
            type="number"
            placeholder="Filter by year..."
            value={yearFilter === "all" ? "" : yearFilter}
            min="1900"
            max={new Date().getFullYear()}
            onChange={e => onYearFilterChange(e.target.value || "all")}
            className="w-[180px]"
          />
              </div>
            </div>
          );
        }

export function RequestedQuotationsTable({ 
  quotations: allQuotations,
  isLoading = false,
  onCreateQuotation,
  onReject,
}: RequestedQuotationsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const { companies, loadCompanies, isLoading: companiesLoading } = useCompanyStore();
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const router = useRouter();

  // Function to get company name from ID
  const getCompanyName = useCallback((companyName: string) => {
    if (companiesLoading) return "Loading...";
    
    // If the company field already contains a name, just return it
    const company = companies.find(c => c.name === companyName);
    if (company) return companyName;
    
    // Otherwise, try to find by ID as a fallback
    const companyById = companies.find(c => c.id === companyName);
    return companyById ? companyById.name : companyName;
  }, [companies, companiesLoading]);

  // Load companies data
  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);
  
  // Load companies data
  useEffect(() => {
    if (companies.length === 0) {
      loadCompanies();
    }
  }, [companies, loadCompanies]);

  const filteredQuotations = allQuotations.filter((quotation) => {
    const matchesSearch =
      searchQuery === "" ||
      quotation.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quotation.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quotation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quotation.company.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesYear =
      yearFilter === "all" || quotation.date.split('-')[0] === yearFilter;

    return matchesSearch && matchesYear;
  }).reverse();

  const totalPages = Math.ceil(filteredQuotations.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedQuotations = filteredQuotations.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // Function to handle row click
  const handleRowClick = (quotationId: string) => {
    router.push(`/quotations/requested/preview/${quotationId}`);
  };
  // Handle mouse move to track cursor position
  const handleMouseMove = (e: React.MouseEvent) => {
    setCursorPosition({ x: e.clientX, y: e.clientY });
  };
  // Handle mouse enter/leave for tooltip visibility
  const handleMouseEnter = () => setShowTooltip(true);
  const handleMouseLeave = () => setShowTooltip(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SimpleTableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        yearFilter={yearFilter}
        onYearFilterChange={setYearFilter}
      />
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quotation No</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedQuotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  No quotations found
                </TableCell>
              </TableRow>
            ) : (
              paginatedQuotations.map((quotation) => (
                <TableRow
                  key={quotation.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={(e) => {
                    // Only navigate if the click is not on an interactive element
                    if (!(e.target as HTMLElement).closest('button, a, [role="button"]')) {
                      handleRowClick(quotation.id ?? "");
                    }
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <TableCell>{quotation.id}</TableCell>
                  <TableCell>{quotation.date}</TableCell>
                  <TableCell>{quotation.customerName}</TableCell>
                  <TableCell>{getCompanyName(quotation.company)}</TableCell>
                  <TableCell>{quotation.project}</TableCell>
                  <TableCell>{quotation.title}</TableCell>
                  <TableCell>
                    <span className={
                      quotation.status === 'created' ? 'text-green-600' :
                      quotation.status === 'rejected' ? 'text-red-600' :
                      'text-yellow-600'
                    }>
                      {quotation.status === 'created' ? 'Created' :
                       quotation.status === 'rejected' ? 'Rejected' :
                       'Pending Review'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {quotation.status === 'created' && quotation.actionHistory.some(action => action.includes('Created quotation')) ? (
                      quotation.actionHistory
                        .find(action => action.includes('Created quotation'))
                        ?.match(/Created quotation (.*?) on/)?.[1] || '-'
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {quotation.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); onCreateQuotation(quotation); }}
                            className="bg-green-100 hover:bg-green-200 text-green-700"
                          >
                            Create Quotation
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); onReject(quotation); }}
                            className="bg-red-100 hover:bg-red-200 text-red-700"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {quotation.status === 'created' && (
                        <Button
                          size="sm"
                          disabled
                          className="bg-gray-100 text-gray-500"
                        >
                          Quotation Created
                        </Button>
                      )}
                      {quotation.status === 'rejected' && (
                        <Button
                          size="sm"
                          disabled
                          className="bg-gray-100 text-gray-500"
                        >
                          Rejected
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {showTooltip && (
        <div
          className="fixed bg-white text-slate-700 text-xs rounded-md px-3 py-2 whitespace-nowrap pointer-events-none z-50 shadow-md border border-slate-200 font-medium animate-in fade-in duration-200"
          style={{
            left: `${cursorPosition.x + 10}px`,
            top: `${cursorPosition.y - 40}px`,
            transform: "translateZ(0)",
          }}
        >
          Click to view the Preview
          <div className="absolute h-2 w-2 bg-white border-b border-r border-slate-200 rotate-45 left-2 -bottom-1"></div>
        </div>
      )}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage((prev) => Math.max(prev - 1, 1));
                }}
                aria-disabled={currentPage === 1}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(page);
                  }}
                  isActive={currentPage === page}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                }}
                aria-disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
} 