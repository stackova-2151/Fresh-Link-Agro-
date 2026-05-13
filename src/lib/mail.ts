import nodemailer from 'nodemailer';

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
};

function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const port = portRaw ? Number(portRaw) : NaN;

  if (!host || !user || !pass || !Number.isFinite(port)) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
  }

  return { host, port, user, pass };
}

export function createTransporter() {
  const cfg = getSmtpConfig();

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });
}

function getAppUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error('App URL not configured. Set NEXT_PUBLIC_APP_URL.');
  return url.replace(/\/$/, '');
}

function renderAdminTemplate(params: { name: string; email: string; password: string; loginUrl: string }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Welcome, ${params.name}</h2>
      <p>Your admin account has been created.</p>
      <p><strong>Login credentials</strong></p>
      <ul>
        <li><strong>Email:</strong> ${params.email}</li>
        <li><strong>Password:</strong> ${params.password}</li>
      </ul>
      <p>
        <a href="${params.loginUrl}" style="display:inline-block;padding:10px 14px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">
          Login
        </a>
      </p>
      <p style="color:#64748b;font-size:12px;">If you did not request this account, please contact the administrator.</p>
    </div>
  `;
}

function renderSubAdminTemplate(params: { name: string; username: string; password: string; loginUrl: string }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Welcome, ${params.name}</h2>
      <p>Your sub admin account has been created.</p>
      <p><strong>Login credentials</strong></p>
      <ul>
        <li><strong>Username:</strong> ${params.username}</li>
        <li><strong>Password:</strong> ${params.password}</li>
      </ul>
      <p>
        <a href="${params.loginUrl}" style="display:inline-block;padding:10px 14px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">
          Login
        </a>
      </p>
      <p style="color:#64748b;font-size:12px;">If you did not request this account, please contact the administrator.</p>
    </div>
  `;
}

export async function sendAdminCredentialsMail(params: { name: string; email: string; password: string }) {
  const transporter = createTransporter();
  const from = process.env.SMTP_USER as string;
  const loginUrl = `${getAppUrl()}/login`;

  await transporter.sendMail({
    from,
    to: params.email,
    subject: 'Your Admin Login Credentials',
    html: renderAdminTemplate({
      name: params.name,
      email: params.email,
      password: params.password,
      loginUrl,
    }),
  });
}

export async function sendSubAdminCredentialsMail(params: { name: string; email: string; username: string; password: string }) {
  const transporter = createTransporter();
  const from = process.env.SMTP_USER as string;
  const loginUrl = `${getAppUrl()}/login`;

  await transporter.sendMail({
    from,
    to: params.email,
    subject: 'Your Sub Admin Login Credentials',
    html: renderSubAdminTemplate({
      name: params.name,
      username: params.username,
      password: params.password,
      loginUrl,
    }),
  });
}
