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
import { format, startOfDay, endOfDay, isAfter, isBefore, parseISO } from 'date-fns';
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
      '#2563eb', // Royal Blue
      '#60a5fa', // Sky Blue
      '#818cf8', // Soft Indigo
      '#22d3ee', // Cyan
      '#0369a1', // Deep Ocean
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
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text('NEU Library Access System', 14, 22);
      
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text('University Library Visit Activity Report', 14, 32);
      
      const groupedByDate: Record<string, typeof filteredLogs> = {};
      filteredLogs.forEach(log => {
        const dateKey = log.entryDate || (log.timestamp ? format(log.timestamp.toDate(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
        groupedByDate[dateKey].push(log);
      });

      const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

      let currentY = 45;

      sortedDates.forEach((dateStr) => {
        const logsForDate = groupedByDate[dateStr];
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        const formattedDate = format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
        doc.text(formattedDate.toUpperCase(), 14, currentY);
        currentY += 6;

        const tableRows = logsForDate.map(log => {
          const durationStr = formatDuration(log.duration, 'Ongoing', false);
          const isOngoing = durationStr === 'Ongoing';

          return [
            log.timestamp ? format(log.timestamp.toDate(), 'hh:mm a') : 'Pending...',
            log.exitTimestamp ? format(log.exitTimestamp.toDate(), 'hh:mm a') : '--:--',
            log.email,
            log.userType,
            isOngoing ? { content: 'Ongoing', styles: { textColor: [22, 163, 74], fontStyle: 'bold' } } : durationStr,
            log.reason
          ];
        });

        autoTable(doc, {
          startY: currentY,
          head: [['Time In', 'Time Out', 'User', 'Type', 'Duration', 'Purpose']],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8, fontStyle: 'bold' },
          styles: { fontSize: 7, cellPadding: 2.5 },
          margin: { bottom: 20 },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 35 },
          },
        });

        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 15;
      });

      const pageCount = doc.internal.getNumberOfPages();
      const generationDate = format(new Date(), 'MMMM d, yyyy HH:mm');
      
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated on: ${generationDate}`, 14, pageHeight - 10);
        const pageLabel = `Page ${i} of ${pageCount}`;
        const labelWidth = doc.getTextWidth(pageLabel);
        doc.text(pageLabel, (pageWidth - labelWidth) / 2, pageHeight - 10);
        const systemId = "NEU Library Access System";
        const idWidth = doc.getTextWidth(systemId);
        doc.text(systemId, pageWidth - idWidth - 14, pageHeight - 10);
      }

      doc.save(`NEULibrary_Audit_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: "Report Finalized", description: "Audit documentation downloaded." });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({ variant: "destructive", title: "Export Error", description: "System failed to render PDF." });
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
      isMobile ? "shadow-sm" : "w-32 mx-auto"
    );
    switch(status) {
      case 'active':
        return <Badge className={cn(baseClasses, "bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-none hover:bg-blue-500/10")}><Clock className="h-2.5 w-2.5" /> ACTIVE</Badge>;
      case 'completed':
        return <Badge className={cn(baseClasses, "bg-green-500/10 text-green-600 border-green-500/20 shadow-none hover:bg-green-500/10")}><CheckCircle2 className="h-2.5 w-2.5" /> COMPLETED</Badge>;
      case 'auto-closed':
        return <Badge className={cn(baseClasses, "bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-none hover:bg-amber-500/10")}><AlertCircle className="h-2.5 w-2.5" /> AUTO-CLOSED</Badge>;
      default:
        return <Badge variant="outline" className={cn(baseClasses, "opacity-40 shadow-none hover:bg-transparent")}>UNKNOWN</Badge>;
    }
  };

  return (
    <main className="flex-1 px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-in-out">
      <Tabs defaultValue="activity" className="space-y-8 sm:space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8">
          <div className="flex flex-col gap-2 sm:gap-3">
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
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            <TabsList className="h-12 p-1 border border-black/5 dark:border-white/10 rounded-full w-full sm:w-[280px] grid grid-cols-2 bg-transparent shadow-sm">
              <TabsTrigger 
                value="activity" 
                className={cn(
                  "rounded-full font-black text-[9px] uppercase tracking-widest transition-all h-full gap-2",
                  "text-muted-foreground bg-transparent", 
                  "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 data-[state=active]:ring-2 data-[state=active]:ring-primary/20" 
                )}
              >
                <Activity className="h-3.5 w-3.5" />
                Activity
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
              className="h-12 px-6 font-black text-[10px] uppercase tracking-widest rounded-full transition-all blue-gradient text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 w-full sm:w-auto"
            >
              {isExporting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin mr-2" /> : <FileDown className="h-3.5 w-3.5 mr-2" />}
              Export Activity
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
              <Card key={i} className="glass rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 relative overflow-hidden group border border-black/5 dark:border-white/18 shadow-xl shadow-primary/5">
                <div className="absolute -bottom-8 -right-8 opacity-[0.15] group-hover:opacity-[0.22] transition-all duration-700 rotate-12 group-hover:rotate-6">
                  <stat.icon className="h-24 sm:h-32 w-24 sm:w-32 text-primary" />
                </div>
                <CardDescription className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] opacity-50 mb-2 sm:mb-3 relative z-10">{stat.label}</CardDescription>
                <CardTitle className="text-4xl sm:text-5xl font-black tracking-tighter relative z-10">{stat.val}</CardTitle>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <Card className="glass rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-10 border border-black/5 dark:border-white/18 shadow-xl shadow-primary/5">
              <CardHeader className="p-0 mb-6 sm:mb-10">
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

            <Card className="glass rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-10 border border-black/5 dark:border-white/18 shadow-xl shadow-primary/5">
              <CardHeader className="p-0 mb-6 sm:mb-10">
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
          <Card className="glass overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] border border-black/5 dark:border-white/18 shadow-xl shadow-primary/5">
            <CardHeader className="p-6 sm:p-10 border-b border-black/5 dark:border-white/10 flex flex-row items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-4 sm:gap-5">
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
                  showFilters 
                    ? "bg-primary/10 text-primary border-primary/20" 
                    : "border-black/5 dark:border-white/10 bg-white/5 hover:bg-primary/10 hover:text-primary"
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
                    <div className="flex-1 w-full space-y-2">
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
                      <div className="space-y-2 flex-1 lg:w-[180px]">
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

                      <div className="space-y-2 flex-1 lg:w-[180px]">
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
                  <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] opacity-30">Syncing logs...</p>
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
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
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
                          const isOngoing = !log.duration;
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
                              <TableCell className="max-w-[150px] truncate font-bold text-foreground/80">
                                {log.reason}
                              </TableCell>
                              <TableCell className="text-center pr-10">
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "h-12 w-32 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all border shadow-sm",
                                    isBlocked 
                                      ? "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-600 hover:text-white" 
                                      : "text-destructive dark:text-red-400 bg-destructive/5 border-destructive/10 hover:bg-destructive hover:text-white"
                                    )}
                                  onClick={() => handleToggleBlock(log.uid, log.email)}
                                  disabled={blockingUid === log.uid}
                                >
                                  {blockingUid === log.uid ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                  ) : isBlocked ? (
                                    <><UserCheck className="h-3.5 w-3.5 mr-2" />Restore</>
                                  ) : (
                                    <><UserX className="h-3.5 w-3.5 mr-2" />Block User</>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Activity Cards View (High-Density Optimized) */}
                  <div className="md:hidden space-y-3 p-3">
                    {filteredLogs.map((log) => {
                      const isBlocked = userStatusMap[log.uid] || false;
                      const isOngoing = !log.duration;
                      const dateStr = log.timestamp ? format(log.timestamp.toDate(), 'MMM d, yyyy') : 'Pending...';
                      const timeIn = log.timestamp ? format(log.timestamp.toDate(), 'hh:mm a') : '--:--';
                      const timeOut = log.exitTimestamp ? format(log.exitTimestamp.toDate(), 'hh:mm a') : '--:--';
                      const durationStr = formatDuration(log.duration);

                      return (
                        <Card key={log.id} className="glass border border-black/5 dark:border-white/20 rounded-[2rem] overflow-hidden shadow-lg shadow-primary/5">
                          <CardContent className="p-5 space-y-4">
                            {/* Header row: Date and Status (Minimized) */}
                            <div className="flex justify-between items-center mb-1">
                              <div className="text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">
                                {dateStr.toUpperCase()}
                              </div>
                              {getStatusBadge(log.status || 'active', true)}
                            </div>

                            {/* User identity & Duration */}
                            <div className="flex justify-between items-start gap-3">
                              <div className="space-y-0.5 overflow-hidden">
                                <div className="font-black text-lg text-foreground truncate leading-tight">
                                  {log.email}
                                </div>
                                <div className="text-[9px] font-black text-primary uppercase tracking-widest truncate">
                                  {log.userType} • {log.college_office}
                                </div>
                              </div>
                              <Badge className={cn(
                                "rounded-xl font-black text-[8px] py-1 px-3 border-none shadow-none uppercase flex-shrink-0",
                                isOngoing ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                              )}>
                                {durationStr}
                              </Badge>
                            </div>

                            {/* Time container (Compact Gray Box) */}
                            <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                              <div className="space-y-0.5 flex-1">
                                <div className="flex items-center gap-1.5 text-[8px] font-black text-foreground/40 uppercase tracking-widest">
                                  <LogIn className="h-2.5 w-2.5" /> Time In
                                </div>
                                <div className="text-sm font-black text-primary uppercase">
                                  {timeIn}
                                </div>
                              </div>
                              <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-3" />
                              <div className="space-y-0.5 flex-1 text-right">
                                <div className="flex items-center justify-end gap-1.5 text-[8px] font-black text-foreground/40 uppercase tracking-widest">
                                  <LogOut className="h-2.5 w-2.5" /> Time Out
                                </div>
                                <div className="text-sm font-black text-muted-foreground uppercase opacity-40">
                                  {timeOut}
                                </div>
                              </div>
                            </div>

                            {/* Purpose section (One-liner) */}
                            <div className="text-[10px] font-black text-foreground/60 uppercase tracking-widest flex items-center gap-2 border-l-2 border-primary/20 pl-3 py-0.5">
                              Purpose: {log.reason}
                            </div>

                            {/* Action button (Minimized) */}
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full h-12 font-black text-[9px] uppercase tracking-[0.2em] rounded-xl transition-all border shadow-sm flex items-center justify-center gap-2.5",
                                isBlocked 
                                  ? "text-green-600 bg-green-500/10 border-green-500/20" 
                                  : "text-destructive bg-destructive/5 border-destructive/10"
                                )}
                              onClick={() => handleToggleBlock(log.uid, log.email)}
                              disabled={blockingUid === log.uid}
                            >
                              {blockingUid === log.uid ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : isBlocked ? (
                                <><UserCheck className="h-3 w-3" /> Restore User</>
                              ) : (
                                <><UserX className="h-3 w-3" /> Block User</>
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
