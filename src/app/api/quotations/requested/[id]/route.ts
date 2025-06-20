import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Define the type for a quotation request
interface QuotationRequest {
  id: string;
  customerName: string;
  project: string;
  title: string;
  description: string;
  company: string;
  date: string;
  status?: string;
  userEmail?: string;
  actionHistory?: string[];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const filePath = path.join(process.cwd(), 'data', 'request_quotation.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const quotations = JSON.parse(fileContents);

    const quotation = (quotations as QuotationRequest[]).find((q) => q.id === id);

    if (!quotation) {
      return NextResponse.json(
        { error: 'Quotation request not found' },
        { status: 404 }
      );
    }

    // Ensure status is set, default to 'pending' if not present
    quotation.status = quotation.status || 'pending';

    return NextResponse.json(quotation);
  } catch (error) {
    console.error('Error reading quotation request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotation request' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const filePath = path.join(process.cwd(), 'data', 'request_quotation.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const quotations = JSON.parse(fileContents);

    const { status, actionHistory } = await request.json();

    // Find and update the quotation request
    const quotationIndex = (quotations as QuotationRequest[]).findIndex((q) => q.id === id);
    if (quotationIndex === -1) {
      return NextResponse.json(
        { error: 'Quotation request not found' },
        { status: 404 }
      );
    }

    // Update the status and action history
    quotations[quotationIndex] = {
      ...quotations[quotationIndex],
      status,
      actionHistory: actionHistory || quotations[quotationIndex].actionHistory
    };

    // Save the updated data
    await fs.writeFile(filePath, JSON.stringify(quotations, null, 2));

    return NextResponse.json(quotations[quotationIndex]);
  } catch (error) {
    console.error('Error updating quotation request:', error);
    return NextResponse.json(
      { error: 'Failed to update quotation request' },
      { status: 500 }
    );
  }
} 