'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import Loading from '@/app/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Info, AlertCircle, Database } from 'lucide-react';
import { collectionGroup, query, orderBy, limit } from 'firebase/firestore';
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
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Simplified and Robust Query
  const logsQuery = useMemoFirebase(() => {
    // ONLY attempt query if we are fully loaded and confirmed as an admin
    if (!firestore || loading || !user || user.role !== 'admin') return null;
    
    // We start with a simple sorted query. 
    // If this fails with a Permission error, it's a Rule issue.
    // If it fails with an Index error, it will provide the correct link in F12 console.
    return query(
      collectionGroup(firestore, 'visit_logs'), 
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [firestore, loading, user?.role]);

  const { data: allLogs, isLoading: logsLoading, error: logsError } = useCollection(logsQuery);

  if (loading || !user || user.role !== 'admin') {
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
          <h1 className="text-4xl font-black tracking-tight">Visit Monitor</h1>
          <p className="text-muted-foreground text-lg">
            Real-time administrative view of all library access logs.
          </p>
        </div>

        {logsError && (
          <Alert variant="destructive" className="glass border-2 border-destructive/20 shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-lg font-bold">Database Access Error</AlertTitle>
            <AlertDescription className="mt-4 space-y-6">
              <div className="bg-destructive/10 p-6 rounded-2xl border border-destructive/20 text-foreground">
                <p className="font-bold flex items-center gap-2 mb-4 text-lg">
                  <Database className="h-5 w-5" />
                  Resolution Steps:
                </p>
                <ol className="list-decimal pl-5 space-y-4">
                  <li>
                    <strong>Check the Console:</strong> Press <strong>F12</strong> and look for a red error message.
                  </li>
                  <li>
                    <strong>Create Index:</strong> If you see "The query requires an index," <strong>click the link</strong> provided in that console message.
                  </li>
                  <li>
                    <strong>Verify Scope:</strong> When creating the index manually, ensure the <strong>Query Scope</strong> is set to <strong>"Collection Group"</strong> (not just "Collection").
                  </li>
                  <li>
                    <strong>Permissions:</strong> If the error is still "Missing Permissions," double-check that your UID <code>{user.uid}</code> has <code>role: "admin"</code> in the <code>users</code> collection.
                  </li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card className="glass border-2 border-white/10 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5">
            <CardTitle className="text-xl font-bold">All Logs (Sorted by Date)</CardTitle>
            <CardDescription>Streaming logs from across all user profiles</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-12 text-center text-muted-foreground animate-pulse">
                Establishing secure connection...
              </div>
            ) : !allLogs || allLogs.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                <h3 className="text-xl font-bold">No logs found</h3>
                <p className="text-muted-foreground">The system is ready, but no visit entries were found in the database.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-bold">Timestamp</TableHead>
                      <TableHead className="font-bold">Email</TableHead>
                      <TableHead className="font-bold">User Type</TableHead>
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
                        <TableCell className="max-w-[300px] truncate text-muted-foreground">
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