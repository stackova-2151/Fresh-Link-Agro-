import { NextResponse } from 'next/server';

import { sendSubAdminCredentialsMail } from '@/lib/mail';

type Body = {
  name?: string;
  email?: string;
  username?: string;
  password?: string;
};

export async function POST(req: Request) {
  let body: Body;

  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const username = (body.username || '').trim().toLowerCase();
  const password = body.password || '';

  if (!name || !email || !username || !password) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  try {
    await sendSubAdminCredentialsMail({ name, email, username, password });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to send mail.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
