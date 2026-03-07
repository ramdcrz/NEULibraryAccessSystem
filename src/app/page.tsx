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
import { ShieldAlert, BookCheck } from 'lucide-react';

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
    if (!loading && user?.isBlocked) {
      toast({
        variant: "destructive",
        title: "Security Alert",
        description: "Credentials revoked. System access denied.",
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

  if (user.isBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 gradient-bg">
        <Alert variant="destructive" className="max-w-md glass border-none rounded-[2.5rem] p-10 shadow-2xl">
          <ShieldAlert className="h-10 w-10 mb-6 mx-auto text-destructive" />
          <AlertTitle className="text-3xl font-bold text-center tracking-tight">Access Denied</AlertTitle>
          <AlertDescription className="text-lg text-center mt-4 font-medium opacity-90">
            Account verification failed. Please contact university security for resolution.
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

  const needsOnboarding = !user.college_office || !user.user_type;

  return (
    <div className="flex min-h-screen w-full flex-col gradient-bg">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-12 p-6 md:p-12 animate-in fade-in slide-in-from-bottom-8 duration-700 relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] bg-primary/5 rounded-full blur-[120px] -z-10" />
        
        {!hasLogged && (
          <div className="w-full max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-secondary text-foreground/70 text-[10px] font-bold uppercase tracking-[0.25em] border border-border mb-2">
              <BookCheck className="h-3.5 w-3.5" />
              University Terminal
            </div>
            <h1 className="text-6xl font-extrabold tracking-tight sm:text-7xl md:text-8xl text-foreground">
              Hello, <span className="text-primary">{getFirstName()}</span>
            </h1>
            <p className="mx-auto max-w-[650px] text-xl font-medium text-muted-foreground md:text-2xl leading-relaxed tracking-tight">
              {needsOnboarding 
                ? "Verify your university affiliation to begin recording access logs." 
                : "Record your visit to help us maintain a safe campus environment."}
            </p>
          </div>
        )}
        <div className="w-full max-w-2xl animate-in zoom-in-95 duration-1000 delay-300 relative">
          {needsOnboarding ? (
            <OnboardingForm user={user} />
          ) : (
            <VisitLogger user={user} onLogSuccess={() => setHasLogged(true)} />
          )}
        </div>
      </main>
      <footer className="w-full py-12 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50">
        © {year ?? '...'} New Era University Library • Secure Management
      </footer>
    </div>
  );
}
