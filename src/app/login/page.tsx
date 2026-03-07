'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookMarked, LoaderCircle } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };
  
  const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.658-3.397-11.303-8H4.388v5.385C7.743,39.957,15.28,44,24,44z"></path>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.02,35.23,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
  );

  if (loading || user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 gradient-bg">
      <Card className="w-full max-w-md glass border-2 border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner rotate-3 transition-transform hover:rotate-0">
            <BookMarked className="h-10 w-10" />
          </div>
          <CardTitle className="text-4xl font-black tracking-tight text-foreground">NEU Library</CardTitle>
          <CardDescription className="text-muted-foreground text-lg mt-2">Sign in to log your visit</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSignIn}
            className="w-full h-14 text-lg font-bold transition-all hover:bg-primary/5 hover:text-primary hover:border-primary/50 border-2 rounded-2xl gap-3"
            variant="outline"
          >
            <GoogleIcon />
            <span>Sign in with Google</span>
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-6 opacity-60">
            New Era University Library Access Management System
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
