import { type Quotation, type QuotationStatus } from '@/types/quotation';
import { type QuotationRequest } from '@/types/quotationRequest';

export async function getAllQuotations(): Promise<Quotation[]> {
  const response = await fetch('/api/quotations');
  const data = await response.json();
  return data; // not data.quotations
}

export async function getQuotationById(id: string): Promise<Quotation | null> {
  try {
    const response = await fetch(`/api/quotations/${id}`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching quotation:', error);
    return null;
  }
}

export async function addQuotation(quotationData: Omit<Quotation, 'id' | 'quotationNo'>): Promise<Quotation> {
  const response = await fetch('/api/quotations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(quotationData),
  });
  return response.json();
}

export async function updateQuotation(id: string, updates: Partial<Quotation>): Promise<Quotation | null> {
  const response = await fetch('/api/quotations', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, updates }),
  });
  
  if (!response.ok) {
    return null;
  }
  
  return response.json();
}

export async function deleteQuotation(id: string): Promise<boolean> {
  const response = await fetch('/api/quotations', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }),
  });
  
  return response.ok;
}

// Status update functions
export async function approveQuotation(id: string): Promise<Quotation | null> {
  const currentQuotation = await getQuotationById(id);
  const currentDate = new Date().toISOString().split('T')[0];
  const newAction = `Approved on ${currentDate}`;
  const newActionHistory = [...(currentQuotation?.actionHistory || []), newAction];
  return updateQuotation(id, { internalStatus: 'approved', actionHistory: newActionHistory });
}

export async function rejectQuotation(id: string): Promise<Quotation | null> {
  const currentQuotation = await getQuotationById(id);
  const currentDate = new Date().toISOString().split('T')[0];
  const newAction = `Rejected on ${currentDate}`;
  const newActionHistory = [...(currentQuotation?.actionHistory || []), newAction];
  return updateQuotation(id, { internalStatus: 'rejected', actionHistory: newActionHistory });
}

export async function requestReviseQuotation(id: string): Promise<Quotation | null> {
  const currentQuotation = await getQuotationById(id);
  const currentDate = new Date().toISOString().split('T')[0];
  const newAction = `Revision requested on ${currentDate}`;
  const newActionHistory = [...(currentQuotation?.actionHistory || []), newAction];
  return updateQuotation(id, { internalStatus: 'request-revise', actionHistory: newActionHistory });
}

export async function reviseQuotation(id: string): Promise<Quotation | null> {
  return updateQuotation(id, { internalStatus: "revised" as QuotationStatus });
}

export async function addQuotationRequest(quotationData: Omit<QuotationRequest, "id">): Promise<QuotationRequest> {
  const response = await fetch('/api/quotation-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(quotationData),
  });

  if (!response.ok) {
    throw new Error('Failed to save quotation request');
  }

  return response.json();
}

export async function getQuotationRequests(): Promise<QuotationRequest[]> {
  const response = await fetch('/api/quotation-requests');
  if (!response.ok) {
    throw new Error('Failed to fetch quotation requests');
  }
  return response.json();
}

export async function getRequestedQuotations(): Promise<Quotation[]> {
  const response = await fetch('/api/quotations/requested');
  const data = await response.json();
  return data.quotations;
}

export async function getQuotationRequestById(id: string): Promise<QuotationRequest | null> {
  try {
    const response = await fetch(`/api/quotation-requests/${id}`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching quotation request:', error);
    return null;
  }
}

// Client status update functions
export async function clientApproveQuotation(id: string): Promise<Quotation | null> {
  // First, get the current quotation to verify it's internally approved
  const currentQuotation = await getQuotationById(id);
  
  if (!currentQuotation || currentQuotation.internalStatus !== 'approved') {
    console.error('Cannot set client approval: quotation not found or not internally approved');
    return null;
  }
  
  // Check if external status is already set to something other than pending
  if (currentQuotation.externalStatus && 
      currentQuotation.externalStatus.toLowerCase() !== 'pending') {
    console.error('Client status for this quotation is already set');
    return null;
  }
  
  const currentDate = new Date().toISOString().split('T')[0];
  const newActionHistory = [...currentQuotation.actionHistory, `Client approval set on ${currentDate}`];
  
  return updateQuotation(id, { 
    externalStatus: 'approved',
    actionHistory: newActionHistory
  });
}

export async function clientRejectQuotation(id: string): Promise<Quotation | null> {
  // First, get the current quotation to verify it's internally approved
  const currentQuotation = await getQuotationById(id);
  
  if (!currentQuotation || currentQuotation.internalStatus !== 'approved') {
    console.error('Cannot set client rejection: quotation not found or not internally approved');
    return null;
  }
  
  // Check if external status is already set to something other than pending
  if (currentQuotation.externalStatus && 
      currentQuotation.externalStatus.toLowerCase() !== 'pending') {
    console.error('Client status for this quotation is already set');
    return null;
  }
  
  const currentDate = new Date().toISOString().split('T')[0];
  const newActionHistory = [...currentQuotation.actionHistory, `Client rejection set on ${currentDate}`];
  
  return updateQuotation(id, { 
    externalStatus: 'rejected',
    actionHistory: newActionHistory
  });
} 