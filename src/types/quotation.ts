export type QuotationStatus = 'pending' | 'approved' | 'rejected' | 'request-revise' | 'revised' | 'cancelled';
export type RequestQuotationStatus = 'pending' | 'created' | 'rejected';

export interface QuotationItem {
  id: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  amount?: string;
  qty?: string;
  system?: string;
  unit?: string;
}

export interface Term {
  id: string;
  content: string;
}

export interface Quotation {
  id: string;
  quotationNo: string;
  date: string;
  company: string;
  myCompany?: string;
  project: string;
  title: string;
  amount: number;
  pdfUrl: string;
  annexureUrl?: string;
  items: QuotationItem[];
  terms: Term[];
  toAddress: string;
  attn: string;
  currency: string;
  emailTo: string | string[];
  emailCC?: string | string[];
  salesperson?: string;
  customerReferences?: string;
  paymentTerms?: string;
  dueDate?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  taxRate: string;
  poNo?: string;
  poFileUrl?: string;
  internalStatus: QuotationStatus;
  externalStatus: string;
  actionHistory: string[];
  createdBy?: string;
  createdByRole?: string;
  createdByDepartment?: string;
  creatorType?: string;
  forDepartment?: string;
  status?: 'created' | 'rejected' | 'pending';
  isRequested?: boolean;
  clientApprovalDate?: string;
  poNumber?: string;
  poFile?: string;
  requestId?: string;
}

export interface QuotationFormData {
  company: string;
  project: string;
  title: string;
  discountType: "percentage" | "amount";
  discountValue: string;
  taxRate: string;
  toAddress: string;
  attn: string;
  currency: string;
  emailTo: string | string[];
  emailCC: string | string[];
  salesperson: string;
  customerReferences: string;
  paymentTerms: string;
  dueDate: string;
  items: QuotationItem[];
} 