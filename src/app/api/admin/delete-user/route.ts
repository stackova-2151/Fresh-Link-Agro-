import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { verifyAuthWithRole, authErrorResponse } from '@/lib/auth-admin';

type Body = { uid?: string };

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

  const { uid } = body;
  if (!uid) return NextResponse.json({ error: 'uid is required.' }, { status: 400 });

  // Prevent self-deletion
  if (uid === caller.uid) {
    return NextResponse.json({ error: 'Cannot delete your own account.' }, { status: 400 });
  }

  try {
    const targetDoc = await getAdminFirestore().collection('users').doc(uid).get();
    if (!targetDoc.exists) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const targetRole = (targetDoc.data() as { role: string }).role;

    // ADMIN can only delete SUB_ADMIN
    if (caller.role === 'ADMIN' && targetRole !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'ADMIN can only delete SUB_ADMIN accounts.' }, { status: 403 });
    }

    // Delete from Firebase Auth
    await getAdminAuth().deleteUser(uid);

    // Delete from Firestore
    await getAdminFirestore().collection('users').doc(uid).delete();

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete user.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
