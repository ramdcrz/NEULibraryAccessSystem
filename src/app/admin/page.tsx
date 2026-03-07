
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import Loading from '@/app/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, History, Database, AlertCircle, UserX, UserCheck, LoaderCircle } from 'lucide-react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { toggleUserBlock } from '@/lib/firebase/firestore';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();
  const [blockingUid, setBlockingUid] = useState<string | null>(null);

  // Route Guard: Ensure user is an admin
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  /**
   * Database Logic: Query the flat top-level collection 'visit_logs'.
   */
  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !user || user.role !== 'admin') return null;
    
    return query(
      collection(firestore, 'visit_logs'), 
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user?.uid, user?.role]);

  const { data: allLogs, isLoading: logsLoading, error: logsError } = useCollection(logsQuery);

  const handleToggleBlock = async (uid: string, email: string) => {
    if (email === user?.email) {
      toast({
        variant: "destructive",
        title: "Action Denied",
        description: "You cannot block your own administrative account.",
      });
      return;
    }

    setBlockingUid(uid);
    try {
      const isNowBlocked = await toggleUserBlock(uid);
      toast({
        title: isNowBlocked ? "User Blocked" : "User Restored",
        description: `${email} has been ${isNowBlocked ? 'denied' : 'granted'} access to the library system.`,
      });
    } catch (error: any) {
      console.error('Failed to toggle block status:', error);
      toast({
        variant: "destructive",
        title: "System Error",
        description: error.message || "Failed to update user status.",
      });
    } finally {
      setBlockingUid(null);
    }
  };

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
            Real-time administrative view of library access records and user management.
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
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  <li>
                    <strong>Index Required:</strong> This view requires a Composite Index on the <code>visit_logs</code> collection.
                  </li>
                  <li>
                    <strong>Check Console:</strong> Press F12 and click the Firebase link to generate the required index.
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
                      <TableHead className="font-bold text-center">Actions</TableHead>
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
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive font-bold rounded-xl gap-2 transition-all active:scale-95"
                            onClick={() => handleToggleBlock(log.userId, log.email)}
                            disabled={blockingUid === log.userId}
                          >
                            {blockingUid === log.userId ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserX className="h-4 w-4" />
                                Block
                              </>
                            )}
                          </Button>
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
