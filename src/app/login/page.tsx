'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookMarked, LoaderCircle, ShieldCheck } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Sign in failed:', error);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "Failed to verify your Google account. Please try again.",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };
  
  const GoogleIcon = () => (
    <svg className="h-6 w-6" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.658-3.397-11.303-8H4.388v5.385C7.743,39.957,15.28,44,24,44z"></path>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.02,35.23,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
  );

  if (loading || user) {
    return (
      <div className="flex h-screen items-center justify-center gradient-bg">
        <LoaderCircle className="h-14 w-14 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 gradient-bg">
      <div className="w-full max-w-md flex flex-col items-center justify-center gap-12">
        <Card className="w-full glass border border-black/5 dark:border-white/20 animate-in fade-in zoom-in-95 duration-700 shadow-2xl relative overflow-hidden">
          <CardHeader className="text-center pb-12 pt-10 px-10 relative z-10">
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] purple-gradient text-white transition-transform hover:rotate-6 shadow-lg shadow-primary/30">
              <BookMarked className="h-12 w-12" />
            </div>
            <CardTitle className="text-5xl font-black tracking-tighter text-purple-gradient mb-2">NEU Library</CardTitle>
            <CardDescription className="text-muted-foreground text-lg font-medium px-4">
              Access Management Terminal
            </CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-12 relative z-10">
            <Button
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="w-full h-16 text-lg font-black transition-all hover:bg-primary/[0.05] hover:border-primary/20 border-2 rounded-2xl gap-4 active:scale-95 shadow-sm"
              variant="outline"
            >
              {isAuthenticating ? (
                <LoaderCircle className="h-6 w-6 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              <span className="text-foreground">Official University Sign In</span>
            </Button>
            
            <div className="mt-12 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              <ShieldCheck className="h-3 w-3" />
              Authorized Personnel & Students Only
            </div>
          </CardContent>
        </Card>
        
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-muted-foreground/40 text-center px-8 py-3 rounded-full border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 w-full max-w-[450px] whitespace-nowrap">
          New Era University • Library Systems
        </p>
      </div>
    </main>
  );
}