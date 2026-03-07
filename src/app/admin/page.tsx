
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import Loading from '@/app/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Users, BarChart3, History, Search, Calendar as CalendarIcon, TrendingUp } from 'lucide-react';
import { collectionGroup, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useCollection, useMemoFirebase } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { format, isWithinInterval, subDays, startOfDay, endOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { VisitLog } from '@/types';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Fetch all logs across all users using collectionGroup
  const logsQuery = useMemoFirebase(() => {
    return query(collectionGroup(db, 'visit_logs'), orderBy('timestamp', 'desc'), limit(200));
  }, []);

  const { data: allLogs, isLoading: logsLoading } = useCollection<VisitLog>(logsQuery);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  // Derived filtered data based on Search and Date Range
  const filteredLogs = useMemo(() => {
    if (!allLogs) return [];
    
    return allLogs.filter(log => {
      // Search Filter (Email)
      const matchesSearch = searchQuery === '' || log.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Date Range Filter
      let matchesDate = true;
      if (log.timestamp) {
        const logDate = log.timestamp.toDate();
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

  // Analytics Calculations
  const stats = useMemo(() => {
    if (!allLogs) return { today: 0, topCollege: 'N/A', topReason: 'N/A' };

    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = allLogs.filter(l => l.entryDate === todayStr);

    // Frequency Analysis for Colleges
    const collegeFreq: Record<string, number> = {};
    const reasonFreq: Record<string, number> = {};

    allLogs.forEach(log => {
      if (log.college_office) collegeFreq[log.college_office] = (collegeFreq[log.college_office] || 0) + 1;
      if (log.reason) reasonFreq[log.reason] = (reasonFreq[log.reason] || 0) + 1;
    });

    const getTop = (freq: Record<string, number>) => {
      return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    };

    return {
      today: todayLogs.length,
      topCollege: getTop(collegeFreq),
      topReason: getTop(reasonFreq)
    };
  }, [allLogs]);

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
          <h1 className="text-4xl font-black tracking-tight">Library Analytics</h1>
          <p className="text-muted-foreground text-lg">
            Monitor traffic and analyze visitor trends in real-time.
          </p>
        </div>

        {/* Analytics Header Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass border-2 border-white/10 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Traffic</CardTitle>
              <div className="p-2 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
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
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold truncate" title={stats.topCollege}>{stats.topCollege}</div>
              <p className="text-xs text-muted-foreground mt-1">Highest frequency of visits</p>
            </CardContent>
          </Card>

          <Card className="glass border-2 border-white/10 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Common Reason</CardTitle>
              <div className="p-2 rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <History className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold truncate" title={stats.topReason}>{stats.topReason}</div>
              <p className="text-xs text-muted-foreground mt-1">Most frequent purpose</p>
            </CardContent>
          </Card>
        </div>

        {/* Unified Visitor Table with Filters */}
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
                    placeholder="Search by exact email..." 
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
                <p>Retrieving database logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-muted-foreground opacity-20" />
                </div>
                <h3 className="text-xl font-bold">No logs found</h3>
                <p className="text-muted-foreground">Adjust your search or range filters.</p>
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
