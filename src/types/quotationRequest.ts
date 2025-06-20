export interface QuotationRequest {
  id?: string;
  customerName: string;
  project: string;
  title: string;
  description: string;
  company: string;
  date: string;
  actionHistory: string[];
  status: 'pending' | 'created' | 'rejected';
  userEmail?: string;
} 