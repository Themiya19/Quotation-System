import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuotationFormData, QuotationItem, Term } from "@/types/quotation";
import type { Company } from "@/lib/companies";

interface PreviewQuotationProps {
  previewData: QuotationFormData;
  companies: Company[];
  items: QuotationItem[];
  terms: Term[];
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
  annexureFile: File[];
  onBack: () => void;
  onConfirm: () => void;
  updateItem: (id: string, field: string, value: string) => void;
  myCompanies?: Company[];
}

export default function PreviewQuotation({
  previewData,
  companies,
  items,
  terms,
  totals,
  annexureFile,
  onBack,
  onConfirm,
  myCompanies = []
}: PreviewQuotationProps) {
  const selectedCompany = companies.find(c => c.id === previewData.company);
  const selectedMyCompany = myCompanies[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Preview Quotation</h2>
        <p className="text-muted-foreground">Please review the quotation details before confirming.</p>
      </div>

      {/* PDF Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>PDF Preview Layout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header Section */}
          <div className="flex justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-bold text-blue-900">
                {selectedMyCompany?.name || "D S P Construction & Engineering Works (Pvt) Ltd."}
              </h3>
              <p className="text-gray-600">
                {selectedMyCompany?.address || "No 15, Cross Street,"}
              </p>
              <p className="text-gray-600">Kandy.</p>
              <p className="text-gray-600">Sri Lanka.</p>
              <p className="text-gray-600">
                Telephone: {"094812062863"}
              </p>
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold text-blue-900 mb-2">Quotation</h3>
              <p className="text-gray-600">Quote No. TBD</p>
              <p className="text-gray-600">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* To & Attention Section */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">TO:</h4>
              <p className="whitespace-pre-wrap">{previewData.toAddress}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Attn:</h4>
              <p>{previewData.attn}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">PROJECT</h4>
              <p>{previewData.project}</p>
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
              <div>{previewData.salesperson}</div>
              <div>{previewData.customerReferences}</div>
              <div>{previewData.paymentTerms}</div>
              <div>{previewData.dueDate}</div>
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
                {items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 p-3 text-sm items-center">
                    <div className="col-span-1">{index + 1}</div>
                    <div className="col-span-5">
                      <div className="text-gray-500">System: {item.system}</div>
                      <div>{item.description}</div>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="font-medium">
                        {item.qty}{item.unit ? ` ${item.unit}` : ''}
                      </div>
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="font-medium">
                        {parseFloat(item.amount || '0').toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="font-medium">
                        {(parseFloat(item.qty || '0') * parseFloat(item.amount || '0')).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add an edit button */}
            <div className="flex justify-end mt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onBack}
                className="text-xs"
              >
                Edit Items
              </Button>
            </div>

            {/* Totals Section */}
            <div className="mt-4 flex flex-col items-end space-y-2">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{previewData.currency} {totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Discount {previewData.discountType === 'percentage' ? `(${previewData.discountValue}%)` : ''}:
                  </span>
                  <span>{previewData.currency} {totals.discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({previewData.taxRate}%):</span>
                  <span>{previewData.currency} {totals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{previewData.currency} {totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="border-t pt-6 mt-8">
            <h4 className="font-semibold mb-4">Terms and Conditions:</h4>
            <div className="space-y-2">
              {terms.map((term, index) => (
                <p key={term.id}>{index + 1}. {term.content}</p>
              ))}
            </div>
          </div>

          {/* Signature Section */}
          <div className="border-t pt-6 mt-8">
            <p className="mb-2">To accept this quotation, please sign here and return:</p>
            <p>Authorized Signature and Stamp</p>
          </div>

          <p className="text-right italic mt-6">Thank you!</p>
        </CardContent>
      </Card>

      {/* Additional Details Section */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Details (Not included in PDF)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-3">Company Details</h4>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="font-medium min-w-32">My Company:</span>
                    <span className="text-gray-700">{selectedMyCompany?.name || "Not selected"}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium min-w-32">Client Company:</span>
                    <span className="text-gray-700">{selectedCompany?.name}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium min-w-32">Currency:</span>
                    <span className="text-gray-700">{previewData.currency}</span>
                  </div>
                </div>
              </div>

              {annexureFile.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">Attachments</h4>
                  <div className="flex items-start">
                    <span className="font-medium min-w-32">Annexure File:</span>
                    <span className="text-gray-700">{annexureFile[0].name}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-3">Email Information</h4>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="font-medium min-w-32">Primary Email:</span>
                    <div className="text-gray-700">
                      {Array.isArray(previewData.emailTo) 
                        ? previewData.emailTo.map((email: string, index: number) => (
                            <div key={index}>{email}</div>
                          ))
                        : previewData.emailTo}
                    </div>
                  </div>
                  {previewData.emailCC && (
                    <div className="flex items-start">
                      <span className="font-medium min-w-32">CC Email:</span>
                      <div className="text-gray-700">
                        {Array.isArray(previewData.emailCC) 
                          ? previewData.emailCC.map((email: string, index: number) => (
                              <div key={index}>{email}</div>
                            ))
                          : previewData.emailCC}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-3">Document Status</h4>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="font-medium min-w-32">Status:</span>
                    <span className="text-gray-700">Draft</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium min-w-32">Created On:</span>
                    <span className="text-gray-700">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onBack}>
          Back to Edit
        </Button>
        <Button onClick={onConfirm}>
          Confirm & Create Quotation
        </Button>
      </div>
    </div>
  );
} 