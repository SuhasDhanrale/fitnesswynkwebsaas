import 'server-only';

import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'guddy_session';
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

type SessionPayload = {
  v: 1;
  iat: number;
  exp: number;
  nonce: string;
};

function base64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function getSessionSecret(): string {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) {
    throw new Error('APP_SESSION_SECRET is not set. Add a strong secret to your environment.');
  }
  return secret;
}

function sign(payload: string): string {
  return base64Url(crypto.createHmac('sha256', getSessionSecret()).update(payload).digest());
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function createSessionToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    v: 1,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;

  const [encodedPayload, signature, extra] = token.split('.');
  if (!encodedPayload || !signature || extra) return false;
  if (!safeEqual(signature, sign(encodedPayload))) return false;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload;
    return payload.v === 1 && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function setSessionCookie(): void {
  cookies().set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(): void {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export function hasAppSession(): boolean {
  return isValidSessionToken(cookies().get(COOKIE_NAME)?.value);
}

export function assertAppSession(): void {
  if (!hasAppSession()) {
    throw new Error('Unauthorized');
  }
}
