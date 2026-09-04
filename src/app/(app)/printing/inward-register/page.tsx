'use client';
// Redirects to the consolidated Register page (see /printing/register).
// The print sub-route (/printing/inward-register/print) is unchanged.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InwardRegisterRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/printing/register'); }, [router]);
  return null;
}
