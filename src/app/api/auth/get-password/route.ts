import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';

const USER_ACCOUNTS_FILE = path.join(process.cwd(), 'data/user_accounts.json');

// Define the type for a user object
interface User {
  email: string;
  password: string;
  name?: string;
  type?: string;
  internalType?: string;
  externalType?: string;
  company?: string;
  department?: string;
  phoneNumber?: string;
}

export async function POST(req: Request) {
  try {
    // Check if user is admin
    const cookieStore = await cookies();
    const userType = cookieStore.get('internalType')?.value;
    
    if (userType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Only administrators can view passwords' },
        { status: 401 }
      );
    }

    // Get email from request body
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Read user accounts file
    const data = await fs.readFile(USER_ACCOUNTS_FILE, 'utf-8');
    const users = JSON.parse(data);

    // Find user
    const user = (users as User[]).find((u) => u.email === email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return the hashed password
    return NextResponse.json({ password: user.password });
  } catch (error) {
    console.error('Error getting password:', error);
    return NextResponse.json(
      { error: 'Failed to get password' },
      { status: 500 }
    );
  }
} 