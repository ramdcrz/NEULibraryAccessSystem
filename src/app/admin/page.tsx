'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import Loading from '@/app/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, History, Database, AlertCircle } from 'lucide-react';
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
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Simplified Admin Query: collectionGroup('visit_logs') ordered by timestamp
  const logsQuery = useMemoFirebase(() => {
    // Only attempt the query if we have a valid admin session
    if (!firestore || loading || !user || user.role !== 'admin') return null;
    
    // Explicitly hardcoding 'visit_logs' as a string literal to ensure path correctness
    return query(
      collectionGroup(firestore, 'visit_logs'), 
      orderBy('timestamp', 'desc')
    );
  }, [firestore, loading, user?.role, user?.uid]);

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
            Admin Dashboard
          </div>
          <h1 className="text-4xl font-black tracking-tight">University Visit History</h1>
          <p className="text-muted-foreground text-lg">
            Real-time administrative view of library access records.
          </p>
        </div>

        {logsError && (
          <Alert variant="destructive" className="glass border-2 border-destructive/20 shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-lg font-bold">Database Access Error</AlertTitle>
            <AlertDescription className="mt-4 space-y-4">
              <div className="bg-destructive/10 p-4 rounded-xl text-foreground">
                <p className="font-bold mb-2 text-lg flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Troubleshooting Checklist:
                </p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    <strong>Check Role:</strong> Ensure your user document in Firestore has <code>role: "admin"</code>.
                  </li>
                  <li>
                    <strong>Open Console:</strong> Press <strong>F12</strong> and find the red error message.
                  </li>
                  <li>
                    <strong>Create Index:</strong> Click the unique URL in the error message starting with <code>https://console.firebase.google.com...</code>
                  </li>
                  <li>
                    <strong>Query Scope:</strong> When creating the index, ensure <strong>"Collection Group"</strong> is selected.
                  </li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card className="glass border-2 border-white/10 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Live Visit Logs
              </CardTitle>
              <CardDescription>Recent activity across all departments</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">
                Fetching latest logs...
              </div>
            ) : !allLogs || allLogs.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                <h3 className="text-xl font-bold">No activity recorded</h3>
                <p className="text-muted-foreground">When users log their visits, they will appear here automatically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-bold">Date & Time</TableHead>
                      <TableHead className="font-bold">Email</TableHead>
                      <TableHead className="font-bold">Classification</TableHead>
                      <TableHead className="font-bold">College / Office</TableHead>
                      <TableHead className="font-bold">Purpose</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-white/5 transition-colors group">
                        <TableCell className="whitespace-nowrap font-medium opacity-80">
                          {log.timestamp ? format(log.timestamp.toDate(), 'MMM d, h:mm a') : 'Pending...'}
                        </TableCell>
                        <TableCell className="font-semibold">{log.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize bg-primary/5 text-primary border-primary/20 font-bold px-3">
                            {log.userType}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate italic opacity-80">{log.college_office}</TableCell>
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