import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { verifyAuthWithRole, authErrorResponse } from '@/lib/auth-admin';
import type { UserRole } from '@/lib/types';

type Body = {
  name?: string;
  email?: string;
  username?: string;
  mobile?: string;
  password?: string;
  role?: UserRole;
  permissions?: string[];
};

export async function POST(request: Request) {
  // Clone request BEFORE passing to verifyAuthWithRole.
  // A Request body stream can only be consumed once.
  // verifyAuthWithRole reads headers only (not body), so cloning is safe,
  // but we clone defensively to guarantee body is available for request.json() below.
  const authResult = await verifyAuthWithRole(request.clone(), ['MASTER_ADMIN', 'ADMIN']);
  if ('error' in authResult) return authErrorResponse(authResult.error);

  const caller = authResult.user;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const username = (body.username || '').trim().toLowerCase();
  const mobile = (body.mobile || '').trim();
  const password = body.password || '';
  const role = body.role;
  const permissions = body.permissions || [];

  if (!name || !email || !password || !role) {
    return NextResponse.json(
      { error: 'Missing required fields: name, email, password, role.' },
      { status: 400 }
    );
  }

  // ADMIN can only create SUB_ADMIN
  if (caller.role === 'ADMIN' && role !== 'SUB_ADMIN') {
    return NextResponse.json(
      { error: 'ADMIN can only create SUB_ADMIN accounts.' },
      { status: 403 }
    );
  }

  // MASTER_ADMIN cannot create another MASTER_ADMIN
  if (caller.role === 'MASTER_ADMIN' && role === 'MASTER_ADMIN') {
    return NextResponse.json(
      { error: 'Cannot create another MASTER_ADMIN.' },
      { status: 403 }
    );
  }

  try {
    // Create Firebase Auth account
    const userRecord = await getAdminAuth().createUser({
      email,
      password,
      displayName: name,
    });

    const uid = userRecord.uid;

    // Write Firestore user document
    await getAdminFirestore()
      .collection('users')
      .doc(uid)
      .set({
        uid,
        name,
        email,
        username: username || null,
        mobile,
        role,
        status: 'ACTIVE',
        permissions,
        createdBy: caller.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ uid, name, email, role, status: 'ACTIVE' });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? '';
    if (code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'Email already in use.' }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : 'Failed to create user.';
    console.error('[create-user] Firebase error:', code, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
