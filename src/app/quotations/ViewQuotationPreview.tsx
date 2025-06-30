import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Quotation } from "@/types/quotation";
import { type Company } from "@/lib/companies";
import { type QuotationRequest } from "@/types/quotationRequest";
import { Badge } from "@/components/ui/badge";
import { FileDown } from "lucide-react";
import { useState, useEffect } from "react";
import { getUserByEmail } from "@/lib/user";

interface ViewQuotationPreviewProps {
  quotation: Quotation;
  companies: Company[];
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
  onBack: () => void;
  requestData?: QuotationRequest | null;
  myCompanies?: Company[];
}

// Extend Company to allow for phoneNumber if present
type CompanyWithPhone = Company & { phoneNumber?: string };

export default function ViewQuotationPreview({
  quotation,
  companies,
  totals,
  onBack,
  requestData,
  myCompanies = []
}: ViewQuotationPreviewProps) {
  const selectedCompany = companies.find(c => c.id === quotation.company);
  const [userDepartment, setUserDepartment] = useState<string | undefined>(quotation.createdByDepartment);
  const [myCompany, setMyCompany] = useState<Company | null>(null);

  // Check if this is a requested quotation based on the action history
  const isRequestedQuotation = requestData || quotation.actionHistory.some(action => 
    action.toLowerCase().includes('requested by') || 
    action.toLowerCase().includes('quotation requested')
  );

  // Fetch user department if not available in quotation object
  useEffect(() => {
    const fetchUserDepartment = async () => {
      if (!quotation.createdByDepartment && quotation.createdBy) {
        const userData = await getUserByEmail(quotation.createdBy);
        if (userData && userData.department) {
          setUserDepartment(userData.department);
        }
      }
    };

    fetchUserDepartment();
  }, [quotation.createdByDepartment, quotation.createdBy]);

  // Set myCompany from props or fetch if needed
  useEffect(() => {
    if (quotation.myCompany) {
      // First try to find it in the provided myCompanies array
      const foundCompany = myCompanies.find(c => c.id === quotation.myCompany);
      if (foundCompany) {
        setMyCompany(foundCompany);
        return;
      }
      
      // If not found in props, fetch from API
      const fetchMyCompany = async () => {
        try {
          const response = await fetch(`/api/company-details/${quotation.myCompany}`);
          if (response.ok) {
            const data = await response.json();
            setMyCompany(data);
          }
        } catch (error) {
          console.error('Error fetching my company details:', error);
        }
      };
      
      fetchMyCompany();
    }
  }, [quotation.myCompany, myCompanies]);

  // Helper function to get status color based on status
  // const getStatusColor = (status: string) => {
  //   const statusColors: Record<string, string> = {
  //     'pending': 'bg-yellow-100 text-yellow-800',
  //     'approved': 'bg-green-100 text-green-800',
  //     'rejected': 'bg-red-100 text-red-800',
  //     'revised': 'bg-blue-100 text-blue-800',
  //     'request-revise': 'bg-purple-100 text-purple-800',
  //     'Pending Review': 'bg-yellow-100 text-yellow-800',
  //     'Approved': 'bg-green-100 text-green-800',
  //     'Revision Requested': 'bg-purple-100 text-purple-800'
  //   };
    
  //   return statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  // };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">Quotation {quotation.quotationNo}</h2>
            {isRequestedQuotation && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Requested Quotation
              </Badge>
            )}
          </div>
          
        </div>
      </div>

      {/* Quotation Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Quotation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Side Information */}
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Project:</div>
                    <div>{quotation.project}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Title:</div>
                    <div>{quotation.title}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Amount:</div>
                    <div>{quotation.currency} {totals.total.toFixed(2)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">My Company:</div>
                    <div>{myCompany?.name || "Not specified"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Client Company:</div>
                    <div>{selectedCompany?.name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Quotation Type:</div>
                    <div>
                      {isRequestedQuotation ? "Requested Quotation" : "Direct Quotation"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Created On:</div>
                    <div>{quotation.date}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Created By:</div>
                    <div>{quotation.createdBy || "Unknown"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Role:</div>
                    <div>{quotation.createdByRole || "Unknown"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Department:</div>
                    <div>{userDepartment || "Not specified"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">For Department:</div>
                    <div>{quotation.forDepartment || "Not specified"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Email:</div>
                    <div className="space-y-1">
                      {Array.isArray(quotation.emailTo) 
                        ? quotation.emailTo.map((email, index) => (
                            <div key={index}>{email}</div>
                          ))
                        : <div>{quotation.emailTo}</div>
                      }
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">CC Email:</div>
                    <div className="space-y-1">
                      {Array.isArray(quotation.emailCC) 
                        ? quotation.emailCC.map((email, index) => (
                            <div key={index}>{email}</div>
                          ))
                        : <div>{quotation.emailCC || "N/A"}</div>
                      }
                    </div>
                  </div>
                  {quotation.poNo && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">PO Number:</div>
                      <div>{quotation.poNo}</div>
                    </div>
                  )}
                  {quotation.poFileUrl && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">PO File:</div>
                      <div>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-blue-600 hover:underline"
                          onClick={() => window.open(quotation.poFileUrl)}
                        >
                          View PO File
                        </Button>
                      </div>
                    </div>
                  )}
                  {quotation.annexureUrl && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">Annexure:</div>
                      <div>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-blue-600 hover:underline"
                          onClick={() => window.open(quotation.annexureUrl)}
                        >
                          View Annexure PDF
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side Information */}
            <div className="space-y-4">
              {requestData ? (
                <div className="border rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">Requested By:</div>
                      <div>{requestData.customerName}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">Request ID:</div>
                      <div>{requestData.id || "Unknown"}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">Company:</div>
                      <div>{companies.find(c => c.id === requestData.company)?.name || requestData.company}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">Request Date:</div>
                      <div>{requestData.date}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4 text-center text-gray-500">
                  No request information available
                </div>
              )}
              
              {/* Status Section */}
              <div className="border rounded-lg p-4 mt-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Internal Status:</div>
                    <div>
                      {quotation.internalStatus}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Client Status:</div>
                    <div>
                      {quotation.externalStatus}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>PDF Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header Section */}
          <div className="flex justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-bold text-blue-900">
                {myCompany?.name || "D S P Construction & Engineering Works (Pvt) Ltd."}
              </h3>
              <p className="text-gray-600">
                {myCompany?.address || "No 15, Cross Street,"}
              </p>
              {/* <p className="text-gray-600">Kandy.</p>
              <p className="text-gray-600">Sri Lanka.</p> */}
              <p className="text-gray-600">
                Telephone: {
                  myCompany && (myCompany as CompanyWithPhone).phoneNumber
                    ? (myCompany as CompanyWithPhone).phoneNumber
                    : "094812062863"
                }
              </p>
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold text-blue-900 mb-2">Quotation</h3>
              <p className="text-gray-600">Quote No. {quotation.quotationNo}</p>
              <p className="text-gray-600">{quotation.date}</p>
            </div>
          </div>

          {/* To & Attention Section */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">TO:</h4>
              <p className="whitespace-pre-wrap">{quotation.toAddress}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Attn:</h4>
              <p>{quotation.attn}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">PROJECT</h4>
              <p>{quotation.project}</p>
            </div>
          </div>

          {/* Info Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 gap-4 bg-gray-50 p-3 text-sm font-medium">
              <div>Salesperson</div>
              <div>Customer References</div>
              <div>Payment Terms</div>
              <div>Due Date</div>
            </div>
            <div className="grid grid-cols-4 gap-4 p-3 text-sm border-t">
              <div>{quotation.salesperson}</div>
              <div>{quotation.customerReferences}</div>
              <div>{quotation.paymentTerms}</div>
              <div>{quotation.dueDate}</div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-4 bg-gray-50 p-3 text-sm font-medium">
                <div className="col-span-1">SNo.</div>
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              <div className="divide-y">
                {(quotation.items || []).map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 p-3 text-sm">
                    <div className="col-span-1">{index + 1}</div>
                    <div className="col-span-5">
                      <div className="text-gray-500">System: {item.system}</div>
                      <div className="break-words whitespace-pre-line max-w-md">{item.description}</div>
                    </div>
                    <div className="col-span-2 text-center font-medium">
                      {item.qty}{item.unit ? ` ${item.unit}` : ''}
                    </div>
                    <div className="col-span-2 text-right font-medium">
                      {parseFloat(item.amount || '0').toFixed(2)}
                    </div>
                    <div className="col-span-2 text-right font-medium">
                      {(parseFloat(item.qty || '0') * parseFloat(item.amount || '0')).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Section */}
            <div className="mt-4 flex flex-col items-end space-y-2">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{quotation.currency} {totals.subtotal.toFixed(2)}</span>
                </div>
                {parseFloat(quotation.discountValue || '0') > 0 && (
                  <div className="flex justify-between">
                    <span>
                      Discount {quotation.discountType === 'percentage' ? `(${quotation.discountValue}%)` : ''}:
                    </span>
                    <span>{quotation.currency} {totals.discount.toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(quotation.taxRate || '0') > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({quotation.taxRate}%):</span>
                    <span>{quotation.currency} {totals.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{quotation.currency} {totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="border-t pt-6 mt-8">
            <h4 className="font-semibold mb-4">Terms and Conditions:</h4>
            {(quotation.terms || []).map((term, index) => (
              <p key={term.id} className="break-words whitespace-pre-line max-w-md">{index + 1}. {term.content}</p>
            ))}
          </div>

          {/* Signature Section */}
          <div className="border-t pt-6 mt-8">
            <p className="mb-2">To accept this quotation, please sign here and return:</p>
            <p>Authorized Signature and Stamp</p>
          </div>

          <p className="text-right italic mt-6">Thank you!</p>
        </CardContent>
      </Card>

      {/* Action History Section */}
      {quotation.actionHistory && quotation.actionHistory.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Action History</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700">
              {quotation.actionHistory.map((entry, idx) => (
                <li key={idx}>{entry}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex justify-between">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => window.open(quotation.pdfUrl, '_blank')}
          >
            <FileDown className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
        <Button onClick={onBack}>Back</Button>
      </div>

      
    </div>
  );
} 