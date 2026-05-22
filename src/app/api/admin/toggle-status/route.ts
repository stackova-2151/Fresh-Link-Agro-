import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { verifyAuthWithRole, authErrorResponse } from '@/lib/auth-admin';
import type { UserStatus } from '@/lib/types';

type Body = { uid?: string; status?: UserStatus };

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

  const { uid, status } = body;

  if (!uid || !status) {
    return NextResponse.json({ error: 'uid and status are required.' }, { status: 400 });
  }

  if (status !== 'ACTIVE' && status !== 'INACTIVE') {
    return NextResponse.json({ error: 'status must be ACTIVE or INACTIVE.' }, { status: 400 });
  }

  // Prevent self-deactivation
  if (uid === caller.uid) {
    return NextResponse.json({ error: 'Cannot change your own status.' }, { status: 400 });
  }

  try {
    const targetDoc = await getAdminFirestore().collection('users').doc(uid).get();
    if (!targetDoc.exists) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const targetRole = (targetDoc.data() as { role: string }).role;

    // ADMIN can only toggle SUB_ADMIN
    if (caller.role === 'ADMIN' && targetRole !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'ADMIN can only toggle SUB_ADMIN status.' }, { status: 403 });
    }

    await getAdminFirestore().collection('users').doc(uid).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to toggle status.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
