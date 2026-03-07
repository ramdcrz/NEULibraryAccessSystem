'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import Loading from '@/app/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, BarChart3, Info, AlertCircle } from 'lucide-react';
import { collectionGroup, query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  // Route Guard: Ensure user is an admin
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  // Simplified Query: Only order by timestamp DESC
  const logsQuery = useMemoFirebase(() => {
    if (!firestore || loading || !user || user.role !== 'admin') return null;
    
    // We use collectionGroup because visit_logs are nested: /users/{uid}/visit_logs/{id}
    return query(
      collectionGroup(firestore, 'visit_logs'), 
      orderBy('timestamp', 'desc')
    );
  }, [firestore, loading, user?.role]);

  const { data: allLogs, isLoading: logsLoading, error: logsError } = useCollection(logsQuery);

  if (loading || !user) {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col gradient-bg">
      <Header />
      <main className="flex-1 p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-sm">
            <ShieldCheck className="h-4 w-4" />
            Command Center
          </div>
          <h1 className="text-4xl font-black tracking-tight">Library Analytics</h1>
          <p className="text-muted-foreground text-lg">
            Direct database monitor for all visit logs.
          </p>
        </div>

        {logsError && (
          <Alert variant="destructive" className="glass border-2 border-destructive/20 shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-lg font-bold">Database Access Error</AlertTitle>
            <AlertDescription className="mt-4 space-y-6">
              <div className="bg-destructive/10 p-6 rounded-2xl border border-destructive/20 text-foreground">
                <p className="font-bold flex items-center gap-2 mb-4 text-lg">
                  <Info className="h-5 w-5" />
                  Crucial Step: Check Console (F12)
                </p>
                <p className="mb-4 leading-relaxed">
                  If the error mentions <strong>"Missing or insufficient permissions"</strong>, ensure your account is correctly set to 'admin' in Firestore.
                </p>
                <p className="mb-4 leading-relaxed">
                  If the error mentions <strong>"The query requires an index"</strong>, click the link in your browser console (F12) to create it.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card className="glass border-2 border-white/10 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5">
            <CardTitle className="text-xl font-bold">All Logs (Sorted by Date)</CardTitle>
            <CardDescription>Real-time stream from the entire database</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-4">
                <Loading />
                <p className="animate-pulse">Connecting to database...</p>
              </div>
            ) : !allLogs || allLogs.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-muted-foreground opacity-20" />
                </div>
                <h3 className="text-xl font-bold">No logs available</h3>
                <p className="text-muted-foreground">The database currently contains no visitor entries.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-bold">Timestamp</TableHead>
                      <TableHead className="font-bold">Email</TableHead>
                      <TableHead className="font-bold">Type</TableHead>
                      <TableHead className="font-bold">College / Office</TableHead>
                      <TableHead className="font-bold">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-white/5 transition-colors group">
                        <TableCell className="whitespace-nowrap font-medium opacity-80">
                          {log.timestamp ? format(log.timestamp.toDate(), 'MMM d, h:mm a') : '...'}
                        </TableCell>
                        <TableCell className="font-semibold">{log.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize bg-primary/5 text-primary border-primary/20">
                            {log.userType}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{log.college_office}</TableCell>
                        <TableCell className="max-w-[300px] leading-tight text-muted-foreground text-sm">
                          {log.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}