import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const companyId = formData.get('companyId') as string | null;

    if (!file || !type || !companyId) {
      return NextResponse.json(
        { error: 'File, type, and companyId are required' },
        { status: 400 }
      );
    }

    // Create the directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'company-logos');
    await mkdir(uploadDir, { recursive: true });

    // Use companyId for the filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `company-${companyId}.${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Convert File to Buffer and save (overwrite if exists)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the public URL
    const fileUrl = `/company-logos/${fileName}`;
    return NextResponse.json({ fileUrl });
  } catch (error) {
    console.error('Error uploading company logo:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 