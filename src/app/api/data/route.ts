import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filePath = url.searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }
    
    // Ensure we're only accessing files in the data directory
    if (!filePath.startsWith('data/')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }
    
    const fullPath = path.join(process.cwd(), filePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Read file contents
    const fileContent = await fs.promises.readFile(fullPath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error accessing file:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 