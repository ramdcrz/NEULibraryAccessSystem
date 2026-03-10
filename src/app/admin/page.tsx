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
  PieChart as PieChartIcon,
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
import { cn, formatDuration } from '@/lib/utils';
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
  LabelList
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
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

    const COLORS = [
      '#2563eb', 
      '#60a5fa', 
      '#818cf8', 
      '#22d3ee', 
      '#0369a1', 
    ];

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

  const isFiltered = searchQuery !== '' || startDate !== undefined || endDate !== undefined;

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
      "rounded-2xl border font-black text-[9px] px-3 py-1.5 flex gap-1.5 items-center justify-center pointer-events-none",
      isMobile ? "shadow-none w-28 text-[8px]" : "w-32 mx-auto"
    );
    switch(status) {
      case 'active':
        return <Badge className={cn(baseClasses, "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/10")}><Clock className="h-2.5 w-2.5" /> ACTIVE</Badge>;
      case 'completed':
        return <Badge className={cn(baseClasses, "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-600 hover:text-white")}><CheckCircle2 className="h-2.5 w-2.5" /> COMPLETED</Badge>;
      case 'auto-closed':
        return <Badge className={cn(baseClasses, "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/10")}><AlertCircle className="h-2.5 w-2.5" /> AUTO-CLOSED</Badge>;
      default:
        return <Badge variant="outline" className={cn(baseClasses, "opacity-40 hover:bg-transparent")}>UNKNOWN</Badge>;
    }
  };

  return (
    <main className="flex-1 px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-in-out">
      <Tabs defaultValue="activity" className="space-y-8 sm:space-y-12">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 sm:gap-8">
          <div className="flex flex-col gap-2 sm:gap-3 text-left">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.4em] text-[8px] sm:text-[10px] opacity-60">
              <ShieldCheck className="h-3.5 w-3.5" />
              Administrative Access System
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-blue-gradient pb-4 px-1">
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
              className="h-12 px-6 font-black text-[10px] uppercase tracking-widest rounded-full transition-all blue-gradient text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 w-full lg:w-auto"
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <Card className="glass rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-10 border border-black/5 dark:border-white/18 shadow-xl shadow-primary/5 animate-in slide-in-from-left-4 duration-1000">
              <CardHeader className="p-0 mb-6 sm:mb-10 text-left">
                <CardTitle className="text-xl sm:text-2xl font-black tracking-tight">Classification Distribution</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Visits by User Type</CardDescription>
              </CardHeader>
              <CardContent className="p-0 h-[300px] sm:h-[400px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <BarChart data={chartData.userType} margin={{ top: 30, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      dataKey="name" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 9, fontWeight: 900 }}
                      tickFormatter={(val) => val.toUpperCase()}
                    />
                    <YAxis hide domain={[0, 'auto']} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent gap={6} />} />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--primary))" 
                      radius={[12, 12, 0, 0]} 
                      barSize={80}
                    >
                      <LabelList 
                        dataKey="value" 
                        position="top" 
                        offset={10} 
                        className="fill-foreground font-black text-[9px]"
                      />
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

            <Card className="glass rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-10 border border-black/5 dark:border-white/18 shadow-xl shadow-primary/5 animate-in slide-in-from-right-4 duration-1000">
              <CardHeader className="p-0 mb-6 sm:mb-10 text-left">
                <CardTitle className="text-xl sm:text-2xl font-black tracking-tight">Top Affiliations</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Most active colleges & offices</CardDescription>
              </CardHeader>
              <CardContent className="p-0 h-[300px] sm:h-[400px] w-full flex flex-col">
                <div className="flex-1">
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <PieChart>
                      <Pie
                        data={chartData.college}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        innerRadius={40}
                        stroke="none"
                      >
                        {chartData.college.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity" />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <ChartLegend 
                        content={<ChartLegendContent nameKey="name" />} 
                        verticalAlign="bottom" 
                      />
                    </PieChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
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
                  "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
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

                    <div className="flex gap-4 w-full lg:w-auto">
                      <div className="space-y-2 flex-1 lg:w-[180px] text-left">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          Start Date
                        </label>
                        <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-11 justify-start text-left font-bold rounded-xl border-2 bg-background/50 dark:bg-blue-900/20 transition-all hover:bg-primary/5 hover:text-primary hover:border-primary/20 border-primary/10",
                                !startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-3 h-4 w-4" />
                              {startDate ? format(startDate, "PP") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-[1.5rem] border glass shadow-2xl" align="start" sideOffset={8}>
                            <Calendar
                              mode="single"
                              selected={startDate}
                              onSelect={(date) => {
                                setStartDate(date);
                                if (date && endDate && isBefore(endDate, startOfDay(date))) {
                                  setEndDate(undefined);
                                }
                                setIsStartOpen(false);
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2 flex-1 lg:w-[180px] text-left">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          End Date
                        </label>
                        <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-11 justify-start text-left font-bold rounded-xl border-2 bg-background/50 dark:bg-blue-900/20 transition-all hover:bg-primary/5 hover:text-primary hover:border-primary/20 border-primary/10",
                                !endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-3 h-4 w-4" />
                              {endDate ? format(endDate, "PP") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-[1.5rem] border glass shadow-2xl" align="start" sideOffset={8}>
                            <Calendar
                              mode="single"
                              selected={endDate}
                              onSelect={(date) => {
                                setEndDate(date);
                                setIsEndOpen(false);
                              }}
                              disabled={startDate ? { before: startDate } : undefined}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
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
              ) : filteredLogs.length === 0 ? (
                <div className="p-20 sm:p-40 text-center flex flex-col items-center gap-6 sm:gap-8">
                  <Search className="h-10 w-10 sm:h-12 w-12 text-muted-foreground opacity-20" />
                  <div className="space-y-1 sm:space-y-2">
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight">No Logs Detected</h3>
                    <p className="text-sm text-muted-foreground font-bold">Adjust filters to display system data.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="hidden xl:block w-full overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
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
                                  <Badge 
                                    className={cn(
                                      "rounded-2xl font-black text-[10px] py-1.5 px-4 w-32 flex justify-center border-none pointer-events-none shadow-none uppercase",
                                      isOngoing 
                                        ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" 
                                        : "bg-primary/10 text-primary hover:bg-primary/10"
                                    )}
                                  >
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

                  <div className="xl:hidden space-y-4 p-4 pb-24">
                    {filteredLogs.map((log) => {
                      const isBlocked = userStatusMap[log.uid] || false;
                      const isOngoing = !log.duration;
                      const dateStr = log.timestamp ? format(log.timestamp.toDate(), 'MMMM d, yyyy') : 'Pending...';
                      const timeIn = log.timestamp ? format(log.timestamp.toDate(), 'hh:mm a') : '--:--';
                      const timeOut = log.exitTimestamp ? format(log.exitTimestamp.toDate(), 'hh:mm a') : '--:--';
                      const durationStr = formatDuration(log.duration);

                      return (
                        <Card key={log.id} className="glass border border-black/5 dark:border-white/15 rounded-2xl overflow-hidden shadow-sm animate-in zoom-in-95 duration-500">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between gap-4 items-start text-left">
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                  {dateStr.toUpperCase()}
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
                                  "rounded-xl font-black text-[8px] py-1 px-2 border-none shadow-none uppercase shrink-0 w-28 justify-center text-center pointer-events-none",
                                  isOngoing ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" : "bg-primary/10 text-primary"
                                )}>
                                  {durationStr}
                                </Badge>
                              </div>
                            </div>

                            <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-center justify-between">
                              <div className="space-y-0.5 flex-1 text-left">
                                <div className="flex items-center gap-1.5 text-[8px] font-black text-foreground/40 uppercase tracking-widest leading-none">
                                  <LogIn className="h-2.5 w-2.5" /> Time In
                                </div>
                                <div className="text-sm font-black text-primary uppercase leading-tight">
                                  {timeIn}
                                </div>
                              </div>
                              <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-2" />
                              <div className="space-y-0.5 flex-1 text-right">
                                <div className="flex items-center justify-end gap-1.5 text-[8px] font-black text-foreground/40 uppercase tracking-widest leading-none">
                                  <LogOut className="h-2.5 w-2.5" /> Time Out
                                </div>
                                <div className="text-sm font-black text-muted-foreground uppercase opacity-40 leading-tight">
                                  {timeOut}
                                </div>
                              </div>
                            </div>

                            <div className="text-[10px] font-black text-foreground/60 uppercase tracking-widest flex items-center gap-2 border-l-2 border-primary/20 pl-2.5 py-0.5 text-left">
                              Purpose: {log.reason}
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
