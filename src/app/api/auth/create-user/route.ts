// import { NextResponse } from 'next/server';
// import * as fs from 'fs/promises';
// import path from 'path';
// import bcrypt from 'bcryptjs';

// const USER_FILE_PATH = path.join(process.cwd(), 'data', 'user_accounts.json');

// // Ensure the user file exists
// const initializeUserFile = async () => {
//   try {
//     await fs.access(USER_FILE_PATH);
//   } catch {
//     // Create file with default admin user if it doesn't exist
//     const defaultUsers = [
//       {
//         email: "admin@example.com",
//         name: "Administrator",
//         password: await bcrypt.hash("admin123", 10),
//         type: "internal",
//         internalType: "admin"
//       }
//     ];
//     await fs.writeFile(USER_FILE_PATH, JSON.stringify(defaultUsers, null, 2));
//   }
// };

// export async function POST(req: Request) {
//   try {
//     await initializeUserFile();
//     const { email, password, name, phoneNumber, type, internalType, externalType, company, department } = await req.json();

//     // Read existing users
//     const usersData = await fs.readFile(USER_FILE_PATH, 'utf-8');
//     const users = JSON.parse(usersData);

//     // Check if user already exists
//     if (users.some((user: any) => user.email === email)) {
//       return NextResponse.json(
//         { message: 'User already exists' },
//         { status: 400 }
//       );
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create new user object
//     const newUser = {
//       email,
//       name,
//       password: hashedPassword,
//       phoneNumber,
//       type,
//       ...(type === 'internal'
//         ? { internalType, department }
//         : { company, externalType })
//     };

//     // Add new user to array
//     users.push(newUser);

//     // Save updated users array
//     await fs.writeFile(USER_FILE_PATH, JSON.stringify(users, null, 2));

//     // Return users list without passwords
//     const safeUsers = users.map((user: any) => ({
//       email: user.email,
//       name: user.name,
//       type: user.type,
//       phoneNumber: user.phoneNumber,
//       ...(user.type === 'internal'
//         ? {
//           internalType: user.internalType,
//           department: user.department
//         }
//         : {
//           company: user.company,
//           externalType: user.externalType
//         })
//     }));

//     return NextResponse.json({
//       message: 'User created successfully',
//       users: safeUsers
//     });
//   } catch (error) {
//     console.error('Failed to create user:', error);
//     return NextResponse.json(
//       { message: 'Failed to create user' },
//       { status: 500 }
//     );
//   }
// }

// // Get all users
// export async function GET() {
//   try {
//     await initializeUserFile();
//     const usersData = await fs.readFile(USER_FILE_PATH, 'utf-8');
//     const users = JSON.parse(usersData);

//     // Return users without passwords
//     const safeUsers = users.map((user: any) => ({
//       email: user.email,
//       name: user.name,
//       type: user.type,
//       phoneNumber: user.phoneNumber,
//       ...(user.type === 'internal'
//         ? {
//           internalType: user.internalType,
//           department: user.department
//         }
//         : {
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
import bcrypt from 'bcryptjs';
import pool from '@/lib/prisma'; // This is your mysql2 pool
// import { customAlphabet } from 'nanoid'; // or use 'cuid' or 'uuid'
import type { RowDataPacket } from 'mysql2';

// const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 21);
// const id = nanoid();

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
    const { email, password, name, phoneNumber, type, internalType, externalType, company, department } = await req.json();

    // Check if user already exists
    const [existingRows] = await connection.query(
      'SELECT email FROM User WHERE email = ? LIMIT 1',
      [email]
    );
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    await connection.query(
      `INSERT INTO User 
        (email, name, password, phoneNumber, type, internalType, department, company, externalType)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ]
    );

    // Get all users (without passwords)
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

    return NextResponse.json({
      message: 'User created successfully',
      users: safeUsers,
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json(
      { message: 'Failed to create user' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

export async function GET() {
  const connection = await pool.getConnection();
  try {
    const [users] = await connection.query('SELECT email, name, phoneNumber, type, internalType, department, company, externalType FROM User');
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