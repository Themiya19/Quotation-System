"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getQuotationById, getQuotationRequestById } from '@/lib/quotations';
import { useCompanyStore } from '@/lib/companies';
import { type Quotation } from '@/types/quotation';
import { type QuotationRequest } from '@/types/quotationRequest';
import ViewQuotationPreview from '@/app/quotations/ViewQuotationPreview';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CompanyDetails } from '@/components/settings/MyCompanies';
import { Company } from '@/lib/companies';

// Extend the Quotation type to include possible requestId
interface ExtendedQuotation extends Quotation {
  requestId?: string;
}

// Function to fetch request quotation directly from the JSON file
async function fetchRequestQuotationsFromFile(): Promise<QuotationRequest[]> {
  try {
    // Use our API endpoint to securely access the file
    const response = await fetch('/api/data?path=data/request_quotation.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch request_quotation.json: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching request_quotation.json:', error);
    return [];
  }
}

// Utility to convert CompanyDetails to Company
function companyDetailsToCompany(details: CompanyDetails): Company {
  return {
    id: details.id || '',
    name: details.name,
    shortName: details.shortName,
    address: details.address,
    attention: undefined,
    currency: 'LKR', // Default or adjust as needed
    terms: [], // No terms in CompanyDetails, so empty array
    emailTo: '', // No emailTo in CompanyDetails, so empty string
    emailCC: undefined,
  };
}

