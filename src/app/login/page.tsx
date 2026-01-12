
import { UserProvider } from '@/context/user-context';
import { LoginPageClient } from './client-page';

export default function LoginPage() {
  return (
    <UserProvider>
      <LoginPageClient />
    </UserProvider>
  );
}
