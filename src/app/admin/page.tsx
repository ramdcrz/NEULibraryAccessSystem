'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Loading from '@/app/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ShieldCheck, 
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
  Calendar as CalendarIcon,
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
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

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
      limit(200)
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

  const analyticsData = useMemo(() => {
    if (!sortedLogs) return { daily: [], types: [], hourly: [] };

    const dailyMap = new Map();
    sortedLogs.forEach(log => {
      const date = log.entryDate;
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
    });
    const daily = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);

    const typeMap = new Map();
    sortedLogs.forEach(log => {
      const type = log.userType || 'Unknown';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });
    const types = Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }));

    const hourMap = new Int32Array(24).fill(0);
    sortedLogs.forEach(log => {
      if (log.timestamp) {
        const hour = log.timestamp.toDate().getHours();
        hourMap[hour]++;
      }
    });
    const hourly = Array.from(hourMap).map((count, hour) => ({
      hour: `${hour % 12 || 12}${hour >= 12 ? 'PM' : 'AM'}`,
      count
    }));

    return { daily, types, hourly };
  }, [sortedLogs]);

  const chartConfig = {
    count: {
      label: "Visits",
      color: "hsl(var(--primary))",
    },
    value: {
      label: "Count",
      color: "hsl(var(--primary))",
    }
  } satisfies ChartConfig;

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
      
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(14, 15, 12, 12, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('NEU', 15.5, 22.5);

      doc.setTextColor(37, 99, 235);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('NEU Library', 28, 22);
      
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'normal');
      doc.text('ACCESS SYSTEM OFFICIAL REPORT', 28, 26);

      const now = new Date();
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(`Generated On: ${format(now, 'MMMM d, yyyy @ hh:mm a')}`, 14, 40);
      
      let rangeText = "Reporting Period: All Recent Records (Last 200 Logs)";
      if (startDate || endDate) {
        rangeText = `Reporting Period: ${startDate ? format(startDate, 'MMM d, yyyy') : 'Start'} to ${endDate ? format(endDate, 'MMM d, yyyy') : 'Latest'}`;
      } else if (searchQuery) {
        rangeText = `Reporting Period: Records matching "${searchQuery}"`;
      }
      doc.text(rangeText, 14, 45);

      const tableRows = filteredLogs.map(log => [
        log.timestamp ? format(log.timestamp.toDate(), 'hh:mm a') : '--:--',
        log.exitTimestamp ? format(log.exitTimestamp.toDate(), 'hh:mm a') : 'N/A',
        formatDuration(log.duration, 'Ongoing', false),
        log.email,
        log.userType,
        log.college_office,
        log.reason || 'N/A',
        log.status?.toUpperCase() || 'ACTIVE'
      ]);

      autoTable(doc, {
        head: [['In', 'Out', 'Duration', 'Email', 'Type', 'Affiliation', 'Purpose', 'Status']],
        body: tableRows,
        startY: 55,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], halign: 'center', fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { halign: 'center', cellWidth: 15 },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'left' },
          4: { halign: 'center', cellWidth: 20 },
          5: { halign: 'left' },
          6: { halign: 'left' },
          7: { halign: 'center', cellWidth: 25 }
        }
      });

      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        const pageText = `Page ${i} of ${totalPages}`;
        doc.text(pageText, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
      }

      doc.save(`NEU_Library_Report_${format(now, 'yyyy-MM-dd_HHmm')}.pdf`);
      toast({ title: "Report Exported", description: "Professional zebra-striped PDF generated." });
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
      "rounded-2xl border font-black flex gap-1 items-center justify-center pointer-events-none transition-all",
      isMobile 
        ? "shadow-none w-32 text-[10px] px-2 py-0 h-6" 
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
    <main className="flex-1 px-4 sm:px-6 md:px-12 py-8 sm:py-12 pb-4 sm:pb-8 space-y-4 sm:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-in-out">
      <Tabs defaultValue="activity" className="space-y-4 sm:space-y-12">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 sm:gap-8">
          <div className="flex flex-col gap-2 sm:gap-3 text-left">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.4em] text-[8px] sm:text-[10px] opacity-60">
              <ShieldCheck className="h-3.5 w-3.5" />
              Administrative Access System
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-blue-gradient pb-2 px-1 leading-tight">
              System Analytics
            </h1>
            <p className="text-muted-foreground text-lg sm:text-xl font-bold opacity-70 tracking-tight">
              Real-time monitoring and security reporting.
            </p>
          </div>
          
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 w-full xl:w-auto">
            <TabsList className="h-12 p-1 border border-black/5 dark:border-white/10 rounded-full w-full lg:w-[320px] grid grid-cols-2 bg-background/50 dark:bg-white/5 shadow-sm">
              <TabsTrigger 
                value="activity" 
                className="rounded-full font-black text-[9px] uppercase tracking-widest transition-all h-full gap-2 data-[state=active]:border-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:bg-primary/5"
              >
                <Activity className="h-3.5 w-3.5" /> Logs
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="rounded-full font-black text-[9px] uppercase tracking-widest transition-all h-full gap-2 data-[state=active]:border-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:bg-primary/5"
              >
                <PieChartIcon className="h-3.5 w-3.5" /> Analytics
              </TabsTrigger>
            </TabsList>
            <Button onClick={exportToPDF} disabled={isExporting || logsLoading || filteredLogs.length === 0} className="h-12 px-6 font-black text-[10px] uppercase tracking-widest rounded-full transition-all blue-gradient text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] w-full lg:w-auto">
              {isExporting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin mr-2" /> : <FileDown className="h-3.5 w-3.5 mr-2" />}
              Export Logs
            </Button>
          </div>
        </div>

        <TabsContent value="analytics" className="space-y-8 sm:space-y-12 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { label: 'Total Visits', val: stats.total, icon: BarChart3 },
              { label: 'Today', val: stats.today, icon: Clock },
              { label: 'Verified Reach', val: stats.unique, icon: Users }
            ].map((stat, i) => (
              <Card key={i} className="glass rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 relative overflow-hidden group border border-black/5 dark:border-white/10 shadow-xl">
                <div className="absolute -bottom-8 -right-8 opacity-[0.15] rotate-12 group-hover:rotate-6 transition-all duration-700">
                  <stat.icon className="h-24 sm:h-32 w-24 sm:w-32 text-primary" />
                </div>
                <CardDescription className="text-left text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] opacity-50 mb-2 relative z-10">{stat.label}</CardDescription>
                <CardTitle className="text-left text-4xl sm:text-5xl font-black tracking-tighter relative z-10">{stat.val}</CardTitle>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="glass rounded-[2rem] border border-black/5 dark:border-white/10 shadow-xl p-6 sm:p-10">
              <CardHeader className="p-0 mb-8">
                <CardTitle className="text-xl font-black tracking-tight">Weekly Engagement</CardTitle>
                <CardDescription className="font-bold">Total visits recorded over the last 7 days</CardDescription>
              </CardHeader>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={analyticsData.daily}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} tickFormatter={(val) => format(new Date(val), 'MMM d')} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} barSize={60} />
                </BarChart>
              </ChartContainer>
            </Card>

            <Card className="glass rounded-[2rem] border border-black/5 dark:border-white/10 shadow-xl p-6 sm:p-10">
              <CardHeader className="p-0 mb-8">
                <CardTitle className="text-xl font-black tracking-tight">User Demographics</CardTitle>
                <CardDescription className="font-bold">Distribution by classification</CardDescription>
              </CardHeader>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <PieChart>
                  <Pie 
                    data={analyticsData.types} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={65} 
                    outerRadius={105} 
                    paddingAngle={8} 
                    dataKey="value"
                  >
                    {analyticsData.types.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </Card>

            <Card className="glass rounded-[2rem] border border-black/5 dark:border-white/10 shadow-xl p-6 sm:p-10 lg:col-span-2">
              <CardHeader className="p-0 mb-8">
                <CardTitle className="text-xl font-black tracking-tight">Peak Activity Hours</CardTitle>
                <CardDescription className="font-bold">Usage intensity throughout the day</CardDescription>
              </CardHeader>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart data={analyticsData.hourly}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={6} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ChartContainer>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 sm:space-y-12 mt-0">
          <Card className="glass overflow-hidden rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-xl">
            <CardHeader className="p-6 sm:p-10 border-b border-black/5 dark:border-white/10 flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 sm:gap-5 text-left">
                <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl blue-gradient text-white shadow-inner flex-shrink-0 aspect-square flex items-center justify-center">
                  <Activity className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-3xl font-black tracking-tighter leading-none">Logs</CardTitle>
                  <CardDescription className="text-xs sm:text-sm font-bold opacity-60 mt-1">
                    {filteredLogs.length} {isFiltered ? 'matching' : 'total'} records
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setShowFilters(!showFilters)} className="h-10 sm:h-11 px-4 sm:px-6 font-black text-[8px] sm:text-[9px] uppercase tracking-widest rounded-full border shadow-sm bg-primary/10 text-primary">
                <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-2" />
                {showFilters ? 'Hide Filters' : 'Filter View'}
              </Button>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              {showFilters && (
                <div className="px-6 sm:px-10 py-6 border-b border-black/5 dark:border-white/10 bg-primary/5 dark:bg-blue-900/10 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex flex-col lg:flex-row gap-6 items-end">
                    <div className="flex-1 w-full space-y-2 text-left">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                        <Search className="h-3.5 w-3.5" /> Identity Search
                      </label>
                      <Input placeholder="Search by email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-11 rounded-xl border-2 bg-background/50 text-sm font-bold border-primary/10" />
                    </div>

                    <div className="flex-1 w-full space-y-2 text-left">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                        <CalendarIcon className="h-3.5 w-3.5" /> Date Range
                      </label>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-11 justify-start text-left font-bold rounded-xl border-2 bg-background/50 flex-1 border-primary/10", !startDate && "text-muted-foreground")}>
                              {startDate ? format(startDate, "MMM d, yyyy") : "From Date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                            <Calendar 
                              mode="single" 
                              selected={startDate} 
                              onSelect={setStartDate} 
                              disabled={(date) => endDate ? isAfter(date, endDate) : false}
                              initialFocus 
                            />
                          </PopoverContent>
                        </Popover>
                        <span className="text-muted-foreground font-black opacity-20">—</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-11 justify-start text-left font-bold rounded-xl border-2 bg-background/50 flex-1 border-primary/10", !endDate && "text-muted-foreground")}>
                              {endDate ? format(endDate, "MMM d, yyyy") : "To Date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="end">
                            <Calendar 
                              mode="single" 
                              selected={endDate} 
                              onSelect={setEndDate} 
                              disabled={(date) => startDate ? isBefore(date, startDate) : false}
                              initialFocus 
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <Button variant="ghost" onClick={clearFilters} className="h-11 px-6 font-black text-[9px] uppercase tracking-widest rounded-xl border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive hover:text-white transition-all">
                      <XCircle className="h-3.5 w-3.5 mr-2" /> Clear
                    </Button>
                  </div>
                </div>
              )}
              {logsLoading ? (
                <div className="p-20 flex flex-col items-center justify-center gap-4">
                  <LoaderCircle className="h-10 animate-spin text-primary/30" />
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
                          <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-center pr-10 text-foreground w-[160px]">Control</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.map((log) => {
                          const isBlocked = userStatusMap[log.uid] || false;
                          const isOngoing = !log.duration;
                          return (
                            <TableRow key={log.id} className="hover:bg-primary/[0.04] transition-colors">
                              <TableCell className="pl-10 py-6 whitespace-nowrap w-[160px]">
                                <div className="flex flex-col gap-1 text-left">
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
                              <TableCell className="w-[140px] text-center">{getStatusBadge(log.status || 'active')}</TableCell>
                              <TableCell className="font-black text-foreground min-w-[250px] text-left">
                                <div className="flex flex-col truncate">
                                  <span className="truncate block">{log.email}</span>
                                  <span className="text-[10px] opacity-40 uppercase tracking-widest mt-1 truncate block">{log.userType} • {log.college_office}</span>
                                </div>
                              </TableCell>
                              <TableCell className="w-[130px] text-center">
                                <Badge className={cn("rounded-2xl font-black text-[10px] py-1.5 px-4 w-32 justify-center uppercase", isOngoing ? "bg-sky-500/15 text-sky-600 border-none" : "bg-primary/10 text-primary border-none")}>
                                  {formatDuration(log.duration)}
                                </Badge>
                              </TableCell>
                              <TableCell className="min-w-[180px] font-bold text-foreground/80 text-left">
                                <span className="truncate block">{log.reason || 'Others'}</span>
                              </TableCell>
                              <TableCell className="text-center pr-10 w-[160px]">
                                <Button 
                                  variant="ghost" 
                                  className={cn("h-12 w-32 font-black text-[10px] uppercase tracking-widest rounded-2xl border transition-all shadow-sm", isBlocked ? "text-green-600 bg-green-500/10 hover:bg-green-600 hover:text-white" : "text-destructive bg-destructive/5 hover:bg-destructive hover:text-white")} 
                                  onClick={() => handleToggleBlock(log.uid, log.email)} 
                                  disabled={blockingUid === log.uid}
                                >
                                  {blockingUid === log.uid ? <LoaderCircle className="h-4 animate-spin" /> : isBlocked ? "Restore" : "Block"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="xl:hidden space-y-4 p-4 pb-2">
                    {filteredLogs.map((log) => {
                      const isBlocked = userStatusMap[log.uid] || false;
                      const isOngoing = !log.duration;
                      return (
                        <Card key={log.id} className="glass border rounded-2xl overflow-hidden shadow-sm">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between gap-4 items-start text-left">
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{log.timestamp ? format(log.timestamp.toDate(), 'MMMM d, yyyy').toUpperCase() : 'PENDING...'}</div>
                                <div className="text-base font-bold text-foreground truncate">{log.email}</div>
                                <div className="text-[10px] font-black text-primary uppercase tracking-widest">{log.userType} • {log.college_office}</div>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                {getStatusBadge(log.status || 'active', true)}
                                <Badge className={cn("rounded-xl font-black text-[10px] h-6 w-32 justify-center uppercase border-none", isOngoing ? "bg-sky-500/15 text-sky-600" : "bg-primary/10 text-primary")}>
                                  {formatDuration(log.duration)}
                                </Badge>
                              </div>
                            </div>
                            <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-center justify-between">
                              <div className="space-y-1 flex-1 text-left">
                                <div className="text-[10px] font-black text-foreground/40 uppercase tracking-widest"><LogIn className="h-2.5 w-2.5 inline mr-1" /> Time In</div>
                                <div className="text-sm font-black text-primary uppercase">{log.timestamp ? format(log.timestamp.toDate(), 'hh:mm a') : '--:--'}</div>
                              </div>
                              <div className="w-px h-6 bg-black/10 mx-2" />
                              <div className="space-y-1 flex-1 text-right">
                                <div className="text-[10px] font-black text-foreground/40 uppercase tracking-widest"><LogOut className="h-2.5 w-2.5 inline mr-1" /> Time Out</div>
                                <div className="text-sm font-black text-muted-foreground uppercase opacity-40">{log.exitTimestamp ? format(log.exitTimestamp.toDate(), 'hh:mm a') : '--:--'}</div>
                              </div>
                            </div>
                            <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 border border-black/5 text-left">
                              <span className="text-[10px] font-black uppercase text-primary/60 block mb-1">Purpose of Visit</span>
                              <p className="text-sm font-bold text-foreground leading-snug">{log.reason || 'Others'}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              className={cn("w-full h-11 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl border transition-all shadow-sm", isBlocked ? "text-green-600 bg-green-500/10 hover:bg-green-600 hover:text-white" : "text-destructive bg-destructive/5 hover:bg-destructive hover:text-white")} 
                              onClick={() => handleToggleBlock(log.uid, log.email)} 
                              disabled={blockingUid === log.uid}
                            >
                              {blockingUid === log.uid ? <LoaderCircle className="h-3.5 animate-spin" /> : isBlocked ? "Restore User" : "Block User"}
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
    </main>
  );
}
