import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Path to the company_details.json file
const companyDetailsPath = path.join(process.cwd(), 'data', 'company_details.json');

// Get company by ID
async function getCompanyById(id: string) {
  try {
    const fileContents = await fs.readFile(companyDetailsPath, 'utf8');
    const companies = JSON.parse(fileContents);
    
    if (!Array.isArray(companies)) {
      return null;
    }
    
    const company = companies.find((c) => c.id === id);
    return company || null;
  } catch (error) {
    console.error('Error reading company details file:', error);
    return null;
  }
}

// GET handler to retrieve a specific company by ID
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }
    
    const company = await getCompanyById(id);
    
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(company);
  } catch (error) {
    console.error('Error retrieving company:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve company' },
      { status: 500 }
    );
  }
} 