/**
 * Server-side auth verification utility.
 * Use in API route handlers to verify Firebase ID tokens.
 * Never import in client components.
 */
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import type { UserRole, UserStatus } from '@/lib/types';

export type VerifiedUser = {
  uid: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  name: string;
};

export type AuthError = {
  code: 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'USER_NOT_FOUND' | 'USER_INACTIVE' | 'FORBIDDEN';
  message: string;
  status: number;
};

/**
 * Extracts and verifies the Firebase ID token from the Authorization header.
 * Returns the verified user with role and status from Firestore.
 */
export async function verifyAuthToken(
  request: Request
): Promise<{ user: VerifiedUser } | { error: AuthError }> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authorization header missing or malformed.',
        status: 401,
      },
    };
  }

  const idToken = authHeader.slice(7);

  let decodedToken: { uid: string; email?: string };
  try {
    decodedToken = await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return {
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired Firebase ID token.',
        status: 401,
      },
    };
  }

  const { uid } = decodedToken;

  let userDoc: FirebaseFirestore.DocumentSnapshot;
  try {
    userDoc = await getAdminFirestore().collection('users').doc(uid).get();
  } catch {
    return {
      error: {
        code: 'USER_NOT_FOUND',
        message: 'Failed to fetch user record.',
        status: 500,
      },
    };
  }

  if (!userDoc.exists) {
    return {
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User record not found in Firestore.',
        status: 404,
      },
    };
  }

  const data = userDoc.data() as {
    role: UserRole;
    status: UserStatus;
    name: string;
    email: string;
  };

  if (data.status === 'INACTIVE') {
    return {
      error: {
        code: 'USER_INACTIVE',
        message: 'Your account is inactive. Contact the administrator.',
        status: 403,
      },
    };
  }

  return {
    user: {
      uid,
      email: data.email || decodedToken.email || '',
      role: data.role,
      status: data.status,
      name: data.name,
    },
  };
}

/**
 * Verifies auth token and checks that the caller has one of the allowed roles.
 */
export async function verifyAuthWithRole(
  request: Request,
  allowedRoles: UserRole[]
): Promise<{ user: VerifiedUser } | { error: AuthError }> {
  const result = await verifyAuthToken(request);

  if ('error' in result) return result;

  if (!allowedRoles.includes(result.user.role)) {
    return {
      error: {
        code: 'FORBIDDEN',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
        status: 403,
      },
    };
  }

  return result;
}

/**
 * Helper to build a standard error JSON response from an AuthError.
 */
export function authErrorResponse(error: AuthError): Response {
  return new Response(JSON.stringify({ error: error.message }), {
    status: error.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
