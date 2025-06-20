// import { NextResponse } from 'next/server';
// import * as fs from 'fs/promises';
// import path from 'path';
// import bcrypt from 'bcryptjs';

// const USER_FILE_PATH = path.join(process.cwd(), 'data', 'user_accounts.json');

// export async function POST(req: Request) {
//   try {
//     const { email, password } = await req.json();

//     // Read users from JSON file
//     const usersData = await fs.readFile(USER_FILE_PATH, 'utf-8');
//     const users = JSON.parse(usersData);

//     // Find user by email
//     const user = users.find((u: any) => u.email === email);

//     if (!user) {
//       return NextResponse.json(
//         { message: 'Invalid email or password' },
//         { status: 401 }
//       );
//     }

//     // Verify password
//     const isValidPassword = await bcrypt.compare(password, user.password);

//     if (!isValidPassword) {
//       return NextResponse.json(
//         { message: 'Invalid email or password' },
//         { status: 401 }
//       );
//     }

//     // Return user data without password
//     const userData = {
//       email: user.email,
//       type: user.type,
//       ...(user.type === 'internal' ? 
//           { 
//             internalType: user.internalType,
//             department: user.department
//           } : 
//           { 
//             company: user.company,
//             externalType: user.externalType ? 
//               (user.externalType.startsWith('ext_') ? user.externalType : `ext_${user.externalType}`) : 
//               'ext_client'
//           })
//     };

//     return NextResponse.json(userData);
//   } catch (error) {
//     console.error('Login failed:', error);
//     return NextResponse.json(
//       { message: 'Login failed' },
//       { status: 500 }
//     );
//   }
// } 



import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/prisma'; // mysql2 pool
import type { RowDataPacket } from 'mysql2';

export async function POST(req: Request) {
  const connection = await pool.getConnection();
  try {
    const { email, password } = await req.json();

    // Find user by email
    const [users] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM User WHERE email = ? LIMIT 1',
      [email]
    );
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }
    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Return user data without password
    const userData = {
      email: user.email,
      type: user.type,
      ...(user.type === 'internal'
        ? {
            internalType: user.internalType,
            department: user.department,
          }
        : {
            company: user.company,
            externalType: user.externalType
              ? (user.externalType.startsWith('ext_') ? user.externalType : `ext_${user.externalType}`)
              : 'ext_client',
          }),
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Login failed:', error);
    return NextResponse.json(
      { message: 'Login failed' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}