// import { NextResponse } from 'next/server';
// import * as fs from 'fs/promises';
// import path from 'path';

// const USER_FILE_PATH = path.join(process.cwd(), 'data', 'user_accounts.json');

// export async function POST(req: Request) {
//   try {
//     const { email } = await req.json();

//     // Read existing users
//     const usersData = await fs.readFile(USER_FILE_PATH, 'utf-8');
//     const users = JSON.parse(usersData);

//     // Filter out the user to delete
//     const updatedUsers = users.filter((user: any) => user.email !== email);

//     // Check if user was found and removed
//     if (updatedUsers.length === users.length) {
//       return NextResponse.json(
//         { message: 'User not found' },
//         { status: 404 }
//       );
//     }

//     // Save updated users array
//     await fs.writeFile(USER_FILE_PATH, JSON.stringify(updatedUsers, null, 2));

//     // Return users list without passwords
//     const safeUsers = updatedUsers.map((user: any) => ({
//       email: user.email,
//       type: user.type,
//       ...(user.type === 'internal' ? 
//           { 
//             internalType: user.internalType,
//             department: user.department
//           } : 
//           { company: user.company })
//     }));

//     return NextResponse.json({ 
//       message: 'User deleted successfully',
//       users: safeUsers
//     });
//   } catch (error) {
//     console.error('Failed to delete user:', error);
//     return NextResponse.json(
//       { message: 'Failed to delete user' },
//       { status: 500 }
//     );
//   }
// } 




import { NextResponse } from 'next/server';
import pool from '@/lib/prisma'; // mysql2 pool
import type { RowDataPacket } from 'mysql2';
import type { ResultSetHeader } from 'mysql2';

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

export async function POST(req: Request) {
  const connection = await pool.getConnection();
  try {
    const { email } = await req.json();

    // Delete the user
    const [result] = await connection.query(
      'DELETE FROM User WHERE email = ?',
      [email]
    );

    // Typecast result to ResultSetHeader
    const header = result as ResultSetHeader;

    if (header.affectedRows === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Return all users (without passwords)
    const [allUsers] = await connection.query<RowDataPacket[]>(
      'SELECT email, name, phoneNumber, type, internalType, department, company, externalType FROM User'
    );
    const safeUsers = Array.isArray(allUsers) ? allUsers.map((user) => {
      const u = user as UserRow;
      return {
        email: u.email,
        type: u.type,
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

    return NextResponse.json({
      message: 'User deleted successfully',
      users: safeUsers,
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json(
      { message: 'Failed to delete user' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}