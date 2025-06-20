import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const quotationId = formData.get('quotationId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Get original file extension
    const fileExt = path.extname(file.name);
    
    // Create a unique file name with timestamp
    const timestamp = new Date().getTime();
    const fileName = `PO-${quotationId}-${timestamp}${fileExt}`;
    
    // Create the directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'po-files');
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the API URL
    const fileUrl = `/api/po-files/${fileName}`;
    return NextResponse.json({ fileUrl });
  } catch (error) {
    console.error('Error uploading PO file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 