import { NextResponse } from 'next/server';

import type { User } from '@/lib/types';

export async function POST() {
  const name = process.env.DEFAULT_MASTER_NAME;
  const email = process.env.DEFAULT_MASTER_EMAIL;
  const pass = process.env.DEFAULT_MASTER_PASS;

  if (!email || !pass) {
    return NextResponse.json(
      {
        error: 'Master admin not initialized. Set DEFAULT_MASTER_EMAIL and DEFAULT_MASTER_PASS.',
      },
      { status: 400 },
    );
  }

  const user: User = {
    id: `master_${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString(36)}`,
    name: name || 'Master Admin',
    email,
    password: pass,
    role: 'MASTER_ADMIN',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ user });
}
