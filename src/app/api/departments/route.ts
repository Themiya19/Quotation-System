import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// GET /api/departments
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'departments.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const departments = JSON.parse(data);
    
    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error reading departments:', error);
    return NextResponse.json({ error: 'Failed to load departments' }, { status: 500 });
  }
} 