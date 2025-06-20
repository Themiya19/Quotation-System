// import { NextResponse } from 'next/server';
// import * as fs from 'fs/promises';
// import path from 'path';

// const USER_FILE_PATH = path.join(process.cwd(), 'data', 'user_accounts.json');

// export async function GET() {
//   try {
//     // Read users from JSON file
//     const usersData = await fs.readFile(USER_FILE_PATH, 'utf-8');
//     const users = JSON.parse(usersData);

//     // Return users without passwords
//     const safeUsers = users.map((user: any) => ({
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
//     }));

//     return NextResponse.json({ users: safeUsers });
//   } catch (error) {
//     console.error('Failed to get users:', error);
//     return NextResponse.json(
//       { message: 'Failed to get users' },
//       { status: 500 }
//     );
//   }
// }


import { NextResponse } from 'next/server';
import pool from '@/lib/prisma'; // mysql2 pool
import type { RowDataPacket } from 'mysql2';

// Define the type for a user row returned from the database
interface UserRow {
  email: string;
  name: string;
  type: string;
  phoneNumber: string | null;
  internalType?: string | null;
  department?: string | null;
  company?: string | null;
  externalType?: string | null;
}

export async function GET() {
  const connection = await pool.getConnection();
  try {
    // Fetch all users (excluding passwords)
    const [users] = await connection.query<RowDataPacket[]>(
      'SELECT email, name, phoneNumber, type, internalType, department, company, externalType FROM User'
    );

    const safeUsers = Array.isArray(users) ? users.map((user) => {
      const u = user as UserRow;
      return {
        email: u.email,
        name: u.name,
        type: u.type,
        phoneNumber: u.phoneNumber,
        ...(u.type === 'internal'
          ? {
              internalType: u.internalType,
              department: u.department,
            }
          : {
              company: u.company,
              externalType: u.externalType,
            }),
      };
    }) : [];

    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error('Failed to get users:', error);
    return NextResponse.json(
      { message: 'Failed to get users' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}