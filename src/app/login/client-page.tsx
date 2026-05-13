
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser } from '@/context/user-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { ensureMasterAdminSeeded, getUserByEmail, getUserByUsername, loadUsers, saveUsers, normalizeStatus } from '@/lib/user-storage';
import { LogIn } from 'lucide-react';

export function LoginPageClient() {
  const { login } = useUser();
  const router = useRouter();

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const authError = localStorage.getItem('authError');
      if (authError) {
        localStorage.removeItem('authError');
        setError(authError);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsBootstrapping(true);
      const result = await ensureMasterAdminSeeded();
      if (cancelled) return;

      if (!result.ok) {
        setError(result.error);
      }

      setIsBootstrapping(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isSubmitDisabled = useMemo(() => {
    if (isBootstrapping) return true;
    return !loginIdentifier.trim() || !password;
  }, [loginIdentifier, password, isBootstrapping]);

  const handleLogin = () => {
    setError(null);

    if (isBootstrapping) return;

    // TEMPORARY TEST LOGIN MODE - Check hardcoded test users first
    const normalizedIdentifier = loginIdentifier.trim().toLowerCase();
    const normalizedPassword = password.trim();

    // MASTER_ADMIN test user
    if ((normalizedIdentifier === 'masteradmin' || normalizedIdentifier === 'masteradmin@gmail.com') && normalizedPassword === '123456') {
      const tempMasterAdmin = {
        id: 'temp_master_admin',
        name: 'Master Admin (Test)',
        email: 'masteradmin@gmail.com',
        role: 'MASTER_ADMIN' as const,
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Ensure temp user exists in users storage for session validation
      const existingUsers = loadUsers();
      const tempUserExists = existingUsers.some(u => u.id === tempMasterAdmin.id);
      if (!tempUserExists) {
        saveUsers([...existingUsers, tempMasterAdmin]);
      }
      
      login(tempMasterAdmin);
      router.push('/dashboard');
      return;
    }

    // ADMIN test user
    if ((normalizedIdentifier === 'admin' || normalizedIdentifier === 'admin@gmail.com') && normalizedPassword === '123456') {
      const tempAdmin = {
        id: 'temp_admin',
        name: 'Admin (Test)',
        email: 'admin@gmail.com',
        role: 'ADMIN' as const,
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Ensure temp user exists in users storage for session validation
      const existingUsers = loadUsers();
      const tempUserExists = existingUsers.some(u => u.id === tempAdmin.id);
      if (!tempUserExists) {
        saveUsers([...existingUsers, tempAdmin]);
      }
      
      login(tempAdmin);
      router.push('/dashboard');
      return;
    }

    // SUB_ADMIN test user
    if ((normalizedIdentifier === 'subadmin' || normalizedIdentifier === 'subadmin@gmail.com') && normalizedPassword === '123456') {
      const tempSubAdmin = {
        id: 'temp_sub_admin',
        name: 'Sub Admin (Test)',
        email: 'subadmin@gmail.com',
        username: 'subadmin',
        role: 'SUB_ADMIN' as const,
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Ensure temp user exists in users storage for session validation
      const existingUsers = loadUsers();
      const tempUserExists = existingUsers.some(u => u.id === tempSubAdmin.id);
      if (!tempUserExists) {
        saveUsers([...existingUsers, tempSubAdmin]);
      }
      
      login(tempSubAdmin);
      router.push('/dashboard');
      return;
    }

    // EXISTING REAL LOGIN LOGIC - Continue with normal validation
    // Try email first, then username
    let userToLogin = getUserByEmail(loginIdentifier);
    
    if (!userToLogin) {
      userToLogin = getUserByUsername(loginIdentifier);
    }

    if (!userToLogin) {
      setError('Invalid credentials.');
      return;
    }

    if (normalizeStatus(userToLogin.status) === 'INACTIVE') {
      setError('Your account is inactive. Please contact the administrator.');
      return;
    }

    if ((userToLogin.password || '') !== password) {
      setError('Invalid credentials.');
      return;
    }

    login(userToLogin);
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
            <h1 className="text-2xl font-bold font-headline text-primary">FoodSafe</h1>
          </div>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Sign in to continue.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="loginIdentifier">Email or Username</Label>
              <Input
                id="loginIdentifier"
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="name@company.com or username"
                autoComplete="username"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleLogin} disabled={isSubmitDisabled}>
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
