// import { NextResponse } from 'next/server';
// import prisma from '@/lib/prisma';
// import { promises as fs } from 'fs';
// import path from 'path';
// import { type Quotation } from '@/types/quotation';

// const QUOTATIONS_FILE = path.join(process.cwd(), 'data/quotations.json');
// const USER_FILE_PATH = path.join(process.cwd(), 'data', 'user_accounts.json');

// // Helper function to read quotations
// async function readQuotations(): Promise<{ quotations: Quotation[] }> {
//   try {
//     const data = await fs.readFile(QUOTATIONS_FILE, 'utf-8');
//     return JSON.parse(data);
//   } catch (error) {
//     return { quotations: [] };
//   }
// }

// // Helper function to read users
// async function readUsers(): Promise<any[]> {
//   try {
//     const data = await fs.readFile(USER_FILE_PATH, 'utf-8');
//     return JSON.parse(data);
//   } catch (error) {
//     return [];
//   }
// }

// interface RouteParams {
//   params: { id: string }
// }

// export async function GET(request: Request, { params }: RouteParams) {
//   // Ensure params is awaited if it's a Promise
//   const resolvedParams = params instanceof Promise ? await params : params;
//   const id = resolvedParams.id;
  
//   try {
//     // Read quotations
//     const { quotations } = await readQuotations();
    
//     // Find the quotation
//     const quotation = quotations.find(q => q.id === id);
//     if (!quotation) {
//       return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
//     }
    
//     // If the quotation doesn't have department info but has creator email,
//     // try to get it from the user accounts
//     if (!quotation.createdByDepartment && quotation.createdBy) {
//       const users = await readUsers();
//       const creator = users.find((user: any) => user.email === quotation.createdBy);
      
//       if (creator && creator.type === 'internal' && creator.department) {
//         quotation.createdByDepartment = creator.department;
//       }
//     }
    
//     return NextResponse.json(quotation);
//   } catch (error) {
//     console.error('Error fetching quotation:', error);
//     return NextResponse.json({ error: 'Failed to fetch quotation' }, { status: 500 });
//   }
// } 

// ---------------------------------------------------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import pool from '@/lib/prisma';

// Define the type for a quotation row returned from the database
interface Quotation {
  id: string;
  quotationNo: string;
  date: string;
  company: string;
  myCompany?: string | null;
  project: string;
  title: string;
  amount: number;
  pdfUrl: string;
  annexureUrl?: string | null;
  toAddress: string;
  attn: string;
  currency: string;
  emailTo: string;
  emailCC?: string | null;
  salesperson?: string | null;
  customerReferences?: string | null;
  paymentTerms?: string | null;
  dueDate?: string | null;
  discountType: string;
  discountValue: string;
  taxRate: string;
  poNo?: string | null;
  poFileUrl?: string | null;
  internalStatus: string;
  externalStatus: string;
  createdBy?: string | null;
  createdByRole?: string | null;
  createdByDepartment?: string | null;
  creatorType?: string | null;
  forDepartment?: string | null;
  status?: string | null;
  isRequested?: boolean | null;
  clientApprovalDate?: string | null;
  poNumber?: string | null;
  poFile?: string | null;
  requestId?: string | null;
  items?: QuotationItem[];
  terms?: Term[];
  actionHistories?: ActionHistory[];
  actionHistory?: string[];
}

interface QuotationItem {
  id: number;
  quotationId: string;
  system?: string | null;
  description?: string | null;
  unit?: string | null;
  qty?: string | null;
  amount?: string | null;
}

interface Term {
  id: number;
  quotationId: string;
  content: string;
}

interface ActionHistory {
  id: number;
  quotationId: string;
  action: string;
  createdAt: string; // DateTime as string
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Ensure params is awaited (Next.js 15 requirement)
  const { id } = await params;

  try {
    // Fetch the quotation
    const [quotationRows] = await pool.query('SELECT * FROM Quotation WHERE id = ?', [id]);
    const quotation = (quotationRows as Quotation[])[0];
    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }
    // Fetch action history from ActionHistory table
    const [actions] = await pool.query('SELECT action, createdAt FROM ActionHistory WHERE quotationId = ? ORDER BY createdAt ASC', [id]);
    quotation.actionHistory = (actions as { action: string }[]).map((a) => a.action);
    // Fetch related items
    const [itemRows] = await pool.query('SELECT * FROM QuotationItem WHERE quotationId = ?', [id]);
    quotation.items = itemRows as QuotationItem[];
    // Fetch terms from the Term table
    const [termRows] = await pool.query('SELECT * FROM Term WHERE quotationId = ?', [id]);
    quotation.terms = termRows as Term[];
    return NextResponse.json(quotation);
  } catch (error) {
    console.error('Error fetching quotation:', error);
    return NextResponse.json({ error: 'Failed to fetch quotation' }, { status: 500 });
  }
}