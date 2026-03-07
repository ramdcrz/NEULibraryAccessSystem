'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for developer awareness
    console.error('Global Error Boundary:', error);
  }, [error]);

  const isPermissionError = error.message.includes('permission') || error.name === 'FirebaseError';

  return (
    <div className="flex min-h-screen items-center justify-center p-4 gradient-bg">
      <Card className="max-w-md w-full glass border-2 border-destructive/20 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl font-bold">Something went wrong</CardTitle>
          <CardDescription className="text-base mt-2">
            {isPermissionError 
              ? "It looks like you don't have permission to perform this action. If you're an Admin, please ensure your account is correctly configured."
              : "An unexpected error occurred while loading this page."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg overflow-auto max-h-48">
            <code className="text-xs text-muted-foreground whitespace-pre-wrap">
              {error.message}
            </code>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => reset()} 
            className="w-full sm:flex-1 h-12 text-sm font-black rounded-full"
            variant="default"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button 
            asChild
            className="w-full sm:flex-1 h-12 text-sm font-black rounded-full"
            variant="outline"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
