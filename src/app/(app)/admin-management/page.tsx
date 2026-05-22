'use client';

import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/page-header';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';

import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-context';
import { authHeaders } from '@/lib/auth-client';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import type { User } from '@/lib/types';

type AdminFormState = {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  status: boolean;
};

const MIN_PASSWORD_LEN = 6;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function formatDate(iso: string | undefined) {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
}

async function loadAdmins(): Promise<User[]> {
  const snap = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'ADMIN'))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      uid: d.id,
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      role: data.role,
      status: data.status,
      createdAt: data.createdAt?.toDate?.()?.toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
    } as User;
  });
}

export default function AdminManagementPage() {
  const { toast } = useToast();
  const { user: currentUser, refreshCurrentUser } = useUser();

  const [admins, setAdmins] = useState<User[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [form, setForm] = useState<AdminFormState>({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    status: true,
  });

  const load = async () => {
    try {
      const data = await loadAdmins();
      setAdmins(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load admins.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () =>
    setForm({ name: '', email: '', mobile: '', password: '', confirmPassword: '', status: true });

  const validateCreate = (): string | null => {
    if (!form.name.trim()) return 'Full Name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!isValidEmail(form.email)) return 'Enter a valid email address.';
    if (!form.mobile.trim()) return 'Mobile Number is required.';
    if (!form.password) return 'Password is required.';
    if (form.password.length < MIN_PASSWORD_LEN)
      return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const validateEdit = (): string | null => {
    if (!form.name.trim()) return 'Full Name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!isValidEmail(form.email)) return 'Enter a valid email address.';
    if (!form.mobile.trim()) return 'Mobile Number is required.';
    if (form.password || form.confirmPassword) {
      if (form.password.length < MIN_PASSWORD_LEN)
        return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
      if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    }
    return null;
  };

  const handleCreate = async () => {
    const err = validateCreate();
    if (err) {
      toast({ title: 'Validation error', description: err, variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const headers = await authHeaders();

      // Create user via secure API
      const createRes = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          mobile: form.mobile.trim(),
          password: form.password,
          role: 'ADMIN',
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        toast({ title: 'Error', description: createData.error, variant: 'destructive' });
        return;
      }

      // Send credentials email
      const mailRes = await fetch('/api/send-admin-mail', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
        }),
      });

      if (!mailRes.ok) {
        toast({
          title: 'Admin created',
          description: 'Admin created but email sending failed.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Admin created', description: 'Admin created and credentials email sent.' });
      }

      resetForm();
      setCreateOpen(false);
      await load();
      await refreshCurrentUser();
    } catch {
      toast({ title: 'Error', description: 'Failed to create admin.', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const openEdit = (admin: User) => {
    setEditing(admin);
    setForm({
      name: admin.name || '',
      email: admin.email || '',
      mobile: admin.mobile || '',
      password: '',
      confirmPassword: '',
      status: admin.status !== 'INACTIVE',
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    const err = validateEdit();
    if (err) {
      toast({ title: 'Validation error', description: err, variant: 'destructive' });
      return;
    }
    if (!editing) return;

    setIsSending(true);
    try {
      const headers = await authHeaders();
      const body: Record<string, string> = {
        uid: editing.uid || editing.id,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.trim(),
      };
      if (form.password) body.password = form.password;

      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }

      toast({ title: 'Admin updated', description: 'Admin account updated successfully.' });
      setEditOpen(false);
      setEditing(null);
      resetForm();
      await load();
      await refreshCurrentUser();
    } catch {
      toast({ title: 'Error', description: 'Failed to update admin.', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleStatus = async (admin: User) => {
    const nextStatus = admin.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/toggle-status', {
        method: 'POST',
        headers,
        body: JSON.stringify({ uid: admin.uid || admin.id, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Status updated', description: `Admin marked as ${nextStatus}.` });
      await load();
      await refreshCurrentUser();
    } catch {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    }
  };

  const handleDelete = async (admin: User) => {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({ uid: admin.uid || admin.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Admin deleted', description: 'Admin account deleted successfully.' });
      await load();
      await refreshCurrentUser();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete admin.', variant: 'destructive' });
    }
  };

  return (
    <ProtectedRoute allowedRoles={['MASTER_ADMIN']}>
      <div className="space-y-6">
        <PageHeader title="Admin Management" description="Create, update, and manage admin user accounts." />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Admins</CardTitle>

            <Dialog open={createOpen} onOpenChange={(open) => { if (!isSending) setCreateOpen(open); }}>
              <DialogTrigger asChild>
                <Button>Create Admin</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Admin</DialogTitle>
                  <DialogDescription>Admin users login using email and password.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  {(['name', 'email', 'mobile'] as const).map((field) => (
                    <div key={field} className="grid gap-2">
                      <Label htmlFor={`admin_${field}`} className="capitalize">{field === 'mobile' ? 'Mobile Number' : field === 'email' ? 'Email' : 'Full Name'}</Label>
                      <Input
                        id={`admin_${field}`}
                        type={field === 'email' ? 'email' : 'text'}
                        value={form[field]}
                        onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="grid gap-2">
                    <Label htmlFor="admin_password">Password</Label>
                    <Input id="admin_password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="admin_confirm">Confirm Password</Label>
                    <Input id="admin_confirm" type="password" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { resetForm(); setCreateOpen(false); }} disabled={isSending}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={isSending}>{isSending ? 'Creating...' : 'Create'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">No admins found.</TableCell>
                  </TableRow>
                )}
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>{admin.email || '-'}</TableCell>
                    <TableCell>{admin.mobile || '-'}</TableCell>
                    <TableCell><Badge variant="outline">{admin.role}</Badge></TableCell>
                    <TableCell>
                      <Badge className={admin.status === 'INACTIVE' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} variant="secondary">
                        {admin.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(admin.createdAt)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(admin)}>Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggleStatus(admin)}>
                        {admin.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Admin</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(admin)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Admin</DialogTitle>
              <DialogDescription>Update admin account details.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              {(['name', 'email', 'mobile'] as const).map((field) => (
                <div key={field} className="grid gap-2">
                  <Label htmlFor={`edit_admin_${field}`} className="capitalize">{field === 'mobile' ? 'Mobile Number' : field === 'email' ? 'Email' : 'Full Name'}</Label>
                  <Input
                    id={`edit_admin_${field}`}
                    type={field === 'email' ? 'email' : 'text'}
                    value={form[field]}
                    onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="grid gap-2">
                <Label htmlFor="edit_admin_password">New Password (optional)</Label>
                <Input id="edit_admin_password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_admin_confirm">Confirm New Password</Label>
                <Input id="edit_admin_confirm" type="password" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditOpen(false); setEditing(null); resetForm(); }}>Cancel</Button>
              <Button onClick={handleEdit} disabled={isSending}>{isSending ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
