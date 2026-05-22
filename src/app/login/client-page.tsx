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
import { Eye, EyeOff, LogIn } from 'lucide-react';

export function LoginPageClient() {
  const { login, user, isLoading } = useUser();
  const router = useRouter();

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const isSubmitDisabled = useMemo(
    () => isSubmitting || !loginIdentifier.trim() || !password,
    [isSubmitting, loginIdentifier, password]
  );

  const handleLogin = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(loginIdentifier.trim(), password);
      if (result.error) {
        setError(result.error);
      } else {
        router.push('/dashboard');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitDisabled) {
      handleLogin();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-primary"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
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
              <Label htmlFor="loginIdentifier">Email</Label>
              <Input
                id="loginIdentifier"
                type="email"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="name@company.com"
                autoComplete="username"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="pr-10"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
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
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={isSubmitDisabled}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Signing in...
              </span>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
