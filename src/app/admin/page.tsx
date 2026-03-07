
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import Loading from '@/app/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Users, BarChart3, History, Search } from 'lucide-react';
import { collectionGroup, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useCollection, useMemoFirebase } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { VisitLog } from '@/types';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Performance Optimization: Fetch data using collectionGroup with real-time updates
  const logsQuery = useMemoFirebase(() => {
    return query(collectionGroup(db, 'visit_logs'), orderBy('timestamp', 'desc'), limit(50));
  }, []);

  const { data: logs, isLoading: logsLoading } = useCollection<VisitLog>(logsQuery);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return <Loading />;
  }

  // Filter logic for searching by email or reason
  const filteredLogs = logs?.filter(log => 
    log.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.college_office.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const stats = [
    { 
      title: 'Recent Visits', 
      value: logs?.length || 0, 
      icon: History, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100' 
    },
    { 
      title: 'Active Today', 
      value: logs?.filter(l => l.entryDate === new Date().toISOString().split('T')[0]).length || 0, 
      icon: Users, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-100' 
    },
    { 
      title: 'Data Reliability', 
      value: '100%', 
      icon: ShieldCheck, 
      color: 'text-green-600', 
      bg: 'bg-green-100' 
    },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col gradient-bg">
      <Header />
      <main className="flex-1 p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-sm">
            <ShieldCheck className="h-4 w-4" />
            Administrator Portal
          </div>
          <h1 className="text-4xl font-black tracking-tight">Library Analytics</h1>
          <p className="text-muted-foreground text-lg">
            Real-time insights into library usage and visitor logs.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="glass border-2 border-white/10 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="glass border-2 border-white/10 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold">Recent Visitor Logs</CardTitle>
                <CardDescription>Comprehensive list of library entries</CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search email, college, or reason..." 
                  className="pl-10 glass border-2"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading visitor data...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No data found</h3>
                <p className="text-muted-foreground">Try adjusting your search filters or check back later.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-bold">Date & Time</TableHead>
                      <TableHead className="font-bold">Email</TableHead>
                      <TableHead className="font-bold">Type</TableHead>
                      <TableHead className="font-bold">College / Office</TableHead>
                      <TableHead className="font-bold">Reason for Visit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-white/5 transition-colors">
                        <TableCell className="whitespace-nowrap font-medium">
                          {log.timestamp ? format(log.timestamp.toDate(), 'MMM d, h:mm a') : '...'}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate" title={log.email}>
                          {log.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {log.userType}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={log.college_office}>
                          {log.college_office}
                        </TableCell>
                        <TableCell className="max-w-[250px] break-words">
                          <span className="text-muted-foreground" title={log.reason}>
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
