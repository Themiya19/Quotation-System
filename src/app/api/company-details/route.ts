import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Path to the company_details.json file
const companyDetailsPath = path.join(process.cwd(), 'data', 'company_details.json');

// Define the type for a company object
interface Company {
  id?: string;
  name: string;
  shortName?: string;
  address: string;
  phoneNumber: string;
  logoUrl?: string;
  updatedAt?: string;
}

// Get companies from the JSON file
async function getCompanies() {
  try {
    const fileContents = await fs.readFile(companyDetailsPath, 'utf8');
    const data = JSON.parse(fileContents);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error reading company details file:', error);
    // Return empty array if file doesn't exist or has errors
    return [];
  }
}

// Save companies to the JSON file
async function saveCompanies(companies: Company[]) {
  try {
    // Ensure the data directory exists
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    
    // Add IDs and timestamps if not provided
    const updatedCompanies = companies.map(company => ({
      id: company.id || Date.now().toString(),
      name: company.name,
      shortName: company.shortName || undefined,
      address: company.address,
      phoneNumber: company.phoneNumber,
      logoUrl: company.logoUrl || "",
      updatedAt: company.updatedAt || new Date().toISOString()
    }));
    
    await fs.writeFile(
      companyDetailsPath,
      JSON.stringify(updatedCompanies, null, 2),
      'utf8'
    );
    
    return updatedCompanies;
  } catch (error) {
    console.error('Error saving companies:', error);
    throw error;
  }
}

// GET handler to retrieve companies
export async function GET() {
  try {
    const companies = await getCompanies();
    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error retrieving companies:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve companies' },
      { status: 500 }
    );
  }
}

// POST handler to save companies
export async function POST(request: Request) {
  try {
    const companiesData = await request.json();
    
    // Make sure we're handling an array
    if (!Array.isArray(companiesData)) {
      return NextResponse.json(
        { error: 'Companies data must be an array' },
        { status: 400 }
      );
    }
    
    // Validate required fields for each company
    for (const company of companiesData) {
      if (!company.name || !company.address || !company.phoneNumber) {
        return NextResponse.json(
          { error: 'Name, address, and phone number are required for each company' },
          { status: 400 }
        );
      }
    }
    
    const savedCompanies = await saveCompanies(companiesData);
    return NextResponse.json(savedCompanies);
  } catch (error) {
    console.error('Error saving companies:', error);
    return NextResponse.json(
      { error: 'Failed to save companies' },
      { status: 500 }
    );
  }
} 