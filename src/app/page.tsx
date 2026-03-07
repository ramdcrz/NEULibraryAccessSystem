
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Loading from './loading';
import Header from '@/components/layout/header';
import VisitLogger from '@/components/dashboard/visit-logger';
import OnboardingForm from '@/components/dashboard/onboarding-form';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [year, setYear] = useState<number | null>(null);
  const [hasLogged, setHasLogged] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    if (!loading && user?.is_blocked) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Your account has been blocked. Please contact the administrator.",
      });
      const timer = setTimeout(() => {
        signOut();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, loading, signOut, toast]);

  if (loading || !user) {
    return <Loading />;
  }

  if (user.is_blocked) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 gradient-bg">
        <Alert variant="destructive" className="max-w-md glass border-2">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Your account is blocked. You will be signed out shortly.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getFirstName = () => {
    if (user.displayName) {
      return user.displayName.split(' ')[0];
    }
    if (user.email) {
      const prefix = user.email.split('@')[0];
      const namePart = prefix.split(/[._]/)[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return 'Guest';
  };

  // Onboarding is needed if classification (user_type) or affiliation (college_office) is missing
  const needsOnboarding = !user.college_office || !user.user_type;

  return (
    <div className="flex min-h-screen w-full flex-col gradient-bg">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {!hasLogged && (
          <div className="w-full max-w-2xl text-center space-y-4">
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wide uppercase mb-2">
              Library Access Management
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Welcome, <span className="text-primary">{getFirstName()}</span>
            </h1>
            <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl">
              {needsOnboarding 
                ? "Let's complete your profile before your first log." 
                : "Help us maintain a safe campus. Log your library visit below."}
            </p>
          </div>
        )}
        <div className="w-full max-w-2xl">
          {needsOnboarding ? (
            <OnboardingForm user={user} />
          ) : (
            <VisitLogger user={user} onLogSuccess={() => setHasLogged(true)} />
          )}
        </div>
      </main>
      <footer className="w-full border-t glass py-6 text-center text-sm text-muted-foreground">
        © {year ?? '...'} New Era University Library. All rights reserved.
      </footer>
    </div>
  );
}
