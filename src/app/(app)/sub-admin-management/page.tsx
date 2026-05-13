'use client';

import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/page-header';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

import type { User } from '@/lib/types';
import { createUser, deleteUser, loadUsers, updateUser } from '@/lib/user-storage';

type SubAdminFormState = {
  name: string;
  username: string;
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

function toBoolStatus(status: User['status'] | undefined) {
  return status !== 'INACTIVE';
}

function formatDate(iso: string | undefined) {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
}

export default function SubAdminManagementPage() {
  const { toast } = useToast();
  const { user: currentUser, refreshCurrentUser } = useUser();

  const [subAdmins, setSubAdmins] = useState<User[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const [isSending, setIsSending] = useState(false);

  const [form, setForm] = useState<SubAdminFormState>({
    name: '',
    username: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    status: true,
  });

  const existing = useMemo(() => {
    const all = loadUsers();
    return {
      usernames: new Set(all.map((u) => (u.username || '').trim().toLowerCase()).filter(Boolean)),
      emails: new Set(all.map((u) => (u.email || '').trim().toLowerCase()).filter(Boolean)),
    };
  }, [subAdmins.length]);

  const load = () => {
    const all = loadUsers();
    setSubAdmins(all.filter((u) => u.role === 'SUB_ADMIN'));
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({
      name: '',
      username: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
      status: true,
    });
  };

  const validateCreate = (): string | null => {
    const name = form.name.trim();
    const username = form.username.trim().toLowerCase();
    const email = form.email.trim().toLowerCase();
    const mobile = form.mobile.trim();

    if (!name) return 'Full Name is required.';
    if (!username) return 'User Name is required.';
    if (existing.usernames.has(username)) return 'Username already exists.';

    if (!email) return 'Email is required.';
    if (!isValidEmail(email)) return 'Enter a valid email address.';
    if (existing.emails.has(email)) return 'Email already exists.';

    if (!mobile) return 'Mobile Number is required.';

    if (!form.password) return 'Password is required.';
    if (form.password.length < MIN_PASSWORD_LEN) return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';

    return null;
  };

  const validateEdit = (): string | null => {
    if (!editing) return 'No sub admin selected.';

    const name = form.name.trim();
    const username = form.username.trim().toLowerCase();
    const email = form.email.trim().toLowerCase();
    const mobile = form.mobile.trim();

    if (!name) return 'Full Name is required.';
    if (!username) return 'User Name is required.';

    const all = loadUsers();
    const duplicateUsername = all.find((u) => (u.username || '').trim().toLowerCase() === username && u.id !== editing.id);
    if (duplicateUsername) return 'Username already exists.';

    if (!email) return 'Email is required.';
    if (!isValidEmail(email)) return 'Enter a valid email address.';
    const duplicateEmail = all.find((u) => (u.email || '').trim().toLowerCase() === email && u.id !== editing.id);
    if (duplicateEmail) return 'Email already exists.';

    if (!mobile) return 'Mobile Number is required.';

    if (form.password || form.confirmPassword) {
      if (form.password.length < MIN_PASSWORD_LEN) return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
      if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    }

    return null;
  };

  const handleCreate = () => {
    const err = validateCreate();
    if (err) {
      toast({ title: 'Validation error', description: err, variant: 'destructive' });
      return;
    }

    const payload = {
      name: form.name.trim(),
      username: form.username.trim().toLowerCase(),
      email: form.email.trim().toLowerCase(),
      mobile: form.mobile.trim(),
      password: form.password,
      role: 'SUB_ADMIN',
      status: form.status ? 'ACTIVE' : 'INACTIVE',
      createdBy: currentUser?.id,
      avatar: '',
    } as const;

    createUser(payload);

    setIsSending(true);
    (async () => {
      try {
        const res = await fetch('/api/send-subadmin-mail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: payload.name,
            email: payload.email,
            username: payload.username,
            password: payload.password,
          }),
        });

        if (!res.ok) {
          toast({
            title: 'Sub Admin created',
            description: 'User created but email sending failed.',
            variant: 'destructive',
          });
        } else {
          toast({ title: 'Sub Admin created', description: 'Sub admin created and credentials email sent.' });
        }
      } catch {
        toast({
          title: 'Sub Admin created',
          description: 'User created but email sending failed.',
          variant: 'destructive',
        });
      } finally {
        setIsSending(false);
        resetForm();
        setCreateOpen(false);
        load();
        refreshCurrentUser();
      }
    })();
  };

  const openEdit = (sa: User) => {
    setEditing(sa);
    setForm({
      name: sa.name || '',
      username: sa.username || '',
      email: sa.email || '',
      mobile: sa.mobile || '',
      password: '',
      confirmPassword: '',
      status: toBoolStatus(sa.status),
    });
    setEditOpen(true);
  };

  const handleEdit = () => {
    const err = validateEdit();
    if (err) {
      toast({ title: 'Validation error', description: err, variant: 'destructive' });
      return;
    }

    if (!editing) return;

    updateUser(editing.id, {
      name: form.name.trim(),
      username: form.username.trim().toLowerCase(),
      email: form.email.trim().toLowerCase(),
      mobile: form.mobile.trim(),
      status: form.status ? 'ACTIVE' : 'INACTIVE',
      ...(form.password ? { password: form.password } : {}),
    });

    toast({ title: 'Sub Admin updated', description: 'Sub admin account has been updated successfully.' });
    setEditOpen(false);
    setEditing(null);
    resetForm();
    load();
    refreshCurrentUser();
  };

  const handleToggleStatus = (sa: User) => {
    const nextStatus = sa.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    updateUser(sa.id, { status: nextStatus });

    toast({ title: 'Status updated', description: `Sub admin marked as ${nextStatus}.` });
    load();
    refreshCurrentUser();
  };

  const handleDelete = (sa: User) => {
    deleteUser(sa.id);
    toast({ title: 'Sub Admin deleted', description: 'Sub admin account has been deleted successfully.' });
    load();
    refreshCurrentUser();
  };

  return (
    <ProtectedRoute allowedRoles={['MASTER_ADMIN', 'ADMIN']}>
      <div className="space-y-6">
        <PageHeader title="Sub Admin Management" description="Create, update, and manage sub admin user accounts." />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sub Admins</CardTitle>

            <Dialog open={createOpen} onOpenChange={(open) => { if (!isSending) setCreateOpen(open); }}>
              <DialogTrigger asChild>
                <Button>Create Sub Admin</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Sub Admin</DialogTitle>
                  <DialogDescription>Sub admins login using username and password.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sa_name">Full Name</Label>
                    <Input id="sa_name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="sa_username">User Name</Label>
                    <Input id="sa_username" value={form.username} disabled={isSending} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="sa_email">Email</Label>
                    <Input id="sa_email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="sa_mobile">Mobile Number</Label>
                    <Input id="sa_mobile" value={form.mobile} onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="sa_password">Password</Label>
                    <Input id="sa_password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="sa_confirm">Confirm Password</Label>
                    <Input id="sa_confirm" type="password" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Status</Label>
                    <div className="flex items-center gap-3">
                      <Badge variant={form.status ? 'secondary' : 'destructive'} className={form.status ? 'bg-green-100 text-green-800' : ''}>
                        {form.status ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                      <Switch checked={form.status} onCheckedChange={(v) => setForm((p) => ({ ...p, status: v }))} />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => { resetForm(); setCreateOpen(false); }} disabled={isSending}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={isSending}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subAdmins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">No sub admins found.</TableCell>
                  </TableRow>
                )}

                {subAdmins.map((sa) => (
                  <TableRow key={sa.id}>
                    <TableCell className="font-medium">{sa.name}</TableCell>
                    <TableCell>{sa.username || '-'}</TableCell>
                    <TableCell>{sa.email || '-'}</TableCell>
                    <TableCell>{sa.mobile || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sa.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={sa.status === 'INACTIVE' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} variant="secondary">
                        {sa.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(sa.createdAt)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(sa)}>Edit</Button>

                      <Button variant="outline" size="sm" onClick={() => handleToggleStatus(sa)}>
                        {sa.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Sub Admin</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the sub admin account.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(sa)}>Delete</AlertDialogAction>
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

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Sub Admin</DialogTitle>
              <DialogDescription>Update sub admin account details.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_sa_name">Full Name</Label>
                <Input id="edit_sa_name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_sa_username">User Name</Label>
                <Input id="edit_sa_username" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_sa_email">Email</Label>
                <Input id="edit_sa_email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_sa_mobile">Mobile Number</Label>
                <Input id="edit_sa_mobile" value={form.mobile} onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_sa_password">New Password (optional)</Label>
                <Input id="edit_sa_password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_sa_confirm">Confirm New Password</Label>
                <Input id="edit_sa_confirm" type="password" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
              </div>

              <div className="flex items-center justify-between">
                <Label>Status</Label>
                <div className="flex items-center gap-3">
                  <Badge variant={form.status ? 'secondary' : 'destructive'} className={form.status ? 'bg-green-100 text-green-800' : ''}>
                    {form.status ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                  <Switch checked={form.status} onCheckedChange={(v) => setForm((p) => ({ ...p, status: v }))} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditOpen(false);
                  setEditing(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleEdit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
