'use client';
// Redirects to the consolidated Register page (see /printing/register).
// The print sub-route (/printing/outward-register/print) is unchanged.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OutwardRegisterRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/printing/register'); }, [router]);
  return null;
}
