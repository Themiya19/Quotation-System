// import { NextRequest, NextResponse } from 'next/server';
// import * as fs from 'fs/promises';
// import path from 'path';

// const USER_FILE_PATH = path.join(process.cwd(), 'data', 'user_accounts.json');

// interface RouteParams {
//   params: Promise<{ email: string }> | { email: string }
// }

// export async function GET(
//   request: NextRequest,
//   context: RouteParams
// ) {
//   try {
//     const params = await context.params;
//     const decodedEmail = decodeURIComponent(params.email);

//     // Read users from JSON file
//     const usersData = await fs.readFile(USER_FILE_PATH, 'utf-8');
//     const users = JSON.parse(usersData);

//     // Find user by email
//     const user = users.find((u: any) => u.email === decodedEmail);

//     if (!user) {
//       return NextResponse.json(
//         { message: 'User not found' },
//         { status: 404 }
//       );
//     }

//     // Return user data without password
//     const userData = {
//       email: user.email,
//       name: user.name,
//       phoneNumber: user.phoneNumber,
//       type: user.type,
//       ...(user.type === 'internal' ?
//         {
//           internalType: user.internalType,
//           department: user.department
//         } :
//         {
//           company: user.company,
//           externalType: user.externalType
//         })
//     };

//     return NextResponse.json(userData);
//   } catch (error) {
//     console.error('Failed to get user:', error);
//     return NextResponse.json(
//       { message: 'Failed to get user' },
//       { status: 500 }
//     );
//   }
// }



import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/prisma'; // mysql2 pool
import type { RowDataPacket } from 'mysql2';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const { email } = await params;

  const connection = await pool.getConnection();
  try {
    // Fetch user by email
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT email, name, phoneNumber, type, internalType, department, company, externalType FROM User WHERE email = ? LIMIT 1',
      [email]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Return user data (without password)
    const user = rows[0];
    return NextResponse.json({
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      type: user.type,
      ...(user.type === 'internal'
        ? {
            internalType: user.internalType,
            department: user.department,
          }
        : {
            company: user.company,
            externalType: user.externalType,
          }),
    });
  } catch (error) {
    console.error('Failed to get user:', error);
    return NextResponse.json(
      { message: 'Failed to get user' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}