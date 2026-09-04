'use client';

import { useEffect, useState } from 'react';

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

import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-context';
import { authHeaders } from '@/lib/auth-client';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff } from 'lucide-react';

import type { User } from '@/lib/types';
import { PERMISSIONS } from '@/lib/types';

type SubAdminFormState = {
  name: string;
  username: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  permissions: string[];
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

async function loadSubAdmins(): Promise<User[]> {
  const snap = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'SUB_ADMIN'))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      uid: d.id,
      name: data.name,
      email: data.email,
      username: data.username,
      mobile: data.mobile,
      role: data.role,
      status: data.status,
      permissions: data.permissions ?? [],
      createdAt: data.createdAt?.toDate?.()?.toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
    } as User;
  });
}

const emptyForm = (): SubAdminFormState => ({
  name: '', username: '', email: '', mobile: '', password: '', confirmPassword: '', permissions: [],
});

export default function SubAdminManagementPage() {
  const { toast } = useToast();
  const { refreshCurrentUser } = useUser();

  const [subAdmins, setSubAdmins] = useState<User[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [form, setForm] = useState<SubAdminFormState>(emptyForm());
  const [showCreatePw, setShowCreatePw] = useState(false);
  const [showCreateConfirmPw, setShowCreateConfirmPw] = useState(false);
  const [showEditPw, setShowEditPw] = useState(false);
  const [showEditConfirmPw, setShowEditConfirmPw] = useState(false);

  const load = async () => {
    try {
      setSubAdmins(await loadSubAdmins());
    } catch {
      toast({ title: 'Error', description: 'Failed to load sub admins.', variant: 'destructive' });
    }
  };

  useEffect(() => { load(); }, []);

  const validateCreate = (): string | null => {
    if (!form.name.trim()) return 'Full Name is required.';
    if (!form.username.trim()) return 'Username is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!isValidEmail(form.email)) return 'Enter a valid email address.';
    if (!form.mobile.trim()) return 'Mobile Number is required.';
    if (!form.password) return 'Password is required.';
    if (form.password.length < MIN_PASSWORD_LEN) return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const validateEdit = (): string | null => {
    if (!form.name.trim()) return 'Full Name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!isValidEmail(form.email)) return 'Enter a valid email address.';
    if (!form.mobile.trim()) return 'Mobile Number is required.';
    if (form.password || form.confirmPassword) {
      if (form.password.length < MIN_PASSWORD_LEN) return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
      if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    }
    return null;
  };

  const handleCreate = async () => {
    const err = validateCreate();
    if (err) { toast({ title: 'Validation error', description: err, variant: 'destructive' }); return; }

    setIsSending(true);
    try {
      const headers = await authHeaders();

      const createRes = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          username: form.username.trim().toLowerCase(),
          mobile: form.mobile.trim(),
          password: form.password,
          role: 'SUB_ADMIN',
          permissions: form.permissions,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        toast({ title: 'Error', description: createData.error, variant: 'destructive' });
        return;
      }

      const mailRes = await fetch('/api/send-subadmin-mail', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          username: form.username.trim().toLowerCase(),
        }),
      });

      toast({
        title: 'Sub Admin created',
        description: mailRes.ok ? 'Sub admin created and credentials email sent.' : 'Created but email sending failed.',
        variant: mailRes.ok ? 'default' : 'destructive',
      });

      setForm(emptyForm());
      setCreateOpen(false);
      await load();
      await refreshCurrentUser();
    } catch {
      toast({ title: 'Error', description: 'Failed to create sub admin.', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const openEdit = (sa: User) => {
    setEditing(sa);
    setForm({ name: sa.name || '', username: sa.username || '', email: sa.email || '', mobile: sa.mobile || '', password: '', confirmPassword: '', permissions: sa.permissions || [] });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    const err = validateEdit();
    if (err) { toast({ title: 'Validation error', description: err, variant: 'destructive' }); return; }
    if (!editing) return;

    setIsSending(true);
    try {
      const headers = await authHeaders();
      const body: Record<string, unknown> = {
        uid: editing.uid || editing.id,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        username: form.username.trim().toLowerCase(),
        mobile: form.mobile.trim(),
        permissions: form.permissions,
      };
      if (form.password) body.password = form.password;

      const res = await fetch('/api/admin/update-user', { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }

      toast({ title: 'Sub Admin updated', description: 'Account updated successfully.' });
      setEditOpen(false);
      setEditing(null);
      setForm(emptyForm());
      await load();
      await refreshCurrentUser();
    } catch {
      toast({ title: 'Error', description: 'Failed to update sub admin.', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleStatus = async (sa: User) => {
    const nextStatus = sa.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/toggle-status', { method: 'POST', headers, body: JSON.stringify({ uid: sa.uid || sa.id, status: nextStatus }) });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
      toast({ title: 'Status updated', description: `Sub admin marked as ${nextStatus}.` });
      await load();
    } catch {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    }
  };

  const handleDelete = async (sa: User) => {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/delete-user', { method: 'POST', headers, body: JSON.stringify({ uid: sa.uid || sa.id }) });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
      toast({ title: 'Sub Admin deleted', description: 'Account deleted successfully.' });
      await load();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete sub admin.', variant: 'destructive' });
    }
  };

  const fields: { key: keyof SubAdminFormState; label: string; type?: string }[] = [
    { key: 'name', label: 'Full Name' },
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'mobile', label: 'Mobile Number' },
    { key: 'password', label: 'Password', type: 'password' },
    { key: 'confirmPassword', label: 'Confirm Password', type: 'password' },
  ];

  return (
    <ProtectedRoute allowedRoles={['MASTER_ADMIN', 'ADMIN']}>
      <div className="space-y-6">
        <PageHeader title="Sub Admin Management" description="Create, update, and manage sub admin user accounts." />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sub Admins</CardTitle>
            <Dialog open={createOpen} onOpenChange={(open) => { if (!isSending) { setCreateOpen(open); if (!open) { setShowCreatePw(false); setShowCreateConfirmPw(false); } } }}>
              <DialogTrigger asChild><Button>Create Sub Admin</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Sub Admin</DialogTitle>
                  <DialogDescription>Sub admins login using email and password.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  {/* Profile fields */}
                  {[fields[0], fields[1], fields[2], fields[3]].map(({ key, label }) => (
                    <div key={key} className="grid gap-2">
                      <Label htmlFor={`sa_${key}`}>{label}</Label>
                      <Input id={`sa_${key}`} type="text" value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
                    </div>
                  ))}
                  {/* Password fields with eye toggle */}
                  <div className="grid gap-2">
                    <Label htmlFor="sa_password">Password</Label>
                    <div className="relative">
                      <Input id="sa_password" type={showCreatePw ? 'text' : 'password'} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className="pr-10" />
                      <button type="button" tabIndex={-1} onClick={() => setShowCreatePw(v => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center" style={{ color: '#0F6E56' }} aria-label={showCreatePw ? 'Hide password' : 'Show password'}>
                        {showCreatePw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sa_confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input id="sa_confirmPassword" type={showCreateConfirmPw ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} className="pr-10" />
                      <button type="button" tabIndex={-1} onClick={() => setShowCreateConfirmPw(v => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center" style={{ color: '#0F6E56' }} aria-label={showCreateConfirmPw ? 'Hide password' : 'Show password'}>
                        {showCreateConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="entryApprovals"
                      checked={form.permissions.includes(PERMISSIONS.ENTRY_APPROVALS)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setForm((p) => ({ ...p, permissions: [...p.permissions, PERMISSIONS.ENTRY_APPROVALS] }));
                        } else {
                          setForm((p) => ({ ...p, permissions: p.permissions.filter(p => p !== PERMISSIONS.ENTRY_APPROVALS) }));
                        }
                      }}
                    />
                    <Label htmlFor="entryApprovals" className="cursor-pointer">Entry Approvals</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setForm(emptyForm()); setCreateOpen(false); setShowCreatePw(false); setShowCreateConfirmPw(false); }} disabled={isSending}>Cancel</Button>
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
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subAdmins.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No sub admins found.</TableCell></TableRow>
                )}
                {subAdmins.map((sa) => (
                  <TableRow key={sa.id}>
                    <TableCell className="font-medium">{sa.name}</TableCell>
                    <TableCell>{sa.username || '-'}</TableCell>
                    <TableCell>{sa.email || '-'}</TableCell>
                    <TableCell>{sa.mobile || '-'}</TableCell>
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
                        <AlertDialogTrigger asChild><Button variant="destructive" size="sm">Delete</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Sub Admin</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setShowEditPw(false); setShowEditConfirmPw(false); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Sub Admin</DialogTitle>
              <DialogDescription>Update sub admin account details.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              {/* Profile fields */}
              {[fields[0], fields[1], fields[2], fields[3]].map(({ key, label }) => (
                <div key={key} className="grid gap-2">
                  <Label htmlFor={`edit_sa_${key}`}>{label}</Label>
                  <Input id={`edit_sa_${key}`} type="text" value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              {/* Section divider */}
              <hr style={{ border: 'none', borderTop: '0.5px solid hsl(var(--border))', margin: '0.25rem 0' }} />
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(var(--text-secondary))' }}>Change password</p>
              {/* Password fields with eye toggle */}
              <div className="grid gap-2">
                <Label htmlFor="edit_sa_password">New Password (optional)</Label>
                <div className="relative">
                  <Input id="edit_sa_password" type={showEditPw ? 'text' : 'password'} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className="pr-10" />
                  <button type="button" tabIndex={-1} onClick={() => setShowEditPw(v => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center" style={{ color: '#0F6E56' }} aria-label={showEditPw ? 'Hide password' : 'Show password'}>
                    {showEditPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_sa_confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input id="edit_sa_confirmPassword" type={showEditConfirmPw ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} className="pr-10" />
                  <button type="button" tabIndex={-1} onClick={() => setShowEditConfirmPw(v => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center" style={{ color: '#0F6E56' }} aria-label={showEditConfirmPw ? 'Hide password' : 'Show password'}>
                    {showEditConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editEntryApprovals"
                  checked={form.permissions.includes(PERMISSIONS.ENTRY_APPROVALS)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setForm((p) => ({ ...p, permissions: [...p.permissions, PERMISSIONS.ENTRY_APPROVALS] }));
                    } else {
                      setForm((p) => ({ ...p, permissions: p.permissions.filter(p => p !== PERMISSIONS.ENTRY_APPROVALS) }));
                    }
                  }}
                />
                <Label htmlFor="editEntryApprovals" className="cursor-pointer">Entry Approvals</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditOpen(false); setEditing(null); setForm(emptyForm()); setShowEditPw(false); setShowEditConfirmPw(false); }}>Cancel</Button>
              <Button onClick={handleEdit} disabled={isSending}>{isSending ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
