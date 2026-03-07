'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import Loading from '@/app/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ShieldCheck, 
  Database, 
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
  CalendarDays,
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();
  
  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Popover control
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  const [blockingUid, setBlockingUid] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Route Guard
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

  // Stats calculation
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
      <main className="flex-1 p-6 md:p-12 space-y-10 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px] opacity-60">
              <ShieldCheck className="h-3.5 w-3.5" />
              Administrative Terminal
            </div>
            <h1 className="text-5xl font-black tracking-tighter">
              Access Analytics
            </h1>
            <p className="text-muted-foreground text-lg font-medium opacity-80">
              Real-time campus security monitoring and reporting.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 px-6 rounded-2xl font-bold gap-2 transition-all border-2"
            >
              <Search className="h-4 w-4" />
              {showFilters ? 'Close' : 'Filter'}
            </Button>

            <Button 
              onClick={exportToPDF} 
              disabled={isExporting || logsLoading || filteredLogs.length === 0}
              className="h-12 px-6 rounded-2xl font-black gap-2 shadow-xl shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98] glow-primary"
            >
              {isExporting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Export PDF
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass border-none rounded-[2rem] overflow-hidden relative group">
            <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <BarChart3 className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Total Logs</CardDescription>
              <CardTitle className="text-4xl font-black">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-[10px] font-bold text-primary/60 tracking-widest uppercase">
                <Database className="h-3 w-3" />
                Lifetime entries
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-none rounded-[2rem] overflow-hidden relative group">
            <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Clock className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Activity Today</CardDescription>
              <CardTitle className="text-4xl font-black">{stats.today}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-[10px] font-bold text-green-600/60 tracking-widest uppercase">
                <CalendarDays className="h-3 w-3" />
                New registrations
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-none rounded-[2rem] overflow-hidden relative group">
            <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Unique Reach</CardDescription>
              <CardTitle className="text-4xl font-black">{stats.unique}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600/60 tracking-widest uppercase">
                <ShieldCheck className="h-3 w-3" />
                Verified accounts
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <Card className="glass border-none shadow-2xl rounded-[2.5rem] overflow-hidden animate-in slide-in-from-top-4 duration-500">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row gap-6 items-end">
                <div className="flex-1 w-full space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                    <Search className="h-3 w-3" />
                    Identity Search
                  </label>
                  <Input
                    placeholder="Search by email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-14 rounded-2xl border-2 bg-background/20 focus:border-primary/50 transition-all text-base font-medium"
                  />
                </div>

                <div className="w-full lg:w-auto space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3" />
                    From
                  </label>
                  <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full lg:w-[220px] h-14 justify-start text-left font-bold rounded-2xl border-2 bg-background/20",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-3xl shadow-2xl border-none glass" align="start">
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
                        disabled={(date) => 
                          endDate ? isAfter(date, endOfDay(endDate)) : false
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="w-full lg:w-auto space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3" />
                    To
                  </label>
                  <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full lg:w-[220px] h-14 justify-start text-left font-bold rounded-2xl border-2 bg-background/20",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-3xl shadow-2xl border-none glass" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date);
                          setIsEndOpen(false);
                        }}
                        disabled={(date) => 
                          startDate ? isBefore(date, startOfDay(startDate)) : false
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex gap-2 w-full lg:w-auto">
                  <Button 
                    variant="ghost" 
                    onClick={clearFilters}
                    disabled={!searchQuery && !startDate && !endDate}
                    className="h-14 px-6 rounded-2xl font-black gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {logsError && (
          <Alert variant="destructive" className="glass border-none shadow-2xl rounded-3xl p-6">
            <AlertCircle className="h-6 w-6" />
            <AlertTitle className="text-xl font-black ml-2">Configuration Required</AlertTitle>
            <AlertDescription className="mt-4 opacity-90">
              The database requires a composite index to perform the requested sort and filter operations. Please visit the Firebase Console to create it.
            </AlertDescription>
          </Alert>
        )}

        <Card className="glass border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
          <CardHeader className="p-8 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/5 text-primary">
                <Filter className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black">
                  Activity History
                </CardTitle>
                <CardDescription className="text-sm font-medium opacity-60">
                  {searchQuery || startDate || endDate 
                    ? `Displaying ${filteredLogs.length} filtered results`
                    : `System-wide historical logs`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary opacity-30" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Syncing Data...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-32 text-center flex flex-col items-center gap-6">
                <div className="p-6 rounded-full bg-muted/20">
                  <Search className="h-10 w-10 text-muted-foreground opacity-20" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black">No Results Found</h3>
                  <p className="text-muted-foreground font-medium opacity-60">Adjust your filters to see historical data.</p>
                </div>
                <Button variant="outline" onClick={clearFilters} className="rounded-xl font-black border-2 h-11 px-6">Clear All Filters</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow className="hover:bg-transparent border-white/5">
                      <TableHead className="font-black text-[10px] uppercase tracking-widest h-14 pl-8">Timestamp</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest h-14">Identity</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest h-14">Department</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest h-14">Class</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest h-14">Purpose</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest h-14 text-center pr-8">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const isBlocked = userStatusMap[log.uid] || false;
                      
                      return (
                        <TableRow key={log.id} className="hover:bg-white/[0.02] transition-colors border-white/5 group">
                          <TableCell className="pl-8 py-5 whitespace-nowrap font-bold text-muted-foreground/60 group-hover:text-foreground transition-colors">
                            {log.timestamp ? format(log.timestamp.toDate(), 'MMM d, h:mm a') : '...'}
                          </TableCell>
                          <TableCell className="font-black text-foreground">{log.email}</TableCell>
                          <TableCell className="text-muted-foreground italic text-xs">{log.college_office}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="w-24 justify-center rounded-lg px-3 py-0.5 font-black text-[9px] uppercase tracking-widest bg-primary/5 text-primary border-primary/10">
                              {log.userType}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate font-medium text-foreground/70">
                            {log.reason}
                          </TableCell>
                          <TableCell className="text-center pr-8">
                            {log.uid && log.timestamp ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-9 w-28 font-black text-[9px] uppercase tracking-widest rounded-lg gap-2 transition-all active:scale-95 border",
                                  isBlocked 
                                    ? "text-green-600 bg-green-500/5 hover:bg-green-500/10 border-green-500/10" 
                                    : "text-destructive bg-destructive/5 hover:bg-destructive/10 border-destructive/10"
                                )}
                                onClick={() => handleToggleBlock(log.uid, log.email)}
                                disabled={blockingUid === log.uid}
                              >
                                {blockingUid === log.uid ? (
                                  <LoaderCircle className="h-3 w-3 animate-spin" />
                                ) : isBlocked ? (
                                  <>
                                    <UserCheck className="h-3.5 w-3.5" />
                                    Restore
                                  </>
                                ) : (
                                  <>
                                    <UserX className="h-3.5 w-3.5" />
                                    Block
                                  </>
                                )}
                              </Button>
                            ) : (
                              <span className="text-[8px] opacity-30 uppercase font-black px-2 py-1 bg-muted/20 rounded">Legacy</span>
                            )}
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
