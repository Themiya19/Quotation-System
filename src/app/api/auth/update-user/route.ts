// import { NextResponse } from 'next/server';
// import * as fs from 'fs/promises';
// import path from 'path';
// import bcrypt from 'bcryptjs';

// const USER_FILE_PATH = path.join(process.cwd(), 'data', 'user_accounts.json');

// export async function POST(req: Request) {
//   try {
//     const { originalEmail, email, password, type, internalType, externalType, company, department } = await req.json();

//     // Read existing users
//     const usersData = await fs.readFile(USER_FILE_PATH, 'utf-8');
//     const users = JSON.parse(usersData);

//     // Find user index
//     const userIndex = users.findIndex((user: any) => user.email === originalEmail);
//     if (userIndex === -1) {
//       return NextResponse.json(
//         { message: 'User not found' },
//         { status: 404 }
//       );
//     }

//     // Check if new email already exists (if email is being changed)
//     if (email !== originalEmail && users.some((user: any) => user.email === email)) {
//       return NextResponse.json(
//         { message: 'Email already in use' },
//         { status: 400 }
//       );
//     }

//     // Update user object
//     const updatedUser = {
//       email,
//       // Only update password if a new one is provided
//       password: password ? await bcrypt.hash(password, 10) : users[userIndex].password,
//       type,
//       ...(type === 'internal' 
//         ? { internalType, department } 
//         : { company, externalType })
//     };

//     // Update user in array
//     users[userIndex] = updatedUser;

//     // Save updated users array
//     await fs.writeFile(USER_FILE_PATH, JSON.stringify(users, null, 2));

//     // Return users list without passwords
//     const safeUsers = users.map((user: any) => ({
//       email: user.email,
//       type: user.type,
//       ...(user.type === 'internal' 
//         ? { 
//             internalType: user.internalType,
//             department: user.department
//           } 
//         : { 
//             company: user.company,
//             externalType: user.externalType
//           })
//     }));

//     return NextResponse.json({ 
//       message: 'User updated successfully',
//       users: safeUsers
//     });
//   } catch (error) {
//     console.error('Failed to update user:', error);
//     return NextResponse.json(
//       { message: 'Failed to update user' },
//       { status: 500 }
//     );
//   }
// } 


import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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

export async function POST(req: Request) {
  const connection = await pool.getConnection();
  try {
    const { originalEmail, email, password, name, phoneNumber, type, internalType, externalType, company, department } = await req.json();

    // Check if the user exists
    const [users] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM User WHERE email = ? LIMIT 1',
      [originalEmail]
    );
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // If email is being changed, check for conflicts
    if (email !== originalEmail) {
      const [existing] = await connection.query(
        'SELECT email FROM User WHERE email = ? LIMIT 1',
        [email]
      );
      if (Array.isArray(existing) && existing.length > 0) {
        return NextResponse.json(
          { message: 'Email already in use' },
          { status: 400 }
        );
      }
    }

    // Hash new password if provided, otherwise keep the old one
    let hashedPassword = users[0].password;
    if (password && password.trim() !== '') {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Update user in the database
    await connection.query(
      `UPDATE User SET 
        email = ?, 
        name = ?, 
        password = ?, 
        phoneNumber = ?, 
        type = ?, 
        internalType = ?, 
        department = ?, 
        company = ?, 
        externalType = ?
      WHERE email = ?`,
      [
        email,
        name,
        hashedPassword,
        phoneNumber,
        type,
        type === 'internal' ? internalType : null,
        type === 'internal' ? department : null,
        type === 'external' ? company : null,
        type === 'external' ? externalType : null,
        originalEmail,
      ]
    );

    // Return all users (without passwords)
    const [allUsers] = await connection.query(
      'SELECT email, name, phoneNumber, type, internalType, department, company, externalType FROM User'
    );
    const safeUsers = Array.isArray(allUsers) ? allUsers.map((user) => {
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

    return NextResponse.json({
      message: 'User updated successfully',
      users: safeUsers,
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { message: 'Failed to update user' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}