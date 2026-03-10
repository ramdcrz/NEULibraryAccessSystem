'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookMarked, LoaderCircle, ShieldCheck, Info } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

function LoginContent() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const isTimeout = searchParams.get('timeout') === 'true';
    if (isTimeout) {
      const timer = setTimeout(() => {
        toast({
          variant: "default",
          title: "Session Reset",
          description: (
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <span>The previous session was closed due to inactivity.</span>
            </div>
          ),
          className: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900 border-2 font-bold",
          duration: 5000,
        });
        
        const params = new URLSearchParams(searchParams.toString());
        params.delete('timeout');
        router.replace(params.toString() ? `/login?${params.toString()}` : '/login');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, toast, router]);

  const handleSignIn = async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setIsAuthenticating(false);
      
      if (error.code === 'auth/popup-closed-by-user') {
        toast({
          variant: "destructive",
          title: "Sign In Cancelled",
          description: "Sorry. Sign In Again.",
          className: "rounded-2xl border-2 shadow-2xl font-black",
        });
        return;
      }

      console.error('Sign in failed:', error);
      
      const isDomainError = error.code === 'auth/unauthorized-domain';
      
      toast({
        variant: "destructive",
        title: "Access System Error",
        description: isDomainError 
          ? "This web domain is not authorized. Please add this URL to 'Authorized Domains' in your Firebase Console Authentication settings."
          : "Sorry. Sign In Again.",
        className: "rounded-2xl border-2 shadow-2xl font-black",
      });
    }
  };
  
  const GoogleIcon = () => (
    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.658-3.397-11.303-8H4.388v5.385C7.743,39.957,15.28,44,24,44z"></path>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.02,35.23,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
  );

  if (loading || user || isAuthenticating) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="h-14 w-14 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 animate-in fade-in duration-1000">
      <div className="w-full max-w-md flex flex-col items-center justify-center gap-6">
        <Card className="w-full glass border border-black/5 dark:border-white/20 animate-in zoom-in-95 duration-1000 shadow-2xl shadow-primary/20 relative overflow-hidden rounded-[2.5rem]">
          <CardHeader className="text-center pb-12 pt-16 px-6 relative z-10">
            <div className="mx-auto mb-10 flex h-20 w-20 items-center justify-center rounded-2xl blue-gradient text-white animate-float shadow-xl shadow-primary/30">
              <BookMarked className="h-10 w-10" />
            </div>
            <div className="flex flex-col gap-2 mb-6">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-blue-gradient">NEU Library</h1>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground/60">Access System</p>
            </div>
          </CardHeader>
          <CardContent className="px-6 sm:px-10 pb-16 relative z-10">
            <Button
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="w-full h-14 transition-all blue-gradient border-none rounded-2xl gap-3 sm:gap-4 active:scale-95 hover:scale-[1.02] hover:opacity-90 shadow-lg shadow-primary/20 px-4"
              variant="default"
            >
              <div className="flex items-center justify-center bg-white rounded-lg p-1 mr-1">
                <GoogleIcon />
              </div>
              <span className="text-sm sm:text-base font-black uppercase tracking-[0.2em] text-white">
                Sign In
              </span>
            </Button>
            
            <div className="mt-12 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-center">
              <ShieldCheck className="h-3 w-3" />
              Authorized Personnel & Students Only
            </div>
          </CardContent>
        </Card>
        
        <div className="w-full text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 text-center">
          2026 NEW ERA UNIVERSITY
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><LoaderCircle className="h-14 w-14 animate-spin text-primary" /></div>}>
      <LoginContent />
    </Suspense>
  );
}