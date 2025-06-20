import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as fs from 'fs/promises';
import path from 'path';

interface ExternalRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface ExternalRolesData {
  roles: ExternalRole[];
}

interface Feature {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
}

const EXTERNAL_ROLES_FILE_PATH = path.join(process.cwd(), 'data', 'external_roles.json');
const FEATURES_FILE_PATH = path.join(process.cwd(), 'data', 'features.json');

// Function to check if a user has the manage_roles permission
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

// Function to check if a user has manage_features permission
// async function hasManageFeaturesPermission(userRole: string): Promise<boolean> {
//   try {
//     // If no user role is provided, deny access
//     if (!userRole) return false;
    
//     // Read features file to check permissions
//     const featuresContent = await fs.readFile(FEATURES_FILE_PATH, 'utf8');
//     const features: Feature[] = JSON.parse(featuresContent);
    
//     // Find the manage_features feature
//     const manageFeaturesFeature = features.find(f => f.id === 'manage_features');
//     if (!manageFeaturesFeature) return false;
    
//     // Check if the user's role is in the allowed roles for manage_features feature
//     return manageFeaturesFeature.allowedRoles.includes(userRole);
//   } catch (error) {
//     console.error('Error checking permissions:', error);
//     return false;
//   }
// }

// Function to check if a user can view roles (has either manage_roles or manage_features permission)
// async function canViewRoles(userRole: string): Promise<boolean> {
//   const [canManageRoles, canManageFeatures] = await Promise.all([
//     hasManageRolesPermission(userRole),
//     hasManageFeaturesPermission(userRole)
//   ]);
  
//   return canManageRoles || canManageFeatures;
// }

async function readExternalRolesFile(): Promise<ExternalRolesData> {
  try {
    const fileContents = await fs.readFile(EXTERNAL_ROLES_FILE_PATH, 'utf8');
    return JSON.parse(fileContents);
  } catch {
    // If file doesn't exist or is invalid, return default roles
    return {
      roles: [
        {
          id: 'ext_client',
          name: 'Client',
          description: 'External client user with limited access',
          permissions: ['view_reports', 'submit_requests']
        }
      ]
    };
  }
}

async function writeExternalRolesFile(data: ExternalRolesData) {
  await fs.writeFile(EXTERNAL_ROLES_FILE_PATH, JSON.stringify(data, null, 2));
}

export async function GET() {
  try {
    const data = await readExternalRolesFile();
    return NextResponse.json({ roles: data.roles });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch external roles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('internalType')?.value;
  
  // Check if the user has manage_roles permission instead of just being admin
  const hasPermission = await hasManageRolesPermission(userRole || '');
  if (!hasPermission) {
    return NextResponse.json({ error: 'Unauthorized: You do not have permission to manage roles' }, { status: 401 });
  }

  try {
    const newRole = await request.json();
    
    // Validate required fields
    if (!newRole.name || !newRole.description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
    }

    // Generate a unique ID with ext_ prefix
    const id = 'ext_' + newRole.name.toLowerCase().replace(/\s+/g, '_');
    
    // Add the new role
    const roleToAdd = {
      id,
      name: newRole.name,
      description: newRole.description,
      permissions: newRole.permissions || []
    };

    const data = await readExternalRolesFile();
    
    // Check if role with same ID already exists
    if (data.roles.some(role => role.id === id)) {
      return NextResponse.json({ error: 'Role with this name already exists' }, { status: 400 });
    }
    
    data.roles.push(roleToAdd);
    await writeExternalRolesFile(data);

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
    return NextResponse.json({ error: 'Unauthorized: You do not have permission to manage roles' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Prevent deletion of default client role
    if (id === 'ext_client') {
      return NextResponse.json({ error: 'Cannot delete default client role' }, { status: 400 });
    }

    const data = await readExternalRolesFile();
    data.roles = data.roles.filter(role => role.id !== id);
    await writeExternalRolesFile(data);

    return NextResponse.json({ roles: data.roles });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
} 