"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllQuotations } from "@/lib/quotations";
import { type Quotation } from "@/types/quotation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, DollarSign, TrendingUp, CheckCircle2 } from "lucide-react";
import Cookies from 'js-cookie';
import { useRouter } from "next/navigation";
import { hasAnalyticsPermission } from "@/lib/permissions";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Variants } from "framer-motion";
import { Input } from '@/components/ui/input';

interface Company {
  id: string;
  name: string;
  shortName: string;
  address: string;
  phoneNumber: string;
  logoUrl: string;
  updatedAt: string;
}

interface PieChartLabel {
  name: string;
  percent: number;
}

// Type for features used in permission checks
type Feature = {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
};

export default function AnalyticsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isMounted, setIsMounted] = useState(false);
  const [scope, setScope] = useState<'all' | 'personal' | 'department'>('all');
  const [departments, setDepartments] = useState<Array<{id: string, name: string, description: string}>>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const router = useRouter();
  
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

  useEffect(() => {
    // Check if the user has permission to view analytics
    const checkAnalyticsPermission = async () => {
      try {
        // Check if user is internal first
        const accessType = Cookies.get('accessType');
        if (accessType !== 'internal') {
          router.push('/login');
          return;
        }

        // Check if user has analytics permission
        const canViewAnalytics = await hasAnalyticsPermission();
        
        // Check if user is restricted to department view
        const featuresResponse = await fetch('/api/features');
        const features = await featuresResponse.json();
        const userType = Cookies.get('internalType');
        
        // Check for department-only restriction
        const viewDepartmentFeature = (features as Feature[]).find((f) => f.id === 'view_department_data');
        const hasViewDepartmentRestriction = viewDepartmentFeature?.allowedRoles.includes(userType || '');
        
        // Check for own-quotations-only restriction
        const viewOwnQuotationsFeature = (features as Feature[]).find((f) => f.id === 'view_own_quotations_only');
        const hasViewOwnQuotationsRestriction = viewOwnQuotationsFeature?.allowedRoles.includes(userType || '');
        
        // Set full access if user has analytics permission AND has no restrictions
        setHasFullAccess(canViewAnalytics && !hasViewDepartmentRestriction && !hasViewOwnQuotationsRestriction);
        
        // If user has own-quotations restriction, force personal view
        if (hasViewOwnQuotationsRestriction) {
          setScope('personal');
        }
        // If user has department restriction but not own-quotations restriction, force department view
        else if (hasViewDepartmentRestriction) {
          setScope('department');
        }
        
        // If user doesn't have full analytics permission or has any restriction,
        // restrict their access accordingly
        if (!canViewAnalytics || hasViewDepartmentRestriction || hasViewOwnQuotationsRestriction) {
          try {
            const response = await fetch('/api/departments');
            const data = await response.json();
            setDepartments(data);
            
            // Set selected department to the user's department
            const userDepartment = Cookies.get('department');
            setSelectedDepartment(userDepartment || (data.length > 0 ? data[0].id : ''));
            
            loadQuotations();
          } catch (error) {
            console.error('Error loading data:', error);
            router.push('/quotations');
          }
          return;
        }

        // Load departments
        try {
          const response = await fetch('/api/departments');
          const data = await response.json();
          setDepartments(data);
          
          // Set selected department to the user's department
          const userDepartment = Cookies.get('department');
          setSelectedDepartment(userDepartment || (data.length > 0 ? data[0].id : ''));
        } catch (error) {
          console.error('Error loading departments:', error);
        }

        // User has full permission, load all data
        loadQuotations();
      } catch (error) {
        console.error('Error checking permissions:', error);
        router.push('/quotations');
      }
    };

    const loadQuotations = async () => {
      try {
        setIsLoading(true);
        const data = await getAllQuotations();
        setQuotations(data);
      } catch (error) {
        console.error('Error loading quotations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Load company data
    const loadCompanies = async () => {
      try {
        // Use the company-details API endpoint
        const response = await fetch('/api/company-details');
        if (!response.ok) {
          throw new Error(`Failed to fetch companies: ${response.status}`);
        }
        
        const companyData = await response.json();
        console.log('Loaded companies:', companyData);
        
        if (Array.isArray(companyData) && companyData.length > 0) {
          setCompanies(companyData);
        } else {
          toast.error('No companies available');
        }
      } catch (error) {
        console.error('Error loading companies:', error);
        
        // Fallback to direct file access
        try {
          const fallbackResponse = await fetch('/data/company_details.json');
          if (!fallbackResponse.ok) {
            throw new Error(`Failed to fetch from fallback: ${fallbackResponse.status}`);
          }
          
          const fallbackData = await fallbackResponse.json();
          console.log('Loaded companies from direct file:', fallbackData);
          setCompanies(fallbackData);
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError);
          toast.error('Failed to load company data');
        }
      }
    };

    checkAnalyticsPermission();
    loadCompanies();
    
    // Only enable animations after client-side hydration is complete
    setIsMounted(true);
  }, [router]);

  // Filter quotations based on selected period
  useEffect(() => {
    if (quotations.length === 0) {
      setFilteredQuotations([]);
      return;
    }

    const now = new Date();
    let startDate = new Date(selectedYear, 0, 1); // Start of selected year
    let endDate = new Date(selectedYear, 11, 31); // End of selected year
    
    if (period === 'month') {
      startDate = new Date(selectedYear, now.getMonth() - 1, 1);
      endDate = new Date(selectedYear, now.getMonth() + 1, 0);
    } else if (period === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(selectedYear, currentQuarter * 3 - 3, 1);
      endDate = new Date(selectedYear, (currentQuarter + 1) * 3, 0);
    }

    // Get user info from cookies
    const userEmail = Cookies.get('userEmail');
    const userDepartment = Cookies.get('department');

    let filtered = quotations.filter(q => {
      const quoteDate = new Date(q.date);
      return quoteDate >= startDate && quoteDate <= endDate;
    });

    // Apply scope filter
    if (scope === 'personal') {
      filtered = filtered.filter(q => q.createdBy === userEmail);
    } else if (scope === 'department') {
      // If a department is selected, filter by selected department, otherwise use user's department
      const departmentToFilter = selectedDepartment || userDepartment;
      filtered = filtered.filter(q => q.createdByDepartment === departmentToFilter);
    }

    // Apply company filter if a specific company is selected
    if (selectedCompany !== 'all') {
      console.log(`Filtering by company: ${selectedCompany}`);
      console.log(`Before filter: ${filtered.length} quotations`);
      
      // Get the selected company object
      const selectedCompanyObj = companies.find(c => c.id === selectedCompany);
      console.log('Selected company:', selectedCompanyObj);
      
      // Filter quotations by the selected company ID using myCompany field
      // Some quotations might use company or myCompany field, check both
      filtered = filtered.filter(q => q.myCompany === selectedCompany);
      
      console.log(`After filter: ${filtered.length} quotations`);
      
      // Log the first few quotations to debug company values
      if (filtered.length > 0) {
        console.log('Sample filtered quotation companies:', 
          filtered.slice(0, 3).map(q => ({ id: q.id, company: q.company, myCompany: q.myCompany }))
        );
      } else {
        console.log('No quotations match the company filter');
        // Log the companies of the first few original quotations
        console.log('Sample quotation companies:', 
          quotations.slice(0, 3).map(q => ({ id: q.id, company: q.company, myCompany: q.myCompany }))
        );
      }
    }

    setFilteredQuotations(filtered);
  }, [quotations, period, scope, selectedYear, selectedDepartment, selectedCompany, companies]);

  // Calculate statistics
  const totalQuotations = filteredQuotations.length;
  const approvedQuotations = filteredQuotations.filter(q => q.internalStatus === 'approved').length;
  const rejectedQuotations = filteredQuotations.filter(q => q.internalStatus === 'rejected').length;
  const pendingQuotations = filteredQuotations.filter(q => q.internalStatus === 'pending').length;

  // Calculate total value of quotations
  const totalValue = filteredQuotations.reduce((sum, q) => sum + (q.amount || 0), 0);
  const averageValue = totalQuotations > 0 ? totalValue / totalQuotations : 0;

  // Period comparison data
  const getPreviousPeriodData = () => {
    if (quotations.length === 0) return { count: 0, value: 0, approvalRate: 0 };
    
    const now = new Date();
    const currentPeriodStart = new Date();
    const previousPeriodStart = new Date();
    const previousPeriodEnd = new Date();
    
    if (period === 'month') {
      currentPeriodStart.setMonth(now.getMonth() - 1);
      previousPeriodStart.setMonth(now.getMonth() - 2);
      previousPeriodEnd.setMonth(now.getMonth() - 1);
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
    } else if (period === 'quarter') {
      currentPeriodStart.setMonth(now.getMonth() - 3);
      previousPeriodStart.setMonth(now.getMonth() - 6);
      previousPeriodEnd.setMonth(now.getMonth() - 3);
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
    } else if (period === 'year') {
      currentPeriodStart.setFullYear(now.getFullYear() - 1);
      previousPeriodStart.setFullYear(now.getFullYear() - 2);
      previousPeriodEnd.setFullYear(now.getFullYear() - 1);
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
    }
    
    const previousPeriodQuotations = quotations.filter(q => {
      const quoteDate = new Date(q.date);
      return quoteDate >= previousPeriodStart && quoteDate <= previousPeriodEnd;
    });
    
    const prevCount = previousPeriodQuotations.length;
    const prevValue = previousPeriodQuotations.reduce((sum, q) => sum + (q.amount || 0), 0);
    const prevApprovals = previousPeriodQuotations.filter(q => q.internalStatus === 'approved').length;
    
    return { 
      count: prevCount, 
      value: prevValue,
      approvalRate: prevCount > 0 ? (prevApprovals / prevCount) * 100 : 0
    };
  };
  
  const previousPeriod = getPreviousPeriodData();
  
  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
  const countChange = calculatePercentChange(totalQuotations, previousPeriod.count);
  const valueChange = calculatePercentChange(totalValue, previousPeriod.value);
  const approvalChange = calculatePercentChange(
    totalQuotations > 0 ? (approvedQuotations / totalQuotations) * 100 : 0,
    previousPeriod.approvalRate
  );

  // Prepare data for status distribution chart
  const statusData = [
    { name: 'Approved', value: approvedQuotations },
    { name: 'Rejected', value: rejectedQuotations },
    { name: 'Pending', value: pendingQuotations },
  ].filter(item => item.value > 0);

  // Prepare monthly data
  const getTimeChartData = () => {
    // Group by appropriate time period
    const timeMap = new Map();
    
    filteredQuotations.forEach(quotation => {
      const date = new Date(quotation.date);
      let timeKey;
      
      if (period === 'month') {
        // Group by day for month view
        timeKey = date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      } else if (period === 'quarter') {
        // Group by week for quarter view
        const weekNum = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
        timeKey = `W${weekNum} ${date.toLocaleString('default', { month: 'short' })}`;
      } else {
        // Group by month for year view
        timeKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      }
      
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, { period: timeKey, count: 0, value: 0 });
      }
      
      const entry = timeMap.get(timeKey);
      entry.count += 1;
      entry.value += quotation.amount || 0;
    });
    
    // Convert to array and sort chronologically
    return Array.from(timeMap.values()).sort((a, b) => {
      // This is a simplified sort that works with our format
      return a.period.localeCompare(b.period);
    });
  };

  const timeChartData = getTimeChartData();

  const COLORS = ['#10B981', '#EF4444', '#F59E0B'];

  // Get the current department name
  const getCurrentDepartmentName = () => {
    if (scope === 'department' && selectedDepartment) {
      const dept = departments.find(d => d.id === selectedDepartment);
      return dept?.name || 'Unknown Department';
    }
    
    const userDepartment = Cookies.get('department');
    const dept = departments.find(d => d.id === userDepartment);
    return dept?.name || userDepartment || 'Unknown Department';
  };

  // Get the analytics title based on scope
  const getAnalyticsTitle = () => {
    switch (scope) {
      case 'personal':
        return 'My Quotation Analytics';
      case 'department':
        return `${getCurrentDepartmentName()} Department Analytics`;
      default:
        return 'Quotation Analytics';
    }
  };

  // Generate array of years from 5 years ago to current year
  // const availableYears = Array.from({ length: 6 }, (_, i) => 
  //   new Date().getFullYear() - 5 + i
  // );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Quotation Analytics</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-[150px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[100px] mb-2" />
                <Skeleton className="h-4 w-[60px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  // During SSR and initial hydration, render without motion components
  if (!isMounted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-4">
          <h1 className="text-3xl font-bold">{getAnalyticsTitle()}</h1>
          {scope === 'department' && !hasFullAccess && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">
                You are restricted to your department&apos;s analytics due to permissions
              </p>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Department view only
              </span>
            </div>
          )}
          {scope === 'personal' && !hasFullAccess && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">
                You are restricted to viewing only your own quotation analytics
              </p>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Personal view only
              </span>
            </div>
          )}
        </div>

        {/* Simple 2-row filter layout */}
        <div className="mb-8 space-y-3">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="inline-flex items-center gap-2">
              <div className="text-sm font-medium whitespace-nowrap mr-2">DSP:</div>
              <Select
                value={selectedCompany}
                onValueChange={setSelectedCompany}
              >
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies && companies.length > 0 ? (
                    companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>
                      No companies available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="inline-flex items-center gap-2">
              <div className="text-sm font-medium whitespace-nowrap mr-2">Period:</div>
              <div className="inline-flex bg-muted rounded-md overflow-hidden">
                <button
                  className={`px-3 py-1.5 text-sm ${period === 'month' ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => setPeriod('month')}
                >
                  Month
                </button>
                <button
                  className={`px-3 py-1.5 text-sm ${period === 'quarter' ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => setPeriod('quarter')}
                >
                  Quarter
                </button>
                <button
                  className={`px-3 py-1.5 text-sm ${period === 'year' ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => setPeriod('year')}
                >
                  Year
                </button>
              </div>
              <Input
                  type="number"
                  placeholder="Year"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value) || new Date().getFullYear())}
                  className="h-8 w-[100px]"
                />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="inline-flex items-center gap-2">
              <div className="text-sm font-medium whitespace-nowrap mr-2">View:</div>
              {hasFullAccess ? (
                <div className="inline-flex bg-muted rounded-md overflow-hidden">
                  <button
                    className={`px-3 py-1.5 text-sm ${scope === 'all' ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => setScope('all')}
                  >
                    All Quotations
                  </button>
                  <button
                    className={`px-3 py-1.5 text-sm ${scope === 'personal' ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => setScope('personal')}
                  >
                    My Quotations
                  </button>
                  <button
                    className={`px-3 py-1.5 text-sm ${scope === 'department' ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => setScope('department')}
                  >
                    Department
                  </button>
                </div>
              ) : (
                <div className="px-3 py-1.5 bg-muted text-sm rounded-md">
                  {scope === 'personal' ? 'My Quotations' : 'Department'}
                </div>
              )}
            </div>

            {scope === 'department' && hasFullAccess && (
              <div className="inline-flex items-center gap-2">
                <div className="text-sm font-medium whitespace-nowrap">Department:</div>
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                >
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuotations}</div>
              <p className={`text-xs ${countChange >= 0 ? 'text-green-500' : 'text-red-500'} mt-1 flex items-center`}>
                {countChange !== 0 ? 
                  `${countChange > 0 ? '+' : ''}${countChange.toFixed(1)}% from last ${period}` :
                  <span className="text-muted-foreground">No change from last {period}</span>
                }
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
              <p className={`text-xs ${valueChange >= 0 ? 'text-green-500' : 'text-red-500'} mt-1 flex items-center`}>
                {valueChange !== 0 ? 
                  `${valueChange > 0 ? '+' : ''}${valueChange.toFixed(1)}% from last ${period}` :
                  <span className="text-muted-foreground">No change from last {period}</span>
                }
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Average Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${averageValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {previousPeriod.count > 0 ? 
                  `${period === 'month' ? 'Monthly' : period === 'quarter' ? 'Quarterly' : 'Yearly'} average` :
                  `No previous ${period} data`
                }
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalQuotations > 0 ? ((approvedQuotations / totalQuotations) * 100).toFixed(1) : 0}%
              </div>
              <p className={`text-xs ${approvalChange >= 0 ? 'text-green-500' : 'text-red-500'} mt-1 flex items-center`}>
                {approvalChange !== 0 ? 
                  `${approvalChange > 0 ? '+' : ''}${approvalChange.toFixed(1)}% from last ${period}` :
                  <span className="text-muted-foreground">No change from last {period}</span>
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Distribution Chart */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Quotation Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: PieChartLabel) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                {statusData.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    No data available for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Time Trends Chart */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">
                {period === 'month' ? 'Daily' : period === 'quarter' ? 'Weekly' : 'Monthly'} Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" name="Number of Quotations" fill="#8884d8" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="value" name="Total Value ($)" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {timeChartData.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    No data available for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // After hydration, render with animations
  return (
    <motion.div 
      className="container mx-auto px-4 py-8 max-w-7xl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-4 mb-8">
        {/* Title and Filters Row */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{getAnalyticsTitle()}</h1>
          
          {/* Status messages about restrictions */}
          {scope === 'department' && !hasFullAccess && (
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm text-muted-foreground">
                You are restricted to your department&apos;s analytics due to permissions
              </p>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Department view only
              </span>
            </div>
          )}
          {scope === 'personal' && !hasFullAccess && (
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm text-muted-foreground">
                You are restricted to viewing only your own quotation analytics
              </p>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Personal view only
              </span>
            </div>
          )}

          {/* Filter controls in a simplified layout */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">DSP:</div>
                <Select
                  value={selectedCompany}
                  onValueChange={setSelectedCompany}
                >
                  <SelectTrigger className="h-8 w-[180px]">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies && companies.length > 0 ? (
                      companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>
                        No companies available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">Period:</div>
                <div className="flex">
                  <button
                    className={`px-3 py-1 text-sm rounded-l-md ${period === 'month' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                    onClick={() => setPeriod('month')}
                  >
                    Month
                  </button>
                  <button
                    className={`px-3 py-1 text-sm ${period === 'quarter' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                    onClick={() => setPeriod('quarter')}
                  >
                    Quarter
                  </button>
                  <button
                    className={`px-3 py-1 text-sm rounded-r-md ${period === 'year' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                    onClick={() => setPeriod('year')}
                  >
                    Year
                  </button>
                </div>
                <Input
                    type="number"
                    placeholder="Year"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value) || new Date().getFullYear())}
                    className="h-8 w-[100px]"
                  />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">View:</div>
                {hasFullAccess && (
                  <div className="flex">
                    <button
                      className={`px-3 py-1 text-sm rounded-l-md ${scope === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                      onClick={() => setScope('all')}
                    >
                      All Quotations
                    </button>
                    <button
                      className={`px-3 py-1 text-sm ${scope === 'personal' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                      onClick={() => setScope('personal')}
                    >
                      My Quotations
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded-r-md ${scope === 'department' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                      onClick={() => setScope('department')}
                    >
                      Department
                    </button>
                  </div>
                )}
              </div>

              {scope === 'department' && hasFullAccess && (
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">Department:</div>
                  <Select
                    value={selectedDepartment}
                    onValueChange={setSelectedDepartment}
                  >
                    <SelectTrigger className="h-8 w-[180px]">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuotations}</div>
            <p className={`text-xs ${countChange >= 0 ? 'text-green-500' : 'text-red-500'} mt-1 flex items-center`}>
              {countChange !== 0 ? 
                `${countChange > 0 ? '+' : ''}${countChange.toFixed(1)}% from last ${period}` :
                <span className="text-muted-foreground">No change from last {period}</span>
              }
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className={`text-xs ${valueChange >= 0 ? 'text-green-500' : 'text-red-500'} mt-1 flex items-center`}>
              {valueChange !== 0 ? 
                `${valueChange > 0 ? '+' : ''}${valueChange.toFixed(1)}% from last ${period}` :
                <span className="text-muted-foreground">No change from last {period}</span>
              }
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Average Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {previousPeriod.count > 0 ? 
                `${period === 'month' ? 'Monthly' : period === 'quarter' ? 'Quarterly' : 'Yearly'} average` :
                `No previous ${period} data`
              }
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalQuotations > 0 ? ((approvedQuotations / totalQuotations) * 100).toFixed(1) : 0}%
            </div>
            <p className={`text-xs ${approvalChange >= 0 ? 'text-green-500' : 'text-red-500'} mt-1 flex items-center`}>
              {approvalChange !== 0 ? 
                `${approvalChange > 0 ? '+' : ''}${approvalChange.toFixed(1)}% from last ${period}` :
                <span className="text-muted-foreground">No change from last {period}</span>
              }
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Distribution Chart */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Quotation Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: PieChartLabel) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              {statusData.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                  No data available for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Time Trends Chart */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">
              {period === 'month' ? 'Daily' : period === 'quarter' ? 'Weekly' : 'Monthly'} Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" name="Number of Quotations" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="value" name="Total Value ($)" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {timeChartData.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                  No data available for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
} 