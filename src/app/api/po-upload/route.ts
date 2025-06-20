import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const quotationNo = formData.get('quotationNo') as string;

    if (!file || !quotationNo) {
      return NextResponse.json(
        { error: 'File and quotation number are required' },
        { status: 400 }
      );
    }

    // Create the directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'po-files');
    await mkdir(uploadDir, { recursive: true });

    // Format the file name: (quotationNo)-PO.pdf
    const fileName = `${quotationNo}-PO.pdf`;
    const filePath = path.join(uploadDir, fileName);

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the public URL
    const fileUrl = `/po-files/${fileName}`;
    return NextResponse.json({ fileUrl });
  } catch (error) {
    console.error('Error uploading PO file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 