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
  Calendar as CalendarIcon, 
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
  PieChart as PieChartIcon
} from 'lucide-react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer 
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
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

  const { data: allLogs, isLoading: logsLoading } = useCollection(logsQuery);
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

  const chartData = useMemo(() => {
    if (!allLogs) return { userType: [], college: [] };
    
    const userTypeCounts: Record<string, number> = { Student: 0, Staff: 0, Employee: 0 };
    const collegeCounts: Record<string, number> = {};

    allLogs.forEach(log => {
      if (userTypeCounts[log.userType] !== undefined) userTypeCounts[log.userType]++;
      const college = log.college_office || 'Unknown';
      collegeCounts[college] = (collegeCounts[college] || 0) + 1;
    });

    const collegeData = Object.entries(collegeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const COLORS = ['hsl(var(--primary))', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

    return {
      userType: Object.entries(userTypeCounts).map(([name, value]) => ({ name, value })),
      college: collegeData.map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }))
    };
  }, [allLogs]);

  const chartConfig = {
    value: {
      label: "Visits",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

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
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text('NEU Library Access System', 14, 22);
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('University Visit Activity Report', 14, 32);
      
      const tableRows = filteredLogs.map(log => [
        log.timestamp ? format(log.timestamp.toDate(), 'PP p') : 'Pending...',
        log.exitTimestamp ? format(log.exitTimestamp.toDate(), 'PP p') : 'Active',
        log.status?.toUpperCase() || 'ACTIVE',
        log.email,
        log.userType,
        log.duration ? `${log.duration}m` : '-',
        log.reason
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Timeline', 'Status', 'Identity', 'Duration', 'Purpose']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2 }
      });

      doc.save(`NEULibrary_Logs_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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

  const getStatusBadge = (status: string) => {
    const baseClasses = "rounded-2xl border font-black text-[9px] px-3 py-1.5 flex gap-1.5 items-center justify-center w-32 mx-auto";
    switch(status) {
      case 'active':
        return <Badge className={cn(baseClasses, "bg-blue-500/10 text-blue-600 border-blue-500/20")}><Clock className="h-2.5 w-2.5" /> ACTIVE</Badge>;
      case 'completed':
        return <Badge className={cn(baseClasses, "bg-green-500/10 text-green-600 border-green-500/20")}><CheckCircle2 className="h-2.5 w-2.5" /> COMPLETED</Badge>;
      case 'auto-closed':
        return <Badge className={cn(baseClasses, "bg-amber-500/10 text-amber-600 border-amber-500/20")}><AlertCircle className="h-2.5 w-2.5" /> AUTO-CLOSED</Badge>;
      default:
        return <Badge variant="outline" className={cn(baseClasses, "opacity-40")}>UNKNOWN</Badge>;
    }
  };

  return (
    <main className="flex-1 px-6 md:px-12 py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-in-out">
      <Tabs defaultValue="activity" className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.4em] text-[10px] opacity-60">
              <ShieldCheck className="h-3.5 w-3.5" />
              Administrative Terminal
            </div>
            <h1 className="text-6xl font-black tracking-tighter py-2">
              System <span className="text-blue-gradient">Analytics</span>
            </h1>
            <p className="text-muted-foreground text-xl font-bold opacity-70 tracking-tight">
              Real-time monitoring and security reporting.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <TabsList className="h-12 p-1 glass border border-black/5 dark:border-white/10 rounded-full w-full sm:w-[320px] grid grid-cols-2 bg-transparent">
              <TabsTrigger 
                value="analytics" 
                className="rounded-full font-black text-[9px] uppercase tracking-widest data-[state=active]:blue-gradient data-[state=active]:!text-white transition-all h-full gap-2"
              >
                <PieChartIcon className="h-3.5 w-3.5" />
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="activity" 
                className="rounded-full font-black text-[9px] uppercase tracking-widest data-[state=active]:blue-gradient data-[state=active]:!text-white transition-all h-full gap-2"
              >
                <Activity className="h-3.5 w-3.5" />
                Activity
              </TabsTrigger>
            </TabsList>

            <Button 
              onClick={exportToPDF} 
              disabled={isExporting || logsLoading || filteredLogs.length === 0}
              className="h-12 px-6 font-black text-[10px] uppercase tracking-widest rounded-full transition-all blue-gradient text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 w-full sm:w-auto min-w-[160px]"
            >
              {isExporting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin mr-2" /> : <FileDown className="h-3.5 w-3.5 mr-2" />}
              Export Activity
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Total Visits', val: stats.total, icon: BarChart3 },
            { label: 'Today', val: stats.today, icon: Clock },
            { label: 'Verified Reach', val: stats.unique, icon: Users }
          ].map((stat, i) => (
            <Card key={i} className="glass rounded-[2rem] p-8 relative overflow-hidden group border border-black/5 dark:border-white/18 shadow-xl shadow-primary/5">
              <div className="absolute -bottom-8 -right-8 opacity-[0.15] group-hover:opacity-[0.22] transition-all duration-700 rotate-12 group-hover:rotate-6">
                <stat.icon className="h-32 w-32 text-primary" />
              </div>
              <CardDescription className="text-[11px] font-black uppercase tracking-[0.3em] opacity-50 mb-3 relative z-10">{stat.label}</CardDescription>
              <CardTitle className="text-5xl font-black tracking-tighter relative z-10">{stat.val}</CardTitle>
            </Card>
          ))}
        </div>

        <TabsContent value="analytics" className="space-y-12 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="glass rounded-[2rem] p-10 border border-black/5 dark:border-white/18 shadow-xl shadow-primary/5">
              <CardHeader className="p-0 mb-10">
                <CardTitle className="text-2xl font-black tracking-tight">Classification Distribution</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Visits by User Type</CardDescription>
              </CardHeader>
              <CardContent className="p-0 h-[400px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <BarChart data={chartData.userType} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      dataKey="name" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900 }}
                      tickFormatter={(val) => val.toUpperCase()}
                    />
                    <YAxis hide />
                    <ChartTooltip cursor={{ fill: 'transparent' }} content={<ChartTooltipContent gap={6} />} />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--primary))" 
                      radius={[10, 10, 0, 0]} 
                      barSize={60}
                    >
                      {chartData.userType.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          className="transition-opacity duration-300 hover:opacity-70 cursor-pointer"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="glass rounded-[2rem] p-10 border border-black/5 dark:border-white/18 shadow-xl shadow-primary/5">
              <CardHeader className="p-0 mb-10">
                <CardTitle className="text-2xl font-black tracking-tight">Top Affiliations</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Most active colleges & offices</CardDescription>
              </CardHeader>
              <CardContent className="p-0 h-[400px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <PieChart>
                    <Pie
                      data={chartData.college}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      innerRadius={60}
                      stroke="none"
                      paddingAngle={0}
                    >
                      {chartData.college.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity" />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent gap={6} />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-12 mt-0">
          <div className="flex flex-col gap-12">
            {showFilters && (
              <Card className="glass rounded-[2rem] p-10 border border-black/5 dark:border-white/18 animate-in zoom-in-95 duration-500 shadow-xl shadow-primary/5">
                <div className="flex flex-col lg:flex-row gap-8 items-end">
                  <div className="flex-1 w-full space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                      <Search className="h-3.5 w-3.5" />
                      Terminal Identity Search
                    </label>
                    <Input
                      placeholder="Search by email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12 rounded-2xl border-2 bg-black/5 transition-all text-sm font-bold focus:border-primary/30"
                    />
                  </div>

                  <div className="flex gap-4 w-full lg:w-auto">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        Start Date
                      </label>
                      <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full lg:w-[200px] h-12 justify-start text-left font-bold rounded-2xl border-2 bg-black/5 hover:bg-black/10 transition-colors",
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
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        End Date
                      </label>
                      <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full lg:w-[200px] h-12 justify-start text-left font-bold rounded-2xl border-2 bg-black/5 hover:bg-black/10 transition-colors",
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
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <Button 
                    variant="ghost" 
                    onClick={clearFilters}
                    className="h-12 px-6 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive hover:text-white"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-2" />
                    Clear
                  </Button>
                </div>
              </Card>
            )}

            <Card className="glass overflow-hidden rounded-[2rem] border border-black/5 dark:border-white/18 shadow-xl shadow-primary/5">
              <CardHeader className="p-10 border-b border-black/5 dark:border-white/10 flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div className="p-3.5 rounded-2xl bg-primary/10 text-primary border border-black/5 dark:border-white/10 shadow-inner">
                    <Activity className="h-7 w-7" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl font-black tracking-tighter">
                      Activity Stream
                    </CardTitle>
                    <CardDescription className="text-sm font-bold opacity-60 mt-1">
                      {filteredLogs.length} matching entries found in terminal
                    </CardDescription>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "h-11 px-6 font-black text-[9px] uppercase tracking-widest rounded-full transition-all border shadow-sm",
                    showFilters 
                      ? "bg-primary/10 text-primary border-primary/20" 
                      : "border-black/5 dark:border-white/10 bg-white/5 hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <Filter className="h-3.5 w-3.5 mr-2" />
                  {showFilters ? 'Hide Filters' : 'Filter View'}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {logsLoading ? (
                  <div className="p-32 flex flex-col items-center justify-center gap-6">
                    <LoaderCircle className="h-12 w-12 animate-spin text-primary/30" />
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30">Syncing logs...</p>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-40 text-center flex flex-col items-center gap-8">
                    <Search className="h-12 w-12 text-muted-foreground opacity-20" />
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black tracking-tight">No Activity Detected</h3>
                      <p className="text-muted-foreground font-bold">Adjust filters to display terminal data.</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="border-b border-black/5 dark:border-white/10">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 pl-10 text-foreground">Timeline</TableHead>
                          <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-foreground text-center">Status</TableHead>
                          <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-foreground">Verified Identity</TableHead>
                          <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-foreground text-center">Duration</TableHead>
                          <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-foreground">Purpose</TableHead>
                          <TableHead className="font-black text-[11px] uppercase tracking-[0.25em] h-16 text-center pr-10 text-foreground">Control</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.map((log) => {
                          const isBlocked = userStatusMap[log.uid] || false;
                          return (
                            <TableRow key={log.id} className="hover:bg-primary/[0.04] dark:hover:bg-white/5 transition-colors border-black/5 dark:border-white/10">
                              <TableCell className="pl-10 py-6 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <div className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1">
                                    {log.timestamp ? format(log.timestamp.toDate(), 'MMM d, yyyy') : 'Pending...'}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase">
                                    <LogIn className="h-3 w-3" /> {log.timestamp ? format(log.timestamp.toDate(), 'hh:mm a') : '--:--'}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase opacity-40">
                                    <LogOut className="h-3 w-3" /> {log.exitTimestamp ? format(log.exitTimestamp.toDate(), 'hh:mm a') : '--:--'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-center">
                                  {getStatusBadge(log.status || 'active')}
                                </div>
                              </TableCell>
                              <TableCell className="font-black text-foreground">
                                <div className="flex flex-col">
                                  <span>{log.email}</span>
                                  <span className="text-[10px] opacity-40 uppercase tracking-widest mt-1">{log.userType} • {log.college_office}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-center">
                                  {log.duration ? (
                                    <Badge className="rounded-2xl bg-primary/10 text-primary border-none font-black text-[10px] py-1.5 px-4 w-32 flex justify-center">
                                      {log.duration} {log.duration === 1 ? 'MINUTE' : 'MINUTES'}
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="rounded-2xl font-black text-[10px] py-1.5 px-4 opacity-40 w-32 flex justify-center">
                                      IN PROGRESS
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate font-bold text-foreground/80">
                                {log.reason}
                              </TableCell>
                              <TableCell className="text-center pr-10">
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "h-12 w-32 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all border shadow-sm",
                                    isBlocked 
                                      ? "text-green-600 bg-green-500/10 border-green-500/20 hover:bg-green-600 hover:text-white" 
                                      : "text-destructive bg-destructive/5 border-destructive/10 hover:bg-destructive hover:text-white"
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
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
