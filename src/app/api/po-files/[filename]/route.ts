import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { stat, readFile } from "fs/promises";

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const filePath = join(process.cwd(), "po-files", filename);

  try {
    await stat(filePath); // Check if file exists
    const fileBuffer = await readFile(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=\"${filename}\"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

