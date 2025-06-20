import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookies = {
    userEmail: request.cookies.get('userEmail')?.value,
    accessType: request.cookies.get('accessType')?.value,
    internalType: request.cookies.get('internalType')?.value,
    externalType: request.cookies.get('externalType')?.value,
    company: request.cookies.get('company')?.value,
    department: request.cookies.get('department')?.value,
  };

  const headers = {
    'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
    'host': request.headers.get('host'),
    'user-agent': request.headers.get('user-agent'),
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    url: request.url,
    pathname: new URL(request.url).pathname,
    cookies,
    headers,
    message: 'Debug info for authentication troubleshooting'
  });
}
