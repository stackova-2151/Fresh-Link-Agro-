import { NextResponse } from 'next/server';
import { verifyAuthWithRole, authErrorResponse } from '@/lib/auth-admin';
import { getAdminAuth } from '@/lib/firebase-admin';
import { createTransporter } from '@/lib/mail';

type Body = {
  name?: string;
  email?: string;
  username?: string;
};

export async function POST(req: Request) {
  // Verify caller is MASTER_ADMIN or ADMIN
  const authResult = await verifyAuthWithRole(req.clone(), ['MASTER_ADMIN', 'ADMIN']);
  if ('error' in authResult) return authErrorResponse(authResult.error);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const username = (body.username || '').trim().toLowerCase();

  if (!name || !email) {
    return NextResponse.json({ error: 'Missing required fields: name, email.' }, { status: 400 });
  }

  try {
    const resetLink = await getAdminAuth().generatePasswordResetLink(email);

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    const loginUrl = `${appUrl}/login`;

    const transporter = createTransporter();
    const from = process.env.SMTP_USER as string;

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Your Sub Admin Account Has Been Created',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 500px;">
          <h2>Welcome, ${name}</h2>
          <p>Your sub admin account has been created on <strong>FoodSafe ERP</strong>.</p>
          <p><strong>Email:</strong> ${email}</p>
          ${username ? `<p><strong>Username:</strong> ${username}</p>` : ''}
          <p>Please set your password by clicking the button below:</p>
          <p>
            <a href="${resetLink}" style="display:inline-block;padding:10px 18px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
              Set Your Password
            </a>
          </p>
          <p>After setting your password, login at:</p>
          <p><a href="${loginUrl}">${loginUrl}</a></p>
          <p style="color:#64748b;font-size:12px;margin-top:24px;">
            This link expires in 1 hour. If you did not request this account, please ignore this email.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to send mail.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
