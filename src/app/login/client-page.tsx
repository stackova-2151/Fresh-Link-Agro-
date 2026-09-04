'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { LoginBackground } from '@/components/auth/login-background';

// ─── Left branding panel ───────────────────────────────────────────────────────
// Extracted as a named component so it can be reused on any future auth screen
// (password reset, etc.) without duplicating markup.
function BrandPanel() {
  return (
    <div
      className="hidden md:flex flex-col justify-between p-10 lg:p-10"
      style={{ backgroundColor: 'var(--teal-900)' }}
    >
      {/* Logo + name */}
      <div className="flex items-center gap-3">
        <Image
          src="/logo1.png"
          alt="Fresh Link"
          width={140}
          height={36}
          priority
        />
      </div>

      {/* Tagline block — vertically centered in the remaining space */}
      <div className="flex-1 flex flex-col justify-center gap-3">
        <p
          className="font-semibold leading-snug"
          style={{ fontSize: '22px', color: 'var(--teal-50)' }}
        >
          Smart cold storage,<br />under control.
        </p>
        <p
          className="leading-relaxed"
          style={{ fontSize: '14px', color: 'var(--teal-100)' }}
        >
          Manage inward &amp; outward vouchers, track chamber occupancy,
          and generate bills all in one place.
        </p>
      </div>

      {/* Footer note */}
      <p style={{ fontSize: '12px', color: 'var(--teal-200)' }}>
        © {new Date().getFullYear()} Fresh Link Agro. All rights reserved.
      </p>
    </div>
  );
}

// ─── Main login page ───────────────────────────────────────────────────────────
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
    if (e.key === 'Enter' && !isSubmitDisabled) handleLogin();
  };

  return (
    <>
      {/* Autofill background override — injected once at page level */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px white inset !important;
          box-shadow: 0 0 0 1000px white inset !important;
          -webkit-text-fill-color: hsl(224deg 71.4% 4.1%) !important;
          transition: background-color 9999s ease-in-out 0s;
        }
        .login-input:focus,
        .login-input:focus-visible {
          outline: none;
          border-color: #0F6E56;
          box-shadow: 0 0 0 3px rgba(15, 110, 86, 0.15);
        }
      `}</style>

      <LoginBackground>
        {/* Two-panel card */}
        <div
          className="w-full overflow-hidden grid md:grid-cols-[45fr_55fr]"
          style={{
            maxWidth: '900px',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
          }}
        >
          {/* ── Left: branding panel ── */}
          <BrandPanel />

          {/* ── Right: form panel ── */}
          <div
            className="flex flex-col justify-center px-8 py-10 sm:px-12"
            style={{ backgroundColor: 'white' }}
          >
            {/* Mobile-only logo (shown when left panel is hidden) */}
            <div className="flex md:hidden items-center gap-2 mb-8">
              <Image
                src="/logo1.png"
                alt="Fresh Link"
                width={120}
                height={30}
                className="object-contain"
                priority
              />
            </div>

            {/* Heading */}
            <div className="mb-8">
              <h1
                className="font-bold tracking-tight"
                style={{ fontSize: '24px', color: 'hsl(224deg 71.4% 4.1%)' }}
              >
                Sign in
              </h1>
              <p
                className="mt-1"
                style={{ fontSize: '14px', color: 'hsl(var(--text-muted))' }}
              >
                Enter your credentials to access the dashboard.
              </p>
            </div>

            {/* Error alert */}
            {error && (
              <Alert variant="destructive" className="mb-5">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Form fields */}
            <div className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="loginIdentifier"
                  style={{ fontSize: '14px', fontWeight: 500 }}
                >
                  Email
                </Label>
                <Input
                  id="loginIdentifier"
                  type="email"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="name@company.com"
                  autoComplete="username"
                  disabled={isSubmitting}
                  className="login-input"
                  style={{
                    backgroundColor: 'white',
                    borderColor: 'hsl(var(--border))',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  style={{ fontSize: '14px', fontWeight: 500 }}
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    className="login-input pr-10"
                    style={{
                      backgroundColor: 'white',
                      borderColor: 'hsl(var(--border))',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    style={{
                      color: '#0F6E56',
                      transition: 'color 0.15s ease',
                    }}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
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

            {/* Login button */}
            <Button
              className="w-full mt-7 btn-motion"
              onClick={handleLogin}
              disabled={isSubmitDisabled}
              style={{
                backgroundColor: isSubmitDisabled ? 'rgba(15,110,86,0.45)' : '#0F6E56',
                color: isSubmitDisabled ? 'rgba(255,255,255,0.6)' : '#FFFFFF',
                opacity: 1,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitDisabled)
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#085041';
              }}
              onMouseLeave={(e) => {
                if (!isSubmitDisabled)
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0F6E56';
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in
                </>
              )}
            </Button>
          </div>
        </div>
      </LoginBackground>
    </>
  );
}
