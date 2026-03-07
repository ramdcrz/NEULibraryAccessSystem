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
      <main className="flex-1 p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-[10px]">
              <ShieldCheck className="h-4 w-4" />
              Administrative Terminal
            </div>
            <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              Access Analytics
            </h1>
            <p className="text-muted-foreground text-lg font-medium">
              Real-time monitoring and reporting for university campus security.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 px-6 rounded-2xl font-bold gap-2 transition-all border-2"
            >
              <Search className="h-5 w-5" />
              {showFilters ? 'Hide Filters' : 'Filter Logs'}
            </Button>

            <Button 
              onClick={exportToPDF} 
              disabled={isExporting || logsLoading || filteredLogs.length === 0}
              className="h-12 px-6 rounded-2xl font-black gap-2 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] glow-primary"
            >
              {isExporting ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <FileDown className="h-5 w-5" />
              )}
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass border-none rounded-3xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <BarChart3 className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-black uppercase tracking-[0.1em]">Lifetime Logs</CardDescription>
              <CardTitle className="text-4xl font-black">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Database className="h-3 w-3" />
                Total system entries
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-none rounded-3xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-black uppercase tracking-[0.1em]">Activity Today</CardDescription>
              <CardTitle className="text-4xl font-black">{stats.today}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs font-bold text-green-600">
                <CalendarDays className="h-3 w-3" />
                New visits recorded today
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-none rounded-3xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-black uppercase tracking-[0.1em]">Unique Users</CardDescription>
              <CardTitle className="text-4xl font-black">{stats.unique}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                <ShieldCheck className="h-3 w-3" />
                Verified accounts reached
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls - Toggleable */}
        {showFilters && (
          <Card className="glass border-none shadow-2xl rounded-3xl overflow-hidden animate-in slide-in-from-top-4 duration-500">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row gap-6 items-end">
                <div className="flex-1 w-full space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                    <Search className="h-3 w-3" />
                    Target User Email
                  </label>
                  <Input
                    placeholder="e.g. name@neu.edu.ph"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-14 rounded-2xl border-2 bg-background/40 focus:border-primary transition-all text-base font-medium"
                  />
                </div>

                <div className="w-full lg:w-auto space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3" />
                    Range Start
                  </label>
                  <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full lg:w-[220px] h-14 justify-start text-left font-bold rounded-2xl border-2 bg-background/40",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-3xl shadow-2xl border-none" align="start">
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
                    Range End
                  </label>
                  <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full lg:w-[220px] h-14 justify-start text-left font-bold rounded-2xl border-2 bg-background/40",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-3xl shadow-2xl border-none" align="start">
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
                    <XCircle className="h-5 w-5" />
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
            <AlertTitle className="text-xl font-black ml-2">System Configuration Required</AlertTitle>
            <AlertDescription className="mt-4">
              <div className="bg-destructive/10 p-5 rounded-2xl text-foreground">
                <p className="font-bold mb-2 flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Firestore Index Missing
                </p>
                <p className="text-sm opacity-90 leading-relaxed">The database requires a composite index to perform the requested sort and filter operations. Please visit the Firebase Console to create it.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card className="glass border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
          <CardHeader className="p-8 border-b border-white/10 bg-white/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary glow-primary">
                  <Filter className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black">
                    Activity Logs
                  </CardTitle>
                  <CardDescription className="text-base font-medium">
                    {searchQuery || startDate || endDate 
                      ? `Found ${filteredLogs.length} matching entries`
                      : `Total history for all departments`}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary opacity-50" />
                <p className="text-muted-foreground font-black uppercase tracking-[0.2em] text-[10px]">Synchronizing...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-32 text-center flex flex-col items-center gap-6">
                <div className="p-6 rounded-full bg-muted/30">
                  <Search className="h-12 w-12 text-muted-foreground opacity-30" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black">No matches found</h3>
                  <p className="text-muted-foreground font-medium">Try broadening your search criteria or resetting filters.</p>
                </div>
                <Button variant="outline" onClick={clearFilters} className="rounded-2xl font-black border-2 h-12 px-8">Reset All Filters</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-white/5">
                      <TableHead className="font-black text-[10px] uppercase tracking-widest h-14 pl-8">Date & Time</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest h-14">Identity</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest h-14">Affiliation</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest h-14">Classification</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest h-14">Purpose</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest h-14 text-center pr-8">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const isBlocked = userStatusMap[log.uid] || false;
                      
                      return (
                        <TableRow key={log.id} className="hover:bg-white/5 transition-colors border-white/5 group">
                          <TableCell className="pl-8 py-5 whitespace-nowrap font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                            {log.timestamp ? format(log.timestamp.toDate(), 'MMM d, h:mm a') : 'Pending...'}
                          </TableCell>
                          <TableCell className="font-black text-foreground">{log.email}</TableCell>
                          <TableCell className="italic text-muted-foreground">{log.college_office}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-xl px-4 py-1 font-black text-[10px] uppercase tracking-widest bg-primary/5 text-primary border-primary/20">
                              {log.userType}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate font-medium text-foreground/80">
                            {log.reason}
                          </TableCell>
                          <TableCell className="text-center pr-8">
                            {log.uid && log.timestamp ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-10 px-5 font-black text-[10px] uppercase tracking-widest rounded-xl gap-2 transition-all active:scale-95 border-2",
                                  isBlocked 
                                    ? "text-green-600 bg-green-500/5 hover:bg-green-500/15 border-green-500/20" 
                                    : "text-destructive bg-destructive/5 hover:bg-destructive/15 border-destructive/20"
                                )}
                                onClick={() => handleToggleBlock(log.uid, log.email)}
                                disabled={blockingUid === log.uid}
                              >
                                {blockingUid === log.uid ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : isBlocked ? (
                                  <>
                                    <UserCheck className="h-4 w-4" />
                                    Restore
                                  </>
                                ) : (
                                  <>
                                    <UserX className="h-4 w-4" />
                                    Block
                                  </>
                                )}
                              </Button>
                            ) : (
                              <span className="text-[9px] text-muted-foreground/50 uppercase font-black px-3 py-1 bg-muted/20 rounded-lg">Legacy Entry</span>
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