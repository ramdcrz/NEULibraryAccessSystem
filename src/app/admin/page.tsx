'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import Loading from '@/app/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Users, BarChart3, History, Search, Calendar as CalendarIcon, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { collectionGroup, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { format, isWithinInterval, subDays, startOfDay, endOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Defensive Auth Check: Wait for the user object and role to be fully loaded
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'admin') {
        // Only mark as ready if we are sure the user is an admin
        setIsAuthReady(true);
      } else {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  // Guard the query: NEVER run if auth is not fully confirmed
  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthReady || !user || user.role !== 'admin') return null;
    
    // collectionGroup allows querying across all users/userId/visit_logs
    return query(
      collectionGroup(firestore, 'visit_logs'), 
      orderBy('timestamp', 'desc'), 
      limit(300)
    );
  }, [firestore, isAuthReady, user?.role]);

  const { data: allLogs, isLoading: logsLoading, error: logsError } = useCollection(logsQuery);

  const filteredLogs = useMemo(() => {
    if (!allLogs) return [];
    
    return allLogs.filter(log => {
      const matchesSearch = searchQuery === '' || 
        log.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.college_office && log.college_office.toLowerCase().includes(searchQuery.toLowerCase()));
      
      let matchesDate = true;
      if (log.timestamp && dateFilter !== 'all') {
        const logDate = log.timestamp instanceof Timestamp ? log.timestamp.toDate() : (log.timestamp as any).toDate?.() || new Date(log.timestamp);
        const now = new Date();
        
        if (dateFilter === 'today') {
          matchesDate = isWithinInterval(logDate, { start: startOfDay(now), end: endOfDay(now) });
        } else if (dateFilter === 'week') {
          matchesDate = isWithinInterval(logDate, { start: subDays(now, 7), end: now });
        } else if (dateFilter === 'month') {
          matchesDate = isWithinInterval(logDate, { start: subDays(now, 30), end: now });
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [allLogs, searchQuery, dateFilter]);

  const stats = useMemo(() => {
    if (!allLogs || allLogs.length === 0) return { today: 0, topCollege: 'N/A', topReason: 'N/A' };

    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = allLogs.filter(l => l.entryDate === todayStr);

    const collegeFreq: Record<string, number> = {};
    const reasonFreq: Record<string, number> = {};

    allLogs.forEach(log => {
      if (log.college_office) collegeFreq[log.college_office] = (collegeFreq[log.college_office] || 0) + 1;
      if (log.reason) reasonFreq[log.reason] = (reasonFreq[log.reason] || 0) + 1;
    });

    const getTop = (freq: Record<string, number>) => {
      const entries = Object.entries(freq);
      if (entries.length === 0) return 'N/A';
      return entries.sort((a, b) => b[1] - a[1])[0][0];
    };

    return {
      today: todayLogs.length,
      topCollege: getTop(collegeFreq),
      topReason: getTop(reasonFreq)
    };
  }, [allLogs]);

  if (loading || !isAuthReady) {
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
            Monitor library traffic and analyze visitor trends.
          </p>
        </div>

        {logsError && (
          <Alert variant="destructive" className="glass border-2 border-destructive/20 shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Database Access Error</AlertTitle>
            <AlertDescription className="mt-2 space-y-4">
              <p>
                We encountered a problem retrieving the visitor logs. This is usually caused by a missing Database Index.
              </p>
              <div className="bg-destructive/10 p-4 rounded-xl border border-destructive/20 text-foreground">
                <p className="font-bold flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4" />
                  Crucial Step to Fix:
                </p>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  <li>Press <strong>F12</strong> to open your browser Developer Tools.</li>
                  <li>Click the <strong>Console</strong> tab.</li>
                  <li>Look for a red error message with a link starting with <code>https://console.firebase.google.com/...</code></li>
                  <li><strong>Click that link</strong> to automatically create the required index in your Firebase Console.</li>
                  <li>Wait 3 minutes for it to build, then refresh this page.</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass border-2 border-white/10 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Traffic</CardTitle>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.today}</div>
              <p className="text-xs text-muted-foreground mt-1">Visitors logged today</p>
            </CardContent>
          </Card>

          <Card className="glass border-2 border-white/10 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top College</CardTitle>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold truncate" title={stats.topCollege}>{stats.topCollege}</div>
              <p className="text-xs text-muted-foreground mt-1">Most frequent affiliation</p>
            </CardContent>
          </Card>

          <Card className="glass border-2 border-white/10 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Common Reason</CardTitle>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <History className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold truncate" title={stats.topReason}>{stats.topReason}</div>
              <p className="text-xs text-muted-foreground mt-1">Primary purpose of visits</p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass border-2 border-white/10 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold">Unified Visitor Logs</CardTitle>
                <CardDescription>Historical data for all library entries</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search email or college..." 
                    className="pl-10 h-10 glass border-2"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
                  <SelectTrigger className="w-full sm:w-40 h-10 glass border-2">
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Past 7 Days</SelectItem>
                    <SelectItem value="month">Past 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-4">
                <Loading />
                <p className="animate-pulse">Retrieving database logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-muted-foreground opacity-20" />
                </div>
                <h3 className="text-xl font-bold">No logs found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters.</p>
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
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-white/5 transition-colors group">
                        <TableCell className="whitespace-nowrap font-medium opacity-80">
                          {log.timestamp ? format(log.timestamp.toDate(), 'MMM d, h:mm a') : '...'}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate font-semibold" title={log.email}>
                          {log.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize bg-primary/5 text-primary border-primary/20">
                            {log.userType}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={log.college_office}>
                          {log.college_office}
                        </TableCell>
                        <TableCell className="max-w-[250px] leading-tight">
                          <span className="text-muted-foreground text-sm" title={log.reason}>
                            {log.reason}
                          </span>
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