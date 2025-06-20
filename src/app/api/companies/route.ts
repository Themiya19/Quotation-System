import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface Company {
  id: string;
  name: string;
  currency: string;
  emailTo: string[] | string;
  emailCC?: string[] | string;
  terms: { id: number; content: string }[];
  address?: string;
  attention?: string;
}

const DB_PATH = path.join(process.cwd(), 'data');
const COMPANIES_FILE = path.join(DB_PATH, 'companies.json');

// Get all companies
async function getCompanies(): Promise<Company[]> {
  try {
    await ensureDbExists();
    const content = await fs.readFile(COMPANIES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

// Save companies
async function saveCompanies(companies: Company[]) {
  await ensureDbExists();
  await fs.writeFile(COMPANIES_FILE, JSON.stringify(companies, null, 2));
}

// Ensure the database directory and file exist
async function ensureDbExists() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(DB_PATH, { recursive: true });
  }

  try {
    await fs.access(COMPANIES_FILE);
  } catch {
    await fs.writeFile(COMPANIES_FILE, '[]');
  }
}

export async function GET() {
  try {
    const companies = await getCompanies();
    return NextResponse.json({ companies });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, company } = await request.json();
    
    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const companies = await getCompanies();

    switch (action) {
      case 'add':
        if (!company) {
          return NextResponse.json({ error: 'Company data is required' }, { status: 400 });
        }
        const newCompany: Company = {
          ...company,
          id: Date.now().toString()
        };
        companies.push(newCompany);
        break;

      case 'update':
        if (!company || !company.id) {
          return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
        }
        const index = companies.findIndex((c: Company) => c.id === company.id);
        if (index > -1) {
          companies[index] = company;
        }
        break;

      case 'delete':
        if (!company || !company.id) {
          return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
        }
        const filteredCompanies = companies.filter((c: Company) => c.id !== company.id);
        await saveCompanies(filteredCompanies);
        return NextResponse.json({ companies: filteredCompanies });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await saveCompanies(companies);
    return NextResponse.json({ companies });
  } catch {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
} 