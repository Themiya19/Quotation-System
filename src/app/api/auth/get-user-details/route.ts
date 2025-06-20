// import { NextResponse } from 'next/server';
// import * as fs from 'fs/promises';
// import path from 'path';

// const USER_FILE_PATH = path.join(process.cwd(), 'data', 'user_accounts.json');

// export async function POST(req: Request) {
//   try {
//     const { email } = await req.json();
    
//     if (!email) {
//       return NextResponse.json(
//         { error: 'Email is required' },
//         { status: 400 }
//       );
//     }

//     // Read users from JSON file
//     const usersData = await fs.readFile(USER_FILE_PATH, 'utf-8');
//     const users = JSON.parse(usersData);

//     // Find user by email
//     const user = users.find((u: any) => u.email === email);

//     if (!user) {
//       return NextResponse.json(
//         { error: 'User not found' },
//         { status: 404 }
//       );
//     }

//     // Return user data without password
//     const userData = {
//       email: user.email,
//       type: user.type,
//       ...(user.type === 'internal' ? 
//           { 
//             internalType: user.internalType,
//             department: user.department || '' 
//           } : 
//           { company: user.company })
//     };

//     return NextResponse.json(userData);
//   } catch (error) {
//     console.error('Failed to get user details:', error);
//     return NextResponse.json(
//       { error: 'Failed to get user details' },
//       { status: 500 }
//     );
//   }
// } 


import { NextResponse } from 'next/server';
import pool from '@/lib/prisma'; // mysql2 pool
import type { RowDataPacket } from 'mysql2';

export async function POST(req: Request) {
  const connection = await pool.getConnection();
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Fetch user by email
    const [users] = await connection.query<RowDataPacket[]>(
      'SELECT email, name, phoneNumber, type, internalType, department, company, externalType FROM User WHERE email = ? LIMIT 1',
      [email]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Return user data without password
    const userData = {
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      type: user.type,
      ...(user.type === 'internal'
        ? {
            internalType: user.internalType,
            department: user.department || '',
          }
        : {
            company: user.company,
            externalType: user.externalType,
          }),
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Failed to get user details:', error);
    return NextResponse.json(
      { error: 'Failed to get user details' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}