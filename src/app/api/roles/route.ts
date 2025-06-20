import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { promises as fs } from 'fs';
import path from 'path';

interface Role {
  id: string;
  name: string;
  description: string;
}

interface RolesData {
  roles: Role[];
}

interface Feature {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
}

const ROLES_FILE_PATH = path.join(process.cwd(), 'data', 'roles.json');
const FEATURES_FILE_PATH = path.join(process.cwd(), 'data', 'features.json');

async function readRolesFile(): Promise<RolesData> {
  try {
    const fileContents = await fs.readFile(ROLES_FILE_PATH, 'utf8');
    return JSON.parse(fileContents);
  } catch {
    // If file doesn't exist or is invalid, return default roles
    return {
      roles: [
        {
          id: 'admin',
          name: 'Admin',
          description: 'Full system access'
        },
        {
          id: 'manager',
          name: 'Manager',
          description: 'Team management access'
        },
        {
          id: 'sales_engineer',
          name: 'Sales Engineer',
          description: 'Technical sales support'
        },
        {
          id: 'sales',
          name: 'Sales',
          description: 'Sales operations'
        }
      ]
    };
  }
}

async function writeRolesFile(data: RolesData) {
  await fs.writeFile(ROLES_FILE_PATH, JSON.stringify(data, null, 2));
}

// New function to check if a user has the manage_roles permission
async function hasManageRolesPermission(userRole: string): Promise<boolean> {
  try {
    // If no user role is provided, deny access
    if (!userRole) return false;
    
    // Read features file to check permissions
    const featuresContent = await fs.readFile(FEATURES_FILE_PATH, 'utf8');
    const features: Feature[] = JSON.parse(featuresContent);
    
    // Find the manage_roles feature
    const manageRolesFeature = features.find(f => f.id === 'manage_roles');
    if (!manageRolesFeature) return false;
    
    // Check if the user's role is in the allowed roles for manage_roles feature
    return manageRolesFeature.allowedRoles.includes(userRole);
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}

// New function to check if a user has manage_features permission
async function hasManageFeaturesPermission(userRole: string): Promise<boolean> {
  try {
    // If no user role is provided, deny access
    if (!userRole) return false;
    
    // Read features file to check permissions
    const featuresContent = await fs.readFile(FEATURES_FILE_PATH, 'utf8');
    const features: Feature[] = JSON.parse(featuresContent);
    
    // Find the manage_features feature
    const manageFeaturesFeature = features.find(f => f.id === 'manage_features');
    if (!manageFeaturesFeature) return false;
    
    // Check if the user's role is in the allowed roles for manage_features feature
    return manageFeaturesFeature.allowedRoles.includes(userRole);
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}

// Function to check if a user can view roles (has either manage_roles or manage_features permission)
async function canViewRoles(userRole: string): Promise<boolean> {
  const [canManageRoles, canManageFeatures] = await Promise.all([
    hasManageRolesPermission(userRole),
    hasManageFeaturesPermission(userRole)
  ]);
  
  return canManageRoles || canManageFeatures;
}

export async function GET() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('internalType')?.value;

  // Check if the user has manage_roles OR manage_features permission
  const hasPermission = await canViewRoles(userRole || '');
  if (!hasPermission) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await readRolesFile();
  return NextResponse.json(data.roles);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('internalType')?.value;

  // Check if the user has manage_roles permission instead of just being admin
  const hasPermission = await hasManageRolesPermission(userRole || '');
  if (!hasPermission) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const newRole = await request.json();
    
    // Validate required fields
    if (!newRole.name || !newRole.description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
    }

    // Generate a unique ID
    const id = newRole.name.toLowerCase().replace(/\s+/g, '_');
    
    // Add the new role
    const roleToAdd = {
      id,
      name: newRole.name,
      description: newRole.description
    };

    const data = await readRolesFile();
    data.roles.push(roleToAdd);
    await writeRolesFile(data);

    return NextResponse.json({ roles: data.roles });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('internalType')?.value;

  // Check if the user has manage_roles permission instead of just being admin
  const hasPermission = await hasManageRolesPermission(userRole || '');
  if (!hasPermission) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updatedRole = await request.json();
    
    // Validate required fields
    if (!updatedRole.id || !updatedRole.name || !updatedRole.description) {
      return NextResponse.json({ error: 'ID, name, and description are required' }, { status: 400 });
    }

    const data = await readRolesFile();
    data.roles = data.roles.map(role => 
      role.id === updatedRole.id ? updatedRole : role
    );
    await writeRolesFile(data);

    return NextResponse.json({ roles: data.roles });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('internalType')?.value;

  // Check if the user has manage_roles permission instead of just being admin
  const hasPermission = await hasManageRolesPermission(userRole || '');
  if (!hasPermission) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Prevent deletion of admin role
    if (id === 'admin') {
      return NextResponse.json({ error: 'Cannot delete admin role' }, { status: 400 });
    }

    const data = await readRolesFile();
    data.roles = data.roles.filter(role => role.id !== id);
    await writeRolesFile(data);

    return NextResponse.json({ roles: data.roles });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
} 