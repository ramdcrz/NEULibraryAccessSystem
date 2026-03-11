'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Loading from '@/app/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ShieldCheck, 
  UserX, 
  UserCheck, 
  LoaderCircle, 
  FileDown, 
  Search, 
  XCircle,
  Filter,
  BarChart3,
  Users,
  Clock,
  LogOut,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Activity,
  PieChart as PieChartIcon,
  Library,
} from 'lucide-react';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { toggleUserBlock } from '@/lib/firebase/firestore';
import { cn, formatDuration } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
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
      orderBy('timestamp', 'desc'),
      limit(100)
    );
  }, [firestore, user?.uid, user?.role]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user || user.role !== 'admin') return null;
    return collection(firestore, 'users');
  }, [firestore, user?.uid, user?.role]);

  const { data: allLogs, isLoading: logsLoading } = useCollection(logsQuery);
  const { data: allUsers } = useCollection(usersQuery);

  const sortedLogs = useMemo(() => {
    if (!allLogs) return [];
    // Prioritize pending records (no timestamp yet) at the top for faster visual feedback
    return [...allLogs].sort((a, b) => {
      const timeA = a.timestamp?.toMillis() || Date.now() + 10000;
      const timeB = b.timestamp?.toMillis() || Date.now() + 10000;
      return timeB - timeA;
    });
  }, [allLogs]);

  const stats = useMemo(() => {
    if (!sortedLogs) return { total: 0, today: 0, unique: 0 };
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const uniqueUids = new Set(sortedLogs.map(l => l.uid));
    const todayLogs = sortedLogs.filter(l => l.entryDate === todayStr);
    return {
      total: sortedLogs.length,
      today: todayLogs.length,
      unique: uniqueUids.size
    };
  }, [sortedLogs]);

  const userStatusMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    allUsers?.forEach(u => {
      map[u.id] = !!u.isBlocked;
    });
    return map;
  }, [allUsers]);

  const isFiltered = searchQuery !== '' || startDate !== undefined || endDate !== undefined;

  const filteredLogs = useMemo(() => {
    if (!sortedLogs) return [];
    
    return sortedLogs.filter(log => {
      const emailMatch = log.email.toLowerCase().includes(searchQuery.toLowerCase());
      let dateMatch = true;
      if (log.timestamp) {
        const logDate = log.timestamp.toDate();
        if (startDate && isBefore(logDate, startOfDay(startDate))) dateMatch = false;
        if (endDate && isAfter(logDate, endOfDay(endDate))) dateMatch = false;
      }
      return emailMatch && dateMatch;
    });
  }, [sortedLogs, searchQuery, startDate, endDate]);

  const handleToggleBlock = async (uid: string, email: string) => {
    if (!uid) return;
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
    if (typeof window === 'undefined') return;
    if (!filteredLogs || filteredLogs.length === 0) {
      toast({ variant: "destructive", title: "Export Failed", description: "No records to export." });
      return;
    }

    setIsExporting(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text('NEU Library Access System', 14, 22);
      
      const tableRows = filteredLogs.map(log => [
        log.timestamp ? format(log.timestamp.toDate(), 'yyyy-MM-dd hh:mm a') : 'Pending...',
        log.email,
        log.userType,
        log.college_office,
        log.reason,
        log.status?.toUpperCase() || 'ACTIVE'
      ]);

      autoTable(doc, {
        head: [['Time In', 'Email', 'Type', 'Affiliation', 'Purpose', 'Status']],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 },
      });

      doc.save(`NEU_Logs_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: "Report Exported", description: "PDF has been downloaded." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Export Error", description: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading || !user || user.role !== 'admin') {
    return <Loading />;
  }

  const getStatusBadge = (status: string, isMobile = false) => {
    const baseClasses = cn(
      "rounded-2xl border font-black flex gap-1 items-center justify-center pointer-events-none",
      isMobile 
        ? "shadow-none w-24 text-[8px] px-2 py-0 h-4" 
        : "text-[9px] px-3 py-1.5 w-32 mx-auto"
    );
    switch(status) {
      case 'active':
        return <Badge className={cn(baseClasses, "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/10")}><Clock className="h-2.5 w-2.5" /> ACTIVE</Badge>;
      case 'completed':
        return <Badge className={cn(baseClasses, "bg-green-500/10 text-green-600 border-green-500/20")}><CheckCircle2 className="h-2.5 w-2.5" /> COMPLETED</Badge>;
      case 'auto-closed':
        return <Badge className={cn(baseClasses, "bg-amber-500/10 text-amber-600 border-amber-500/20")}><AlertCircle className="h-2.5 w-2.5" /> AUTO-CLOSED</Badge>;
      default:
        return <Badge variant="outline" className={cn(baseClasses, "opacity-40")}>UNKNOWN</Badge>;
    }
  };

  return (
    <main className="flex-1 px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-in-out">
      <Tabs defaultValue="activity" className="space-y-8 sm:space-y-12">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 sm:gap-8">
          <div className="flex flex-col gap-2 sm:gap-3 text-left">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.4em] text-[8px] sm:text-[10px] opacity-60">
              <ShieldCheck className="h-3.5 w-3.5" />
              Administrative Access System
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-blue-gradient pb-2 px-1">
              System Analytics
            </h1>
            <p className="text-muted-foreground text-lg sm:text-xl font-bold opacity-70 tracking-tight">
              Real-time monitoring and security reporting.
            </p>
          </div>
          
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 w-full xl:w-auto">
            <TabsList className="h-12 p-1 border border-black/5 dark:border-white/10 rounded-full w-full lg:w-[280px] grid grid-cols-2 bg-transparent shadow-sm">
              <TabsTrigger 
                value="activity" 
                className={cn(
                  "rounded-full font-black text-[9px] uppercase tracking-widest transition-all h-full gap-2",
                  "text-muted-foreground bg-transparent", 
                  "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 data-[state=active]:ring-2 data-[state=active]:ring-primary/20" 
                )}
              >
                <Activity className="h-3.5 w-3.5" />
                Logs
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className={cn(
                  "rounded-full font-black text-[9px] uppercase tracking-widest transition-all h-full gap-2",
                  "text-muted-foreground bg-transparent", 
                  "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 data-[state=active]:ring-2 data-[state=active]:ring-primary/20" 
                )}
              >
                <PieChartIcon className="h-3.5 w-3.5" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <Button 
              onClick={exportToPDF} 
              disabled={isExporting || logsLoading || filteredLogs.length === 0}
              className="h-12 px-6 font-black text-[10px] uppercase tracking-widest rounded-full transition-all blue-gradient text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 w-full lg:w-auto shrink-0"
            >
              {isExporting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin mr-2" /> : <FileDown className="h-3.5 w-3.5 mr-2" />}
              Export Logs
            </Button>
          </div>
        </div>

        <TabsContent value="analytics" className="space-y-8 sm:space-y-12 mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
            {[
              { label: 'Total Visits', val: stats.total, icon: BarChart3 },
              { label: 'Today', val: stats.today, icon: Clock },
              { label: 'Verified Reach', val: stats.unique, icon: Users }
            ].map((stat, i) => (
              <Card key={i} className="glass rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 relative overflow-hidden group border border-black/5 dark:border-white/18 shadow-xl shadow-primary/5 animate-in zoom-in-95 duration-700">
                <div className="absolute -bottom-8 -right-8 opacity-[0.15] group-hover:opacity-[0.22] transition-all duration-700 rotate-12 group-hover:rotate-6">
                  <stat.icon className="h-24 sm:h-32 w-24 sm:w-32 text-primary" />
                </div>
                <CardDescription className="text-left text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] opacity-50 mb-2 sm:mb-3 relative z-10">{stat.label}</CardDescription>
                <CardTitle className="text-left text-4xl sm:text-5xl font-black tracking-tighter relative z-10">{stat.val}</CardTitle>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-8 sm:space-y-12 mt-0">
          <Card className="glass overflow-hidden rounded-[2.5rem] border border-black/5 dark:border-white/18 shadow-xl shadow-primary/5 animate-in fade-in duration-1000">
            <CardHeader className="p-6 sm:p-10 border-b border-black/5 dark:border-white/10 flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 sm:gap-5 text-left">
                <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl blue-gradient text-white shadow-inner flex-shrink-0 aspect-square flex items-center justify-center">
                  <Activity className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-3xl font-black tracking-tighter">
                    Logs
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm font-bold opacity-60 mt-0.5 sm:mt-1">
                    {filteredLogs.length} {isFiltered ? 'matching' : 'total'} records
                  </CardDescription>
                </div>
              </div>

              <Button
                variant="ghost"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "h-10 sm:h-11 px-4 sm:px-6 font-black text-[8px] sm:text-[9px] uppercase tracking-widest rounded-full transition-all border shadow-sm",
                  "bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white"
                )}
              >
                <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-2" />
                {showFilters ? 'Hide Filters' : 'Filter View'}
              </Button>
            </CardHeader>
            
            <CardContent className="p-0">
              {showFilters && (
                <div className="px-6 sm:px-10 py-6 border-b border-black/5 dark:border-white/10 bg-primary/5 dark:bg-blue-900/10 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex flex-col lg:flex-row gap-6 items-end">
                    <div className="flex-1 w-full space-y-2 text-left">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                        <Search className="h-3.5 w-3.5" />
                        User Identity Search
                      </label>
                      <Input
                        placeholder="Search by email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-11 rounded-xl border-2 bg-background/50 dark:bg-blue-900/20 transition-all text-sm font-bold focus:border-primary/30 border-primary/10"
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={clearFilters}
                      className="h-11 px-6 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive hover:text-white w-full lg:w-auto"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-2" />
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {logsLoading ? (
                <div className="p-20 sm:p-32 flex flex-col items-center justify-center gap-4 sm:gap-6">
                  <LoaderCircle className="h-10 w-10 sm:h-12 w-12 animate-spin text-primary/30" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Syncing logs...</p>
                </div>
              ) : (
                <>
                  <div className="hidden xl:block w-full overflow-x-auto">
                    <Table className="min-w-[1000px] border-collapse">
                      <TableHeader className="border-b border-black/5 dark:border-white/10">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 pl-10 text-foreground w-[160px]">Timeline</TableHead>
                          <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-foreground text-center w-[140px]">Status</TableHead>
                          <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-foreground min-w-[250px]">Verified Identity</TableHead>
                          <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-foreground text-center w-[130px]">Duration</TableHead>
                          <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-foreground min-w-[180px]">Purpose</TableHead>
                          <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-center pr-10 text-foreground w-[160px] shrink-0">Control</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.map((log) => {
                          const isBlocked = userStatusMap[log.uid] || false;
                          const isOngoing = !log.duration;
                          return (
                            <TableRow key={log.id} className="hover:bg-primary/[0.04] dark:hover:bg-white/5 transition-colors border-black/5 dark:border-white/10">
                              <TableCell className="pl-10 py-6 whitespace-nowrap w-[160px] text-left">
                                <div className="flex flex-col gap-1">
                                  <div className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1">
                                    {log.timestamp ? format(log.timestamp.toDate(), 'MMM d, yyyy') : 'PENDING...'}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase">
                                    <LogIn className="h-3 w-3" /> {log.timestamp ? format(log.timestamp.toDate(), 'hh:mm a') : '--:--'}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase opacity-40">
                                    <LogOut className="h-3 w-3" /> {log.exitTimestamp ? format(log.exitTimestamp.toDate(), 'hh:mm a') : '--:--'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="w-[140px]">
                                <div className="flex justify-center">
                                  {getStatusBadge(log.status || 'active')}
                                </div>
                              </TableCell>
                              <TableCell className="font-black text-foreground min-w-[250px] text-left">
                                <div className="flex flex-col truncate">
                                  <span className="truncate block" title={log.email}>{log.email}</span>
                                  <span className="text-[10px] opacity-40 uppercase tracking-widest mt-1 truncate block">{log.userType} • {log.college_office}</span>
                                </div>
                              </TableCell>
                              <TableCell className="w-[130px]">
                                <div className="flex justify-center">
                                  <Badge className={cn("rounded-2xl font-black text-[10px] py-1.5 px-4 w-32 flex justify-center border-none pointer-events-none shadow-none uppercase", isOngoing ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" : "bg-primary/10 text-primary")}>
                                    {formatDuration(log.duration)}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="min-w-[180px] font-bold text-foreground/80 text-left">
                                <span className="truncate block">{log.reason}</span>
                              </TableCell>
                              <TableCell className="text-center pr-10 w-[160px] shrink-0">
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "h-12 w-32 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all border shadow-sm",
                                    isBlocked 
                                      ? "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-600 dark:hover:bg-green-400 hover:text-white dark:hover:text-green-950" 
                                      : "text-destructive dark:text-red-400 bg-destructive/5 border-destructive/10 hover:bg-destructive dark:hover:bg-red-400 hover:text-white dark:hover:text-red-950"
                                    )}
                                  onClick={() => handleToggleBlock(log.uid, log.email)}
                                  disabled={blockingUid === log.uid}
                                >
                                  {blockingUid === log.uid ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                  ) : isBlocked ? (
                                    <><UserCheck className="h-3.5 w-3.5 mr-2" />Restore</>
                                  ) : (
                                    <><UserX className="h-3.5 w-3.5 mr-2" />Block</>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* High-Density Mobile View */}
                  <div className="xl:hidden space-y-4 p-4 pb-4">
                    {filteredLogs.map((log) => {
                      const isBlocked = userStatusMap[log.uid] || false;
                      const isOngoing = !log.duration;
                      return (
                        <Card key={log.id} className="glass border border-black/5 dark:border-white/15 rounded-2xl overflow-hidden shadow-sm animate-in zoom-in-95 duration-500">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between gap-4 items-start text-left">
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                  {log.timestamp ? format(log.timestamp.toDate(), 'MMMM d, yyyy').toUpperCase() : 'PENDING...'}
                                </div>
                                <div className="text-sm font-bold text-foreground block truncate leading-tight">
                                  {log.email}
                                </div>
                                <div className="text-[8px] font-black text-primary uppercase tracking-widest mt-1">
                                  {log.userType} • {log.college_office}
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2 shrink-0">
                                {getStatusBadge(log.status || 'active', true)}
                                <Badge className={cn(
                                  "rounded-xl font-black text-[8px] py-0 h-4 border-none shadow-none uppercase shrink-0 w-24 justify-center text-center pointer-events-none",
                                  isOngoing ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" : "bg-primary/10 text-primary"
                                )}>
                                  {formatDuration(log.duration)}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-center justify-between">
                              <div className="space-y-0.5 flex-1 text-left">
                                <div className="flex items-center gap-1.5 text-[8px] font-black text-foreground/40 uppercase tracking-widest leading-none">
                                  <LogIn className="h-2.5 w-2.5" /> Time In
                                </div>
                                <div className="text-sm font-black text-primary uppercase leading-tight">
                                  {log.timestamp ? format(log.timestamp.toDate(), 'hh:mm a') : '--:--'}
                                </div>
                              </div>
                              <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-2" />
                              <div className="space-y-0.5 flex-1 text-right">
                                <div className="flex items-center justify-end gap-1.5 text-[8px] font-black text-foreground/40 uppercase tracking-widest leading-none">
                                  <LogOut className="h-2.5 w-2.5" /> Time Out
                                </div>
                                <div className="text-sm font-black text-muted-foreground uppercase opacity-40 leading-tight">
                                  {log.exitTimestamp ? format(log.exitTimestamp.toDate(), 'hh:mm a') : '--:--'}
                                </div>
                              </div>
                            </div>

                            {/* Restored Purpose of Visit in Mobile Card */}
                            <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 border border-black/5 dark:border-white/10 text-left">
                              <span className="text-[8px] font-black uppercase text-primary/60 block mb-1 tracking-widest">Purpose of Visit</span>
                              <p className="text-xs font-bold text-foreground leading-snug">{log.reason}</p>
                            </div>

                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full h-11 font-black text-[9px] uppercase tracking-[0.2em] rounded-xl transition-all border shadow-sm flex items-center justify-center gap-2.5",
                                isBlocked 
                                  ? "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-600 dark:hover:bg-green-400 hover:text-white dark:hover:text-green-950" 
                                  : "text-destructive dark:text-red-400 bg-destructive/5 border-destructive/10 hover:bg-destructive dark:hover:bg-red-400 hover:text-white dark:hover:text-red-950"
                                )}
                              onClick={() => handleToggleBlock(log.uid, log.email)}
                              disabled={blockingUid === log.uid}
                            >
                              {blockingUid === log.uid ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : isBlocked ? (
                                <><UserCheck className="h-3 w-3" /> Restore</>
                              ) : (
                                <><UserX className="h-3 w-3" /> Block</>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="w-full text-center text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 py-8">
        2026 NEW ERA UNIVERSITY
      </div>
    </main>
  );
}
