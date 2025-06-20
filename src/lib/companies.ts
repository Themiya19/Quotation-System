import { create } from 'zustand';

export interface Company {
  id: string;
  name: string;
  shortName?: string;
  currency: "USD" | "SGD" | "LKR";
  terms: { id: number; content: string }[];
  emailTo: string[] | string;
  emailCC?: string[] | string;
  address?: string;
  attention?: string;
}

export interface CompanyStore {
  companies: Company[];
  isLoading: boolean;
  addCompany: (company: Omit<Company, 'id'>) => Promise<void>;
  updateCompany: (id: string, company: Omit<Company, 'id'>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  loadCompanies: () => Promise<Company[]>;
}

export const useCompanyStore = create<CompanyStore>((set, get) => ({
  companies: [],
  isLoading: false,
  
  loadCompanies: async () => {
    try {
      // Set a loading flag to prevent multiple concurrent requests
      if (get().isLoading) {
        return;
      }
      
      set({ isLoading: true });
      
      const response = await fetch('/api/companies');
      const data = await response.json();
      
      if (response.ok) {
        set({ companies: data.companies, isLoading: false });
        return data.companies;
      } else {
        throw new Error('Failed to load companies: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
      set({ isLoading: false });
      return [];
    }
  },

  addCompany: async (companyData) => {
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          company: companyData
        })
      });
      const data = await response.json();
      if (response.ok) {
        set({ companies: data.companies });
      }
    } catch (error) {
      console.error('Failed to add company:', error);
      throw error;
    }
  },

  updateCompany: async (id, companyData) => {
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          company: { id, ...companyData }
        })
      });
      const data = await response.json();
      if (response.ok) {
        set({ companies: data.companies });
      }
    } catch (error) {
      console.error('Failed to update company:', error);
      throw error;
    }
  },

  deleteCompany: async (id) => {
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          company: { id }
        })
      });
      const data = await response.json();
      if (response.ok) {
        set({ companies: data.companies });
      }
    } catch (error) {
      console.error('Failed to delete company:', error);
      throw error;
    }
  },
})); 