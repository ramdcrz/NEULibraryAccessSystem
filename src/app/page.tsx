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

  if (user.isBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 gradient-bg">
        <Alert variant="destructive" className="max-w-md glass border-2 rounded-3xl p-8">
          <ShieldAlert className="h-6 w-6 mb-4" />
          <AlertTitle className="text-xl font-black">Access Denied</AlertTitle>
          <AlertDescription className="text-base mt-2">
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

  const needsOnboarding = !user.college_office || !user.user_type;

  return (
    <div className="flex min-h-screen w-full flex-col gradient-bg">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6 md:p-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
        {!hasLogged && (
          <div className="w-full max-w-2xl text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border border-primary/10 mb-1">
              <BookCheck className="h-3.5 w-3.5" />
              University Terminal
            </div>
            <h1 className="text-4xl font-black tracking-tighter sm:text-5xl md:text-6xl bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              Hello, <span className="text-primary">{getFirstName()}</span>
            </h1>
            <p className="mx-auto max-w-[600px] text-base font-medium text-muted-foreground md:text-xl leading-relaxed">
              {needsOnboarding 
                ? "Please finalize your university affiliation records before your first access log." 
                : "Help us maintain a safe campus environment. Please record your library visit."}
            </p>
          </div>
        )}
        <div className="w-full max-w-xl animate-in zoom-in-95 duration-700 delay-300">
          {needsOnboarding ? (
            <OnboardingForm user={user} />
          ) : (
            <VisitLogger user={user} onLogSuccess={() => setHasLogged(true)} />
          )}
        </div>
      </main>
      <footer className="w-full border-t border-border/40 bg-background/50 backdrop-blur-sm py-6 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
        © {year ?? '...'} New Era University Library • Access Management
      </footer>
    </div>
  );
}