export default function QuotationPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [requestData, setRequestData] = useState<QuotationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const { companies, loadCompanies } = useCompanyStore();
  const unwrappedParams = use(params);
  const [myCompanies, setMyCompanies] = useState<Company[]>([]); // Used for myCompanies prop only

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        setLoading(true);
        await loadCompanies();
        const data = await getQuotationById(unwrappedParams.id);
        
        // Process email fields to ensure they are arrays
        if (data) {
          // Convert emailTo to array if it's a string
          if (data.emailTo && typeof data.emailTo === 'string') {
            data.emailTo = data.emailTo.split(',').map(email => email.trim());
          }
          
          // Convert emailCC to array if it's a string
          if (data.emailCC && typeof data.emailCC === 'string') {
            data.emailCC = data.emailCC.split(',').map(email => email.trim());
          }
        }
        
        setQuotation(data);
        
        // Skip if data is null
        if (!data) return;
        
        // Fetch my companies
        try {
          const response = await fetch('/api/company-details');
          if (response.ok) {
            const companiesData = await response.json();
            setMyCompanies(Array.isArray(companiesData) ? companiesData.map(companyDetailsToCompany) : []);
          }
        } catch (error) {
          console.error('Error loading my companies:', error);
        }
        
        // Check if this is a requested quotation based on the action history or isRequested field
        const isRequested = Boolean(Number(data.isRequested));
        const extendedData = data as ExtendedQuotation;
        console.log('DEBUG: isRequested:', isRequested, 'requestId:', extendedData.requestId);
        if (isRequested && extendedData.requestId) {
          // Always try to fetch from QuotationRequest table first
          const reqData = await getQuotationRequestById(extendedData.requestId);
          console.log('DEBUG: Fetched request data from QuotationRequest table:', reqData);
          if (reqData) {
            setRequestData(reqData);
            setQuotation(data);
            setLoading(false);
            return;
          }
        }
        // Fallback: check action history for requested quotations
        const isRequestedQuotation = isRequested || data.actionHistory?.some(action => 
          action.toLowerCase().includes('requested by') || 
          action.toLowerCase().includes('quotation requested')
        );
        // If it's a requested quotation, try to get the request data by quotation ID or from file
        if (isRequestedQuotation) {
          // Try with the quotation ID
          const reqData = await getQuotationRequestById(data.id);
          console.log('DEBUG: Fetched request data by quotation ID:', reqData);
          if (reqData) {
            setRequestData(reqData);
            setQuotation(data);
            setLoading(false);
            return;
          }
          // If API methods failed, try to fetch from the JSON file directly
          const allRequests = await fetchRequestQuotationsFromFile();
          let requestMatch = allRequests.find(req => req.id === data.id);
          if (!requestMatch) {
            for (const req of allRequests) {
              const matchFound = data.actionHistory.some(action => {
                const actionNormalized = action.toLowerCase();
                return req.actionHistory.some(reqAction => {
                  const reqActionNormalized = reqAction.toLowerCase();
                  if (actionNormalized.includes('requested by') && reqActionNormalized.includes('requested by')) {
                    const actionParts = actionNormalized.split('requested by ')[1]?.split(' (');
                    const reqActionParts = reqActionNormalized.split('requested by ')[1]?.split(' (');
                    if (actionParts && reqActionParts && 
                        actionParts[0] === reqActionParts[0] && 
                        actionParts[1]?.includes(reqActionParts[1]?.split(')')[0] || '')) {
                      return true;
                    }
                  }
                  return false;
                });
              });
              if (matchFound) {
                requestMatch = req;
                break;
              }
            }
          }
          console.log('DEBUG: Fallback requestMatch:', requestMatch);
          if (requestMatch) {
            setRequestData(requestMatch);
            setQuotation(data);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching quotation or request data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [unwrappedParams.id, loadCompanies]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!quotation) {
    return <div className="flex items-center justify-center min-h-screen">Quotation not found</div>;
  }

  // Calculate totals
  const subtotal = quotation.items.reduce((sum, item) => {
    const amount = parseFloat(item.amount ?? '') || 0;
    const qty = parseFloat(item.qty ?? '') || 0;
    return sum + (amount * qty);
  }, 0);

  let discountAmount = 0;
  if (quotation.discountType === "percentage") {
    discountAmount = (subtotal * parseFloat(quotation.discountValue || '0')) / 100;
  } else {
    discountAmount = parseFloat(quotation.discountValue || '0');
  }

  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * parseFloat(quotation.taxRate || '0')) / 100;
  const total = afterDiscount + taxAmount;

  const totals = {
    subtotal,
    discount: discountAmount,
    tax: taxAmount,
    total
  };

  // Even if we couldn't fetch request data from the API or JSON file,
  // we can still extract basic request information from action history
  const requestInfoFromHistory = !requestData && quotation.actionHistory ? 
    extractRequestInfoFromHistory(quotation.actionHistory) : null;

  // For logging purposes
  if (requestData) {
    console.log('Using request data with ID:', requestData.id);
  } else if (requestInfoFromHistory) {
    console.log('Using fallback request info with ID:', requestInfoFromHistory.id);
  }

  return (
    <div>
      <Button 
        variant="outline" 
        className="mb-4"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quotations
      </Button>
      
      <ViewQuotationPreview
        quotation={quotation}
        companies={companies}
        totals={totals}
        onBack={() => router.back()}
        requestData={requestData || requestInfoFromHistory}
        myCompanies={myCompanies}
      />
    </div>
  );
}

// Helper function to extract request information from action history
function extractRequestInfoFromHistory(actionHistory: string[]): QuotationRequest | null {
  // Look for action history entries that contain "Requested by"
  const requestAction = actionHistory.find(action => 
    action.toLowerCase().includes('requested by')
  );
  
  if (!requestAction) return null;
  
  // Parse the action to extract customer name, company, and date
  // Format is typically: "Requested by [name] ([company]) on [date]"
  const match = requestAction.match(/Requested by (\S+(?: \S+)*) \(([^)]+)\) on (\S+)/i);
  
  if (!match) return null;
  
  const [, customerName, company, date] = match;
  
  // Create a minimal QuotationRequest object with the extracted information
  return {
    id: 'QR-' + Date.now().toString().slice(-6), // Generate a request ID with timestamp suffix
    customerName,
    company,
    date,
    project: '',
    title: '',
    description: '',
    actionHistory: [requestAction],
    status: 'created'
  };
} 