'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RotateCcw, Home, Info } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Error Boundary:', error);
  }, [error]);

  const isPermissionError = error.message.toLowerCase().includes('permission') || error.name === 'FirebaseError';
  const isIndexError = error.message.toLowerCase().includes('index');

  return (
    <div className="flex min-h-screen items-center justify-center p-4 gradient-bg">
      <Card className="max-w-xl w-full glass border-2 border-destructive/20 shadow-2xl rounded-[2rem]">
        <CardHeader className="text-center pt-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl font-black tracking-tighter">System Interruption</CardTitle>
          <CardDescription className="text-base mt-2 font-medium opacity-70 px-6">
            {isPermissionError 
              ? "It looks like you don't have permission to perform this action. If you're an Admin, please ensure your account is correctly configured."
              : "An unexpected error occurred while loading this page."}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-10 pb-10 space-y-6">
          <div className="bg-muted/50 p-6 rounded-2xl overflow-auto max-h-48 border border-black/5 dark:border-white/10 shadow-inner">
            <code className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {error.message}
            </code>
          </div>

          {(isPermissionError || isIndexError) && (
            <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-700">
              <p className="font-black text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center bg-blue-500 text-white rounded-full w-4 h-4 text-[9px]">!</span>
                System Troubleshooting
              </p>
              <p className="font-medium mb-3">If you see a link starting with <code>https://console.firebase.google.com...</code> in the terminal console (F12), the system needs a **Composite Index**.</p>
              <ol className="list-decimal pl-5 space-y-2 text-xs font-bold opacity-80">
                <li>Open the browser console (<strong>F12</strong>).</li>
                <li>Find the red error and click the provided Firebase Console link.</li>
                <li>Click <strong>"Create Index"</strong> and wait 3-5 minutes for activation.</li>
              </ol>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4 px-10 pb-10">
          <Button 
            onClick={() => reset()} 
            className="w-full sm:flex-1 h-14 text-sm font-black rounded-2xl blue-gradient text-white border-none shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reload Access System
          </Button>
          <Button 
            asChild
            variant="outline"
            className="w-full sm:flex-1 h-14 text-sm font-black rounded-2xl border-2 hover:bg-black/5 transition-all"
          >
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Return Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
