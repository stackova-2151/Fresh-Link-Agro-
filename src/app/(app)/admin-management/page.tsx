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

function toBoolStatus(status: User['status'] | undefined) {
  return status !== 'INACTIVE';
}

function formatDate(iso: string | undefined) {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
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

  const existingEmails = useMemo(() => {
    const all = loadUsers();
    return new Set(all.map((u) => (u.email || '').trim().toLowerCase()).filter(Boolean));
  }, [admins.length]);

  const load = () => {
    const all = loadUsers();
    setAdmins(all.filter((u) => u.role === 'ADMIN'));
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({
      name: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
      status: true,
    });
  };

  const validateCreate = (): string | null => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const mobile = form.mobile.trim();

    if (!name) return 'Full Name is required.';
    if (!email) return 'Email is required.';
    if (!isValidEmail(email)) return 'Enter a valid email address.';
    if (existingEmails.has(email)) return 'Email already exists.';
    if (!mobile) return 'Mobile Number is required.';

    if (!form.password) return 'Password is required.';
    if (form.password.length < MIN_PASSWORD_LEN) return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';

    return null;
  };

  const validateEdit = (): string | null => {
    if (!editing) return 'No admin selected.';

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const mobile = form.mobile.trim();

    if (!name) return 'Full Name is required.';
    if (!email) return 'Email is required.';
    if (!isValidEmail(email)) return 'Enter a valid email address.';

    const all = loadUsers();
    const duplicate = all.find((u) => (u.email || '').trim().toLowerCase() === email && u.id !== editing.id);
    if (duplicate) return 'Email already exists.';

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
      email: form.email.trim().toLowerCase(),
      mobile: form.mobile.trim(),
      password: form.password,
      role: 'ADMIN',
      status: form.status ? 'ACTIVE' : 'INACTIVE',
      createdBy: currentUser?.id,
      avatar: '',
      username: undefined,
    } as const;

    createUser(payload);

    setIsSending(true);
    (async () => {
      try {
        const res = await fetch('/api/send-admin-mail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: payload.name, email: payload.email, password: payload.password }),
        });

        if (!res.ok) {
          toast({
            title: 'Admin created',
            description: 'User created but email sending failed.',
            variant: 'destructive',
          });
        } else {
          toast({ title: 'Admin created', description: 'Admin created and credentials email sent.' });
        }
      } catch {
        toast({
          title: 'Admin created',
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

  const openEdit = (admin: User) => {
    setEditing(admin);
    setForm({
      name: admin.name || '',
      email: admin.email || '',
      mobile: admin.mobile || '',
      password: '',
      confirmPassword: '',
      status: toBoolStatus(admin.status),
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
      email: form.email.trim().toLowerCase(),
      mobile: form.mobile.trim(),
      status: form.status ? 'ACTIVE' : 'INACTIVE',
      ...(form.password ? { password: form.password } : {}),
    });

    toast({ title: 'Admin updated', description: 'Admin account has been updated successfully.' });
    setEditOpen(false);
    setEditing(null);
    resetForm();
    load();
    refreshCurrentUser();
  };

  const handleToggleStatus = (admin: User) => {
    const nextStatus = admin.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    updateUser(admin.id, { status: nextStatus });

    toast({ title: 'Status updated', description: `Admin marked as ${nextStatus}.` });
    load();
    refreshCurrentUser();
  };

  const handleDelete = (admin: User) => {
    deleteUser(admin.id);
    toast({ title: 'Admin deleted', description: 'Admin account has been deleted successfully.' });
    load();
    refreshCurrentUser();
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
                  <div className="grid gap-2">
                    <Label htmlFor="admin_name">Full Name</Label>
                    <Input id="admin_name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="admin_email">Email</Label>
                    <Input id="admin_email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="admin_mobile">Mobile Number</Label>
                    <Input id="admin_mobile" value={form.mobile} onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="admin_password">Password</Label>
                    <Input id="admin_password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="admin_confirm">Confirm Password</Label>
                    <Input id="admin_confirm" type="password" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
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
                    <TableCell>
                      <Badge variant="outline">{admin.role}</Badge>
                    </TableCell>
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
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the admin account.
                            </AlertDialogDescription>
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

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Admin</DialogTitle>
              <DialogDescription>Update admin account details.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_admin_name">Full Name</Label>
                <Input id="edit_admin_name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_admin_email">Email</Label>
                <Input id="edit_admin_email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_admin_mobile">Mobile Number</Label>
                <Input id="edit_admin_mobile" value={form.mobile} onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_admin_password">New Password (optional)</Label>
                <Input id="edit_admin_password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_admin_confirm">Confirm New Password</Label>
                <Input id="edit_admin_confirm" type="password" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
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
