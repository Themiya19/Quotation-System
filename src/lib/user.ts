export interface UserData {
  email: string;
  type: string;
  internalType?: string;
  department?: string;
  company?: string;
}

export async function getUserByEmail(email: string): Promise<UserData | null> {
  try {
    const response = await fetch('/api/auth/get-user-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user details:', error);
    return null;
  }
} 