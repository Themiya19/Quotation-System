import { NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs/promises';
import path from 'path';

interface User {
  email: string;
  passwordHash: string;
  type: string;
  company?: string;
}

const USER_FILE_PATH = path.join(process.cwd(), 'data', 'user_accounts.txt');

export async function POST(req: Request) {
  try {
    const { email, password, type, company } = await req.json();

    // Validate input
    if (!email || !password || !type) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (type === 'external' && !company) {
      return NextResponse.json(
        { message: 'Company is required for external users' },
        { status: 400 }
      );
    }

    // Read existing users
    let users: User[] = [];
    try {
      const fileContent = await fs.readFile(USER_FILE_PATH, 'utf-8');
      users = fileContent.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [email, passwordHash, type, company] = line.split(',');
          return { email, passwordHash, type, company };
        });
    } catch {
      // If file doesn't exist, create it with header
      await fs.writeFile(USER_FILE_PATH, 'email,password_hash,type,company\n');
    }

    // Check if user already exists
    if (users.some(user => user.email === email)) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Add new user
    const newUserLine = `${email},${hashedPassword},${type},${company || ''}\n`;
    await fs.appendFile(USER_FILE_PATH, newUserLine);

    return NextResponse.json(
      { message: 'User registered successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 