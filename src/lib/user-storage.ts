import type { User, UserRole, UserStatus } from '@/lib/types';

const USERS_STORAGE_KEY = 'users';

type StoredUsersPayload = {
  users: User[];
};

function safeParseUsers(raw: string | null): User[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as StoredUsersPayload | User[];

    if (Array.isArray(parsed)) return parsed;

    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as StoredUsersPayload).users)) {
      return (parsed as StoredUsersPayload).users;
    }

    return [];
  } catch {
    return [];
  }
}

function nowIso() {
  return new Date().toISOString();
}

export function loadUsers(): User[] {
  if (typeof window === 'undefined') return [];
  return safeParseUsers(localStorage.getItem(USERS_STORAGE_KEY));
}

export function saveUsers(users: User[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify({ users } satisfies StoredUsersPayload));
}

export function getUsersByRole(role: UserRole): User[] {
  return loadUsers().filter((u) => u.role === role);
}

export function getUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return loadUsers().find((u) => (u.email || '').trim().toLowerCase() === normalized);
}

export function getUserByUsername(username: string): User | undefined {
  const normalized = username.trim().toLowerCase();
  return loadUsers().find((u) => (u.username || '').trim().toLowerCase() === normalized);
}

export function createUser(input: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): User {
  const users = loadUsers();
  const timestamp = nowIso();

  const user: User = {
    ...input,
    id: input.id || `user_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  users.unshift(user);
  saveUsers(users);
  return user;
}

export function updateUser(userId: string, patch: Partial<User>): User | undefined {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return undefined;

  const updated: User = {
    ...users[idx],
    ...patch,
    id: users[idx].id,
    updatedAt: nowIso(),
  };

  const next = [...users];
  next[idx] = updated;
  saveUsers(next);
  return updated;
}

export function deleteUser(userId: string) {
  const users = loadUsers();
  saveUsers(users.filter((u) => u.id !== userId));
}

export async function ensureMasterAdminSeeded(): Promise<
  | { ok: true; seeded: boolean }
  | { ok: false; error: string }
> {
  if (typeof window === 'undefined') {
    return { ok: true, seeded: false };
  }

  const existing = loadUsers();
  if (existing.length > 0) return { ok: true, seeded: false };

  try {
    const res = await fetch('/api/bootstrap-master', { method: 'POST' });
    const data = (await res.json()) as { user?: User; error?: string };

    if (!res.ok || !data.user) {
      return {
        ok: false,
        error: data.error || 'Failed to initialize master admin.',
      };
    }

    saveUsers([data.user]);
    return { ok: true, seeded: true };
  } catch {
    return { ok: false, error: 'Failed to initialize master admin.' };
  }
}

export function normalizeStatus(status: UserStatus | undefined): UserStatus {
  return status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
}
