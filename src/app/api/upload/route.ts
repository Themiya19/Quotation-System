import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
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

    const fileName = `${quotationNo}-Annexure.pdf`;
    const uploadDir = path.join(process.cwd(), 'public', 'annexures');
    const filePath = path.join(uploadDir, fileName);

    // Ensure upload directory exists
    await mkdir(uploadDir, { recursive: true });

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the public URL
    const publicUrl = `/annexures/${fileName}`;
    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 