import { NextResponse } from "next/server";
import pool from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [rows] = await pool.query(
      'SELECT id, action, createdAt FROM QuotationRequestActionHistory WHERE quotationRequestId = ? ORDER BY createdAt ASC',
      [id]
    );
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Failed to fetch action history" }, { status: 500 });
  }
} 