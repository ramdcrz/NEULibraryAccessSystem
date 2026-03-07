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
import { ShieldAlert, BookCheck, Waves } from 'lucide-react';

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
          <AlertTitle className="text-3xl font-black text-center tracking-tighter">Access Denied</AlertTitle>
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
    <div className="flex min-h-screen w-full flex-col gradient-bg overflow-x-hidden">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-12 p-6 md:p-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] bg-primary/5 rounded-full blur-[120px] -z-10" />
        
        {!hasLogged && (
          <div className="w-full max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-[0.3em] shadow-lg border border-primary/20 mb-2">
              <BookCheck className="h-4 w-4" />
              University Terminal
            </div>
            <h1 className="text-5xl font-black tracking-tighter sm:text-6xl md:text-7xl bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              Hello, <span className="text-primary italic">{getFirstName()}</span>
            </h1>
            <p className="mx-auto max-w-[650px] text-lg font-semibold text-muted-foreground md:text-2xl leading-relaxed">
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
      <footer className="w-full border-t border-white/10 bg-background/20 backdrop-blur-xl py-8 text-center text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">
        © {year ?? '...'} New Era University Library • Secure Management
      </footer>
    </div>
  );
}