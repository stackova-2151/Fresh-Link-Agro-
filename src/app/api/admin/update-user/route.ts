import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { verifyAuthWithRole, authErrorResponse } from '@/lib/auth-admin';

type Body = {
  uid?: string;
  name?: string;
  email?: string;
  username?: string;
  mobile?: string;
  password?: string;
  permissions?: string[];
};

export async function POST(request: Request) {
  const authResult = await verifyAuthWithRole(request.clone(), ['MASTER_ADMIN', 'ADMIN']);
  if ('error' in authResult) return authErrorResponse(authResult.error);

  const caller = authResult.user;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { uid, name, email, username, mobile, password, permissions } = body;

  if (!uid) {
    return NextResponse.json({ error: 'uid is required.' }, { status: 400 });
  }

  try {
    // Fetch target user to check role permissions
    const targetDoc = await getAdminFirestore().collection('users').doc(uid).get();
    if (!targetDoc.exists) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const targetRole = (targetDoc.data() as { role: string }).role;

    // ADMIN can only update SUB_ADMIN
    if (caller.role === 'ADMIN' && targetRole !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'ADMIN can only update SUB_ADMIN accounts.' }, { status: 403 });
    }

    // Build Firebase Auth update payload
    const authUpdate: Record<string, string> = {};
    if (name) authUpdate.displayName = name;
    if (email) authUpdate.email = email.trim().toLowerCase();
    if (password) authUpdate.password = password;

    if (Object.keys(authUpdate).length > 0) {
      await getAdminAuth().updateUser(uid, authUpdate);
    }

    // Build Firestore update payload
    const firestoreUpdate: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (name) firestoreUpdate.name = name.trim();
    if (email) firestoreUpdate.email = email.trim().toLowerCase();
    if (username !== undefined) firestoreUpdate.username = username.trim().toLowerCase() || null;
    if (mobile !== undefined) firestoreUpdate.mobile = mobile.trim();
    if (permissions !== undefined) firestoreUpdate.permissions = permissions;

    await getAdminFirestore().collection('users').doc(uid).update(firestoreUpdate);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update user.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
