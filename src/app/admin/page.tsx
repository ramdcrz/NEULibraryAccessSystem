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
  Filter
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
import jsPDF from 'jsPDF';
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-sm">
              <ShieldCheck className="h-4 w-4" />
              Admin Dashboard
            </div>
            <h1 className="text-4xl font-black tracking-tight">Access Analytics</h1>
            <p className="text-muted-foreground text-lg">
              Manage library access protocols and generate filtered activity reports.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 px-5 rounded-xl font-bold gap-2 transition-all"
            >
              <Search className="h-5 w-5" />
              {showFilters ? 'Hide Search' : 'Search Logs'}
            </Button>

            <Button 
              onClick={exportToPDF} 
              disabled={isExporting || logsLoading || filteredLogs.length === 0}
              className="h-12 px-6 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isExporting ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <FileDown className="h-5 w-5" />
              )}
              {isExporting ? 'Generating...' : 'Export PDF'}
            </Button>
          </div>
        </div>

        {/* Filter Controls - Toggleable */}
        {showFilters && (
          <Card className="glass border-none shadow-lg overflow-hidden animate-in slide-in-from-top-4 duration-500">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <Search className="h-3 w-3" />
                    Search By Email
                  </label>
                  <Input
                    placeholder="Enter email address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 rounded-xl border-2 bg-background/50 focus:border-primary transition-all"
                  />
                </div>

                <div className="w-full lg:w-auto space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3" />
                    Start Date
                  </label>
                  <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full lg:w-[200px] h-11 justify-start text-left font-normal rounded-xl border-2 bg-background/50",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="start">
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

                <div className="w-full lg:w-auto space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3" />
                    End Date
                  </label>
                  <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full lg:w-[200px] h-11 justify-start text-left font-normal rounded-xl border-2 bg-background/50",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="start">
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
                    className="h-11 px-4 rounded-xl font-bold gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <XCircle className="h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {logsError && (
          <Alert variant="destructive" className="glass border-2 border-destructive/20 shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-lg font-bold">Database Access Error</AlertTitle>
            <AlertDescription className="mt-4 space-y-4">
              <div className="bg-destructive/10 p-4 rounded-xl text-foreground">
                <p className="font-bold mb-2 text-lg flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Configuration Required:
                </p>
                <p className="text-sm">Please ensure a Composite Index exists for the visit_logs collection in the Firebase Console.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card className="glass border-2 border-white/10 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Filter className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">
                  {filteredLogs.length} Records Found
                </CardTitle>
                <CardDescription>
                  {searchQuery || startDate || endDate 
                    ? `Filtered view active`
                    : "Displaying full university visit history"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">
                Scanning database...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                <h3 className="text-xl font-bold">No records match your criteria</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
                <Button variant="link" onClick={clearFilters} className="font-bold">Reset Filters</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-bold">Date & Time</TableHead>
                      <TableHead className="font-bold">Email</TableHead>
                      <TableHead className="font-bold">Classification</TableHead>
                      <TableHead className="font-bold">College / Office</TableHead>
                      <TableHead className="font-bold">Purpose</TableHead>
                      <TableHead className="font-bold text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const isBlocked = userStatusMap[log.uid] || false;
                      
                      return (
                        <TableRow key={log.id} className="hover:bg-white/5 transition-colors group">
                          <TableCell className="whitespace-nowrap font-medium opacity-80">
                            {log.timestamp ? format(log.timestamp.toDate(), 'MMM d, h:mm a') : 'Pending...'}
                          </TableCell>
                          <TableCell className="font-semibold">{log.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize bg-primary/5 text-primary border-primary/20 font-bold px-3">
                              {log.userType}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate italic opacity-80">{log.college_office}</TableCell>
                          <TableCell className="max-w-[300px] truncate text-muted-foreground">
                            {log.reason}
                          </TableCell>
                          <TableCell className="text-center">
                            {log.uid && log.timestamp ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-9 px-4 font-bold rounded-xl gap-2 transition-all active:scale-95 border border-transparent",
                                  isBlocked 
                                    ? "text-green-600 hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/20" 
                                    : "text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                                )}
                                onClick={() => handleToggleBlock(log.uid, log.email)}
                                disabled={blockingUid === log.uid}
                              >
                                {blockingUid === log.uid ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : isBlocked ? (
                                  <>
                                    <UserCheck className="h-4 w-4" />
                                    Unblock
                                  </>
                                ) : (
                                  <>
                                    <UserX className="h-4 w-4" />
                                    Block
                                  </>
                                )}
                              </Button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground uppercase font-black px-2 py-1 bg-muted rounded-md">Legacy Log</span>
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
