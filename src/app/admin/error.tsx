
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, RotateCcw, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin Dashboard Error:', error);
  }, [error]);

  const isPermissionError = error.message.includes('permission');

  return (
    <div className="flex min-h-screen items-center justify-center p-4 gradient-bg">
      <Card className="max-w-lg w-full glass border-2 border-primary/20 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Access Restricted</CardTitle>
          <CardDescription className="text-base mt-2">
            {isPermissionError 
              ? "You do not have administrative access to this dashboard. If you believe this is an error, please verify your 'role' in the Firestore users collection."
              : "There was a problem loading the analytics dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
            <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Error Details</p>
            <code className="text-xs text-foreground/80 break-all leading-relaxed">
              {error.message}
            </code>
          </div>
          {isPermissionError && (
            <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="font-bold text-blue-700 dark:text-blue-300 mb-1">💡 Troubleshooting Tip:</p>
              <p>Check the browser console (F12). If you see a link to "create a composite index," click it to enable cross-user sorting for these logs.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => reset()} 
            className="w-full sm:flex-1 h-12 text-base font-bold rounded-xl"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reload Dashboard
          </Button>
          <Button 
            asChild
            variant="outline"
            className="w-full sm:flex-1 h-12 text-base font-bold rounded-xl"
          >
            <Link href="/">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Visit Logger
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
