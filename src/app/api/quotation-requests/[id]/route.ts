import { NextResponse } from 'next/server';
import pool from '@/lib/prisma';
import { toMySQLDateTime } from '@/lib/utils';

// Define the type for a quotation request row
interface QuotationRequestRow {
  id: string;
  customerName: string;
  project: string;
  title: string;
  description: string;
  company: string;
  date: string;
  status: string;
  userEmail: string;
}

// Define the type for an action row
interface ActionRow {
  action: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Fetch the quotation request
    const [reqRows] = await pool.query('SELECT * FROM quotationRequest WHERE id = ?', [id]);
    const req = (reqRows as QuotationRequestRow[])[0];
    if (!req) {
      return NextResponse.json({ error: 'Quotation request not found' }, { status: 404 });
    }
    // Fetch action histories
    const [actions] = await pool.query('SELECT action FROM quotationRequestActionHistory WHERE quotationRequestId = ? ORDER BY createdAt ASC', [id]);
    return NextResponse.json({
      id: req.id,
      customerName: req.customerName,
      project: req.project,
      title: req.title,
      description: req.description,
      company: req.company,
      date: req.date,
      status: req.status,
      userEmail: req.userEmail,
      actionHistory: (actions as ActionRow[]).map((a) => a.action),
    });
  } catch (error) {
    console.error('Error getting quotation request:', error);
    return NextResponse.json({ error: 'Failed to get quotation request' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    // Update main fields (except actionHistory)
    const { actionHistory, ...fields } = body;
    // Format date if present
    if (fields.date) {
      fields.date = toMySQLDateTime(fields.date);
    }
    // Build SET clause and values for update
    const setClause = Object.keys(fields).map(key => `${key} = ?`).join(', ');
    const values = Object.values(fields);
    if (setClause) {
      await pool.query(`UPDATE quotationRequest SET ${setClause} WHERE id = ?`, [...values, id]);
    }
    // If actionHistory is provided, append new actions
    if (Array.isArray(actionHistory) && actionHistory.length > 0) {
      for (const action of actionHistory) {
        await pool.query(
          'INSERT INTO quotationRequestActionHistory (quotationRequestId, action) VALUES (?, ?)',
          [id, action]
        );
      }
    }
    // Fetch updated request and its action histories
    const [reqRows] = await pool.query('SELECT * FROM quotationRequest WHERE id = ?', [id]);
    const req = (reqRows as QuotationRequestRow[])[0];
    const [actions] = await pool.query('SELECT action FROM quotationRequestActionHistory WHERE quotationRequestId = ? ORDER BY createdAt ASC', [id]);
    return NextResponse.json({
      id: req.id,
      customerName: req.customerName,
      project: req.project,
      title: req.title,
      description: req.description,
      company: req.company,
      date: req.date,
      status: req.status,
      userEmail: req.userEmail,
      actionHistory: (actions as ActionRow[]).map((a) => a.action),
    });
  } catch (error) {
    console.error('Error updating quotation request:', error);
    return NextResponse.json({ error: 'Failed to update quotation request' }, { status: 500 });
  }
} 