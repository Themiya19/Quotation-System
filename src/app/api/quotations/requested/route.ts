import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // Read the request_quotation.json file
    const filePath = path.join(process.cwd(), 'data', 'request_quotation.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const quotations = JSON.parse(fileContents);

    return NextResponse.json({ quotations });
  } catch (error) {
    console.error('Error reading requested quotations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requested quotations' },
      { status: 500 }
    );
  }
} 