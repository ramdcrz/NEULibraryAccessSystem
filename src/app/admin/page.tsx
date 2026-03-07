'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import Loading from '@/app/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ShieldCheck, 
  AlertCircle, 
  UserX, 
  UserCheck, 
  LoaderCircle, 
  FileDown, 
  Search, 
  Calendar as CalendarIcon, 
  XCircle,
  Filter,
  BarChart3,
  Users,
  Clock
} from 'lucide-react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { toggleUserBlock } from '@/lib/firebase/firestore';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  const [blockingUid, setBlockingUid] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !user || user.role !== 'admin') return null;
    return query(
      collection(firestore, 'visit_logs'), 
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user?.uid, user?.role]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user || user.role !== 'admin') return null;
    return collection(firestore, 'users');
  }, [firestore, user?.uid, user?.role]);

  const { data: allLogs, isLoading: logsLoading, error: logsError } = useCollection(logsQuery);
  const { data: allUsers } = useCollection(usersQuery);

  const stats = useMemo(() => {
    if (!allLogs) return { total: 0, today: 0, unique: 0 };
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const uniqueUids = new Set(allLogs.map(l => l.uid));
    const todayLogs = allLogs.filter(l => l.entryDate === todayStr);
    return {
      total: allLogs.length,
      today: todayLogs.length,
      unique: uniqueUids.size
    };
  }, [allLogs]);

  const userStatusMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    allUsers?.forEach(u => {
      map[u.id] = !!u.isBlocked;
    });
    return map;
  }, [allUsers]);

  const filteredLogs = useMemo(() => {
    if (!allLogs) return [];
    
    return allLogs.filter(log => {
      const emailMatch = log.email.toLowerCase().includes(searchQuery.toLowerCase());
      let dateMatch = true;
      if (log.timestamp) {
        const logDate = log.timestamp.toDate();
        if (startDate && isBefore(logDate, startOfDay(startDate))) dateMatch = false;
        if (endDate && isAfter(logDate, endOfDay(endDate))) dateMatch = false;
      }
      return emailMatch && dateMatch;
    });
  }, [allLogs, searchQuery, startDate, endDate]);

  const handleToggleBlock = async (uid: string, email: string) => {
    if (!uid) {
      toast({ variant: "destructive", title: "Missing Data", description: "Cannot identify user UID." });
      return;
    }
    if (email === user?.email) {
      toast({ variant: "destructive", title: "Action Denied", description: "You cannot block yourself." });
      return;
    }

    setBlockingUid(uid);
    try {
      const isNowBlocked = await toggleUserBlock(uid);
      toast({
        title: isNowBlocked ? "User Blocked" : "User Restored",
        description: `${email} access status updated.`,
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "System Error", description: error.message });
    } finally {
      setBlockingUid(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const exportToPDF = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast({ variant: "destructive", title: "Export Failed", description: "No records to export." });
      return;
    }

    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      
      doc.setFontSize(22);
      doc.setTextColor(30, 58, 138);
      doc.text('NEU Library Access System', 14, 22);
      
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('University Visit Activity Report', 14, 32);
      
      let filterSummary = 'Applied Filters: ';
      const filterParts = [];
      if (searchQuery) filterParts.push(`Search: "${searchQuery}"`);
      if (startDate) filterParts.push(`From: ${format(startDate, 'PP')}`);
      if (endDate) filterParts.push(`To: ${format(endDate, 'PP')}`);
      filterSummary += filterParts.length > 0 ? filterParts.join(' | ') : 'None (Full History)';
      
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(filterSummary, 14, 40);
      
      const tableRows = filteredLogs.map(log => [
        log.timestamp ? format(log.timestamp.toDate(), 'MMM d, yyyy h:mm a') : 'Pending...',
        log.email,
        log.userType,
        log.college_office,
        log.reason
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Date & Time', 'Email', 'User Type', 'College / Office', 'Purpose']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 }
      });

      doc.save(`NEULibrary_Visit_Logs_${currentDate}.pdf`);
      toast({ title: "Report Generated", description: "PDF report downloaded." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Export Error", description: "Failed to generate PDF." });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading || !user || user.role !== 'admin') {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col gradient-bg">
      <Header />
      <main className="flex-1 px-6 md:px-12 py-12 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.4em] text-[10px] opacity-60">
              <ShieldCheck className="h-3.5 w-3.5" />
              Administrative Command
            </div>
            <h1 className="text-6xl font-black tracking-tighter">
              Terminal Analytics
            </h1>
            <p className="text-muted-foreground text-xl font-bold opacity-70 tracking-tight">
              Real-time monitoring and security reporting.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "h-11 px-6 font-black text-[10px] uppercase tracking-widest rounded-full transition-all border shadow-sm",
                showFilters 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "border-black/5 dark:border-white/10 bg-white/5 hover:bg-primary/10 hover:text-primary"
              )}
            >
              <Search className="h-3.5 w-3.5 mr-2" />
              {showFilters ? 'Hide Filters' : 'Filter View'}
            </Button>

            <Button 
              onClick={exportToPDF} 
              disabled={isExporting || logsLoading || filteredLogs.length === 0}
              className="h-11 px-6 font-black text-[10px] uppercase tracking-widest rounded-full transition-all border border-black/5 dark:border-white/10 bg-white/5 shadow-sm hover:bg-primary/10 disabled:opacity-50 group"
            >
              {isExporting ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin mr-2 text-primary" />
              ) : (
                <FileDown className="h-3.5 w-3.5 mr-2 text-primary" />
              )}
              <span className="text-purple-gradient">Export Activity</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Total Visits', val: stats.total, icon: BarChart3 },
            { label: 'Today', val: stats.today, icon: Clock },
            { label: 'Verified Reach', val: stats.unique, icon: Users }
          ].map((stat, i) => (
            <Card key={i} className="glass rounded-[3rem] p-8 relative overflow-hidden group border border-black/5 dark:border-white/18">
              <div className="absolute -bottom-8 -right-8 opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-700 rotate-12 group-hover:rotate-6">
                <stat.icon className="h-32 w-32 text-primary" />
              </div>
              <CardDescription className="text-[11px] font-black uppercase tracking-[0.3em] opacity-50 mb-3 relative z-10">{stat.label}</CardDescription>
              <CardTitle className="text-5xl font-black tracking-tighter relative z-10">{stat.val}</CardTitle>
            </Card>
          ))}
        </div>

        {showFilters && (
          <Card className="glass rounded-[3rem] p-10 border border-black/5 dark:border-white/18">
            <div className="flex flex-col lg:flex-row gap-8 items-end">
              <div className="flex-1 w-full space-y-4">
                <label className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground px-1 flex items-center gap-2">
                  <Search className="h-3.5 w-3.5" />
                  Terminal Identity Search
                </label>
                <Input
                  placeholder="Search by email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-16 rounded-2xl border-2 bg-black/5 transition-all text-lg font-bold focus:border-primary/30"
                />
              </div>

              <div className="flex gap-4 w-full lg:w-auto">
                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground px-1 flex items-center gap-2">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    Start Date
                  </label>
                  <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full lg:w-[200px] h-12 justify-start text-left font-bold rounded-xl border-2 bg-black/5 hover:bg-black/10 transition-colors",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-3 h-4 w-4" />
                        {startDate ? format(startDate, "PP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-[2rem] border glass shadow-2xl" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date);
                          setIsStartOpen(false);
                          if (!endDate || (date && isBefore(endDate, date))) {
                            setIsEndOpen(true);
                          }
                        }}
                        disabled={(date) => endDate ? isAfter(date, endOfDay(endDate)) : false}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground px-1 flex items-center gap-2">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    End Date
                  </label>
                  <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full lg:w-[200px] h-12 justify-start text-left font-bold rounded-xl border-2 bg-black/5 hover:bg-black/10 transition-colors",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-3 h-4 w-4" />
                        {endDate ? format(endDate, "PP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-[2rem] border glass shadow-2xl" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date);
                          setIsEndOpen(false);
                        }}
                        disabled={(date) => startDate ? isBefore(date, startOfDay(startDate)) : false}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button 
                variant="ghost" 
                onClick={clearFilters}
                className="h-11 px-6 font-black text-[10px] uppercase tracking-widest rounded-full transition-all border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 shadow-sm"
              >
                <XCircle className="h-3.5 w-3.5 mr-2" />
                Clear
              </Button>
            </div>
          </Card>
        )}

        {logsError && (
          <Alert variant="destructive" className="glass rounded-[3rem] p-10 border border-destructive/20 shadow-xl">
            <AlertCircle className="h-8 w-8" />
            <AlertTitle className="text-2xl font-black ml-4">Terminal Error</AlertTitle>
            <AlertDescription className="mt-4 text-lg font-bold opacity-80">
              Database indexing required. Contact system administrator.
            </AlertDescription>
          </Alert>
        )}

        <Card className="glass overflow-hidden rounded-[3rem] border border-black/5 dark:border-white/18">
          <CardHeader className="p-10 border-b border-black/5 dark:border-white/10 bg-black/5">
            <div className="flex items-center gap-5">
              <div className="p-3.5 rounded-2xl bg-primary/10 text-primary border border-black/5 dark:border-white/10 shadow-inner">
                <Filter className="h-7 w-7" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black tracking-tighter">
                  Activity Stream
                </CardTitle>
                <CardDescription className="text-sm font-bold opacity-60 mt-1">
                  {searchQuery || startDate || endDate 
                    ? `Showing ${filteredLogs.length} matching entries`
                    : `System-wide historical logs`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-32 flex flex-col items-center justify-center gap-6">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary/30" />
                <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30">Decrypting Sync...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-40 text-center flex flex-col items-center gap-8">
                <div className="p-8 rounded-full bg-black/5 border border-black/5">
                  <Search className="h-12 w-12 text-muted-foreground opacity-20" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tight text-foreground">Zero Activity Found</h3>
                  <p className="text-muted-foreground text-lg font-bold opacity-70">Adjust filters to display terminal data.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-black/5">
                    <TableRow className="hover:bg-transparent border-black/5 dark:border-white/10">
                      <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 pl-10 text-foreground">Timestamp</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-foreground">Verified Identity</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-foreground">Classification</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-foreground">Purpose</TableHead>
                      <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-center pr-10 text-foreground">Control</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const isBlocked = userStatusMap[log.uid] || false;
                      
                      return (
                        <TableRow key={log.id} className="hover:bg-primary/[0.04] dark:hover:bg-white/5 transition-colors border-black/5 dark:border-white/10 group">
                          <TableCell className="pl-10 py-6 whitespace-nowrap font-bold text-muted-foreground/70">
                            {log.timestamp ? format(log.timestamp.toDate(), 'MMM d, h:mm a') : '...'}
                          </TableCell>
                          <TableCell className="font-black text-foreground">
                            <div className="flex flex-col">
                              <span>{log.email}</span>
                              <span className="text-[10px] opacity-40 uppercase tracking-widest mt-1">{log.college_office}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="w-32 justify-center rounded-xl py-1.5 font-black text-[10px] uppercase tracking-widest bg-black/5 border-black/5 dark:border-white/10 text-primary shadow-sm">
                              {log.userType}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate font-bold text-foreground/80">
                            {log.reason}
                          </TableCell>
                          <TableCell className="text-center pr-10">
                            <Button
                              variant="ghost"
                              className={cn(
                                "h-11 w-32 font-black text-[10px] uppercase tracking-widest rounded-full transition-all border shadow-sm",
                                isBlocked 
                                  ? "text-green-600 bg-green-500/10 border-green-500/20 hover:bg-green-500/20" 
                                  : "text-destructive bg-destructive/5 border-destructive/10 hover:bg-destructive/10"
                              )}
                              onClick={() => handleToggleBlock(log.uid, log.email)}
                              disabled={blockingUid === log.uid}
                            >
                              {blockingUid === log.uid ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : isBlocked ? (
                                <>
                                  <UserCheck className="h-3.5 w-3.5 mr-2" />
                                  Restore
                                </>
                              ) : (
                                <>
                                  <UserX className="h-3.5 w-3.5 mr-2" />
                                  Block
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
