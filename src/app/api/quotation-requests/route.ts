import { NextResponse } from 'next/server';
import pool from '@/lib/prisma';
import { toMySQLDateTime } from '@/lib/utils';

function getTodayIdPrefix() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  return `RQ${dateStr}-`;
}

// Define the type for a quotation request row returned from the database
interface QuotationRequest {
  id: string;
  customerName: string;
  project: string;
  title: string;
  description: string;
  company: string;
  date: string;
  status: string;
  userEmail: string;
  actionHistory?: string[];
}

// Define the type for the count row returned from the database
// type CountRow = { count: number };

export async function GET() {
  try {
    // Fetch all quotation requests
    const [requests] = await pool.query('SELECT * FROM quotationRequest ORDER BY date DESC');
    // For each request, fetch its action histories
    for (const req of requests as QuotationRequest[]) {
      const [actions] = await pool.query('SELECT action FROM quotationRequestActionHistory WHERE quotationRequestId = ? ORDER BY createdAt ASC', [req.id]);
      req.actionHistory = (actions as { action: string }[]).map((a) => a.action);
    }
    // Map to match old API shape (actionHistory as string[])
    const result = (requests as QuotationRequest[]).map((r) => ({
      id: r.id,
      customerName: r.customerName,
      project: r.project,
      title: r.title,
      description: r.description,
      company: r.company,
      date: r.date,
      status: r.status,
      userEmail: r.userEmail,
      actionHistory: r.actionHistory,
    }));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching quotation requests:', error);
    return NextResponse.json({ error: 'Failed to fetch quotation requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // Generate new ID in format RQYYYYMMDD-n (find max n, not just count)
    const todayPrefix = getTodayIdPrefix();
    const [rows] = await pool.query(
      "SELECT id FROM quotationRequest WHERE id LIKE ? ORDER BY CAST(SUBSTRING_INDEX(id, '-', -1) AS UNSIGNED) DESC LIMIT 1",
      [`${todayPrefix}%`]
    );
    let nextNumber = 1;
    if (Array.isArray(rows) && rows.length > 0) {
      // Extract the last number from the ID, e.g., RQ20250703-9 => 9
      const lastId = (rows as { id: string }[])[0].id;
      const match = lastId.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const newId = `${todayPrefix}${nextNumber}`;
    // Add user email to action history if provided
    if (data.userEmail && data.actionHistory && data.actionHistory.length > 0) {
      const firstAction = data.actionHistory[0];
      if (firstAction.includes('Requested by')) {
        // Replace the date part with date and time
        const now = new Date();
        data.actionHistory[0] = `Requested by ${data.customerName} (${data.userEmail}) on ${now.toLocaleString()}`;
      }
    }
    // Ensure date is in MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
    let mysqlDate = data.date;
    if (data.date) {
      mysqlDate = toMySQLDateTime(data.date);
    }
    // Insert the request
    await pool.query(
      'INSERT INTO quotationRequest (id, customerName, project, title, description, company, date, status, userEmail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        newId,
        data.customerName,
        data.project,
        data.title,
        data.description,
        data.company,
        mysqlDate,
        data.status,
        data.userEmail,
      ]
    );
    // Insert action histories
    if (Array.isArray(data.actionHistory)) {
      for (const action of data.actionHistory) {
        await pool.query(
          'INSERT INTO quotationRequestActionHistory (quotationRequestId, action) VALUES (?, ?)',
          [newId, action]
        );
      }
    }
    // Fetch the created request and its action histories
    const [createdRows] = await pool.query('SELECT * FROM quotationRequest WHERE id = ?', [newId]);
    const created = (createdRows as QuotationRequest[])[0];
    const [actions] = await pool.query('SELECT action FROM quotationRequestActionHistory WHERE quotationRequestId = ? ORDER BY createdAt ASC', [newId]);
    // Return in old API shape
    return NextResponse.json({
      id: created.id,
      customerName: created.customerName,
      project: created.project,
      title: created.title,
      description: created.description,
      company: created.company,
      date: created.date,
      status: created.status,
      userEmail: created.userEmail,
      actionHistory: (actions as { action: string }[]).map((a) => a.action),
    });
  } catch (error) {
    console.error('Error saving quotation request:', error);
    return NextResponse.json({ error: 'Failed to save quotation request' }, { status: 500 });
  }
} 