"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Cross2Icon } from "@radix-ui/react-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuotationStatus } from "@/types/quotation";
import { useCompanyStore } from "@/lib/companies";
import { useEffect, useState } from "react";

interface TableToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: QuotationStatus | "all";
  onStatusFilterChange: (value: QuotationStatus | "all") => void;
  companyFilter: string;
  onCompanyFilterChange: (value: string) => void;
  yearFilter: string;
  onYearFilterChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  onResetFilters: () => void;
  hideDepartmentFilter?: boolean;
}

interface Department {
  id: string;
  name: string;
  description: string;
}

export function TableToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  companyFilter,
  onCompanyFilterChange,
  yearFilter,
  onYearFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  onResetFilters,
  hideDepartmentFilter = false,
}: TableToolbarProps) {
  const currentYear = new Date().getFullYear().toString();
  const hasFilters = 
    searchQuery !== "" || 
    statusFilter !== "all" || 
    companyFilter !== "all" || 
    departmentFilter !== "all" ||
    (yearFilter !== currentYear && yearFilter !== "all");
  const { companies, loadCompanies } = useCompanyStore();
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        loadCompanies();
        // Load departments from the API endpoint
        const response = await fetch('/api/departments');
        if (!response.ok) {
          throw new Error('Failed to load departments');
        }
        const data = await response.json();
        setDepartments(data);
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    };

    loadData();
  }, [loadCompanies]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Search quotations..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 w-[150px] lg:w-[250px]"
        />
        <Input
          type="number"
          placeholder="Filter by year..."
          value={yearFilter}
          onChange={(e) => onYearFilterChange(e.target.value)}
          className="h-9 w-[120px]"
          min={2000}
          max={new Date().getFullYear()}
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => onStatusFilterChange(value as QuotationStatus | "all")}
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="revised">Revised</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={companyFilter}
          onValueChange={(value) => onCompanyFilterChange(value)}
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Select company" />
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
        {!hideDepartmentFilter && (
          <Select
            value={departmentFilter}
            onValueChange={(value) => onDepartmentFilterChange(value)}
          >
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="For Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments && departments.length > 0 && departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={onResetFilters}
            className="h-9 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
} 