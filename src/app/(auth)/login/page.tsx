import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';

export const metadata = { title: 'Sign in — Brite SMS' };

export default function LoginPage() {
  return (
    <Card className="w-full max-w-[400px] shadow-md">
      <CardHeader className="pb-4">
        {/* Brand tile — only visible on small screens where the left panel is hidden */}
        <div className="flex items-center gap-2.5 mb-5 lg:hidden">
          <div
            className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center"
          >
            <span className="text-primary-foreground text-sm font-bold">B</span>
          </div>
          <span className="font-semibold text-base">Brite SMS</span>
        </div>

        <h1
          className="text-xl font-semibold text-foreground leading-snug"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Sign in to your account
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          Enter your administrator credentials to access the school management system.
        </p>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
