import { NextResponse } from 'next/server';

export function errorJson(error: unknown, fallback: string, fallbackStatus = 500) {
  const message = error instanceof Error ? error.message : fallback;
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status: unknown }).status) || fallbackStatus
    : fallbackStatus;

  return NextResponse.json({ error: message }, { status });
}
