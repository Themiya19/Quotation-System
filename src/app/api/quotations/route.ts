import { NextResponse } from 'next/server';
import pool from '@/lib/prisma';
import { type Quotation } from '@/types/quotation';
import { cookies } from 'next/headers';

// Helper function to generate quotation number
function generateQuotationId(quotations: Quotation[]): string {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  const todayQuotations = quotations.filter(q => q.quotationNo.startsWith(dateStr));
  let sequence = 1;
  if (todayQuotations.length > 0) {
    const maxSequence = Math.max(...todayQuotations.map(q => {
      const match = q.quotationNo.match(/Q(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    }));
    sequence = maxSequence + 1;
  }
  return `${dateStr}Q${sequence}`;
}

// GET /api/quotations
export async function GET() {
  const [rows] = await pool.query('SELECT * FROM Quotation');
  for (const quotation of rows as Quotation[]) {
    // Fetch action history from ActionHistory table
    const [actions] = await pool.query('SELECT action, createdAt FROM ActionHistory WHERE quotationId = ? ORDER BY createdAt ASC', [quotation.id]);
    quotation.actionHistory = (actions as { action: string }[]).map((a) => a.action);
  }
  return NextResponse.json(rows);
}

// POST /api/quotations
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('userEmail')?.value ?? '';
    const userType = cookieStore.get('internalType')?.value ?? '';
    const userDepartment = cookieStore.get('department')?.value ?? '';
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Fetch all quotations for ID generation
    const [quotations] = await pool.query('SELECT * FROM Quotation');
    const quotationNo = data.quotationNo || generateQuotationId(quotations as Quotation[]);
    // Insert new quotation
    const quotationId = `QT${Date.now()}`;
    await pool.query(
      `INSERT INTO Quotation (
        id, quotationNo, date, company, myCompany, project, title, amount, pdfUrl, annexureUrl, toAddress, attn, currency, emailTo, emailCC, salesperson, customerReferences, paymentTerms, dueDate, discountType, discountValue, taxRate, poNo, poFileUrl, internalStatus, externalStatus, createdBy, createdByRole, createdByDepartment, creatorType, forDepartment, status, isRequested, clientApprovalDate, poNumber, poFile, requestId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quotationId,
        quotationNo,
        new Date().toISOString().split('T')[0],
        data.company,
        data.myCompany || null,
        data.project,
        data.title,
        data.amount,
        data.pdfUrl || '',
        data.annexureUrl || null,
        data.toAddress,
        data.attn,
        data.currency,
        Array.isArray(data.emailTo) ? data.emailTo.join(',') : data.emailTo,
        Array.isArray(data.emailCC) ? data.emailCC.join(',') : data.emailCC || null,
        data.salesperson || null,
        data.customerReferences || null,
        data.paymentTerms || null,
        data.dueDate || null,
        data.discountType,
        data.discountValue,
        data.taxRate,
        data.poNo || null,
        data.poFileUrl || null,
        'pending',
        'pending',
        userEmail,
        userType || null,
        userDepartment || null,
        userType || null,
        data.forDepartment || null,
        data.status || null,
        data.isRequested || null,
        data.clientApprovalDate || null,
        data.poNumber || null,
        data.poFile || null,
        data.requestId || null
      ]
    );
    // Always insert the initial action into ActionHistory
    const initialAction = `Created by ${userEmail} on ${new Date().toISOString().split('T')[0]}`;
    await pool.query(
      'INSERT INTO ActionHistory (quotationId, action) VALUES (?, ?)',
      [quotationId, initialAction]
    );
    // Insert Quotation Items
    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        try {
          await pool.query(
            "INSERT INTO QuotationItem (quotationId, `system`, description, unit, qty, amount) VALUES (?, ?, ?, ?, ?, ?)",
            [
              quotationId,
              item.system || null,
              item.description || null,
              item.unit || null,
              item.qty || null,
              item.amount || null
            ]
          );
        } catch (err) {
          console.error('Error inserting QuotationItem:', err, item);
        }
      }
    }
    // Insert Quotation Terms
    if (Array.isArray(data.terms)) {
      for (const term of data.terms) {
        try {
          await pool.query(
            "INSERT INTO Term (quotationId, content) VALUES (?, ?)",
            [
              quotationId,
              term.content || null
            ]
          );
        } catch (err) {
          console.error('Error inserting Term:', err, term);
        }
      }
    }
    return NextResponse.json({ success: true, id: quotationId, quotationNo });
  } catch (error) {
    console.error('Error creating quotation:', error);
    return NextResponse.json({ error: 'Failed to create quotation' }, { status: 500 });
  }
}

// PATCH /api/quotations
export async function PATCH(request: Request) {
  const { id, updates } = await request.json();
  // Fetch the current quotation from the database
  const [rows] = await pool.query('SELECT * FROM Quotation WHERE id = ?', [id]);
  const currentQuotation = (rows as Quotation[])[0];
  if (!currentQuotation) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
  }
  // Remove items and terms from updates
  const { items, terms, actionHistory, ...quotationUpdates } = updates;
  // Remove non-column properties
  delete quotationUpdates.success;
  // Update the quotation in the database (do not update actionHistory)
  await pool.query(
    'UPDATE Quotation SET ? WHERE id = ?',
    [quotationUpdates, id]
  );
  // Insert new action into ActionHistory if provided
  if (actionHistory && Array.isArray(actionHistory) && actionHistory.length > 0) {
    // Only insert the last action (the new one)
    const lastAction = actionHistory[actionHistory.length - 1];
    await pool.query(
      'INSERT INTO ActionHistory (quotationId, action) VALUES (?, ?)',
      [id, lastAction]
    );
  }
  // Update QuotationItem table
  if (Array.isArray(items)) {
    // Delete old items
    await pool.query('DELETE FROM QuotationItem WHERE quotationId = ?', [id]);
    // Insert new items
    for (const item of items) {
      await pool.query(
        "INSERT INTO QuotationItem (quotationId, `system`, description, unit, qty, amount) VALUES (?, ?, ?, ?, ?, ?)",
        [
          id,
          item.system || null,
          item.description || null,
          item.unit || null,
          item.qty || null,
          item.amount || null
        ]
      );
    }
  }
  // Update Term table
  if (Array.isArray(terms)) {
    // Delete old terms
    await pool.query('DELETE FROM Term WHERE quotationId = ?', [id]);
    // Insert new terms
    for (const term of terms) {
      await pool.query(
        "INSERT INTO Term (quotationId, content) VALUES (?, ?)",
        [
          id,
          term.content || null
        ]
      );
    }
  }
  // Fetch updated quotation and its action history
  const [updatedRows] = await pool.query('SELECT * FROM Quotation WHERE id = ?', [id]);
  const updatedQuotation = (updatedRows as Quotation[])[0];
  if (updatedQuotation) {
    const [actions] = await pool.query('SELECT action, createdAt FROM ActionHistory WHERE quotationId = ? ORDER BY createdAt ASC', [id]);
    updatedQuotation.actionHistory = (actions as { action: string }[]).map((a) => a.action);
  }
  return NextResponse.json(updatedQuotation);
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get('internalType')?.value;
    console.log('User role:', userRole);

    if (!userRole || userRole !== 'admin') {
      console.log('Unauthorized: Not admin');
      return NextResponse.json(
        { error: `Unauthorized: Insufficient permissions to delete quotations. Role: ${userRole}` },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log('Request body:', body);

    const { id } = body;
    if (!id) {
      console.log('No ID provided');
      return NextResponse.json({ error: 'No ID provided' }, { status: 400 });
    }

    // Delete related QuotationItem and Term rows first
    await pool.query('DELETE FROM QuotationItem WHERE quotationId = ?', [id]);
    await pool.query('DELETE FROM Term WHERE quotationId = ?', [id]);
    // Now delete the Quotation
    // const [result] = await pool.query('DELETE FROM Quotation WHERE id = ?', [id]);
    // console.log('Delete result:', result);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete quotation', 
        details: error instanceof Error ? error.message : String(error) 
      }, 
      { status: 500 }
    );
  }
}