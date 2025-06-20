import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { promises as fsPromises } from 'fs';

interface Feature {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
}

const FEATURES_FILE_PATH = path.join(process.cwd(), 'data', 'features.json');

// Function to check if a user has the manage_features permission
async function hasManageFeaturesPermission(userRole: string): Promise<boolean> {
  try {
    // If no user role is provided, deny access
    if (!userRole) return false;
    
    // Read features file to check permissions
    const featuresContent = await fsPromises.readFile(FEATURES_FILE_PATH, 'utf8');
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

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'external_features.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading external features:', error);
    return NextResponse.json(
      { error: 'Failed to read external features' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check if user has permission to manage features
    const cookieStore = await cookies();
    const userRole = cookieStore.get('internalType')?.value;
    
    const hasPermission = await hasManageFeaturesPermission(userRole || '');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have permission to modify features' },
        { status: 403 }
      );
    }
    
    const features = await request.json();
    const filePath = path.join(process.cwd(), 'data', 'external_features.json');
    
    // Validate features data
    if (!Array.isArray(features)) {
      return NextResponse.json(
        { error: 'Invalid features data format' },
        { status: 400 }
      );
    }

    // Validate each feature
    for (const feature of features) {
      if (!feature.id || !feature.name || !feature.description || !Array.isArray(feature.allowedRoles)) {
        return NextResponse.json(
          { error: 'Invalid feature data structure' },
          { status: 400 }
        );
      }
    }
    
    // Update the file with new features
    fs.writeFileSync(filePath, JSON.stringify({ features }, null, 2));
    
    return NextResponse.json({ features });
  } catch (error) {
    console.error('Error updating external features:', error);
    return NextResponse.json(
      { error: 'Failed to update external features' },
      { status: 500 }
    );
  }
} 