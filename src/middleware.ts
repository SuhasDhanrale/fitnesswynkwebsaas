import { NextRequest, NextResponse } from 'next/server';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isSameOrigin(req: NextRequest, originHeader: string): boolean {
  try {
    const origin = new URL(originHeader);
    return origin.protocol === req.nextUrl.protocol && origin.host === req.nextUrl.host;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    return NextResponse.next();
  }

  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const origin = req.headers.get('origin');
  if (origin && !isSameOrigin(req, origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
