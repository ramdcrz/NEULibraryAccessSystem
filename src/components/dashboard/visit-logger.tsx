'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  LoaderCircle, 
  ChevronRight, 
  Library, 
  LogOut, 
  CheckCircle2, 
  User, 
  School, 
  Clock, 
  MoveRight, 
  GraduationCap,
  UserCog,
  Briefcase,
  BookMarked,
  Calculator,
  Sprout,
  Palette,
  BarChart,
  MessageSquare,
  Cpu,
  Shield,
  BookOpen,
  PencilRuler,
  Microscope,
  Baby,
  Music,
  Stethoscope,
  Activity,
  Wind,
  Globe
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, isSameDay, differenceInHours, isAfter, setHours, setMinutes } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { addVisitLog, checkOutVisitLog, autoCloseVisitLog } from '@/lib/firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import type { AuthenticatedUser } from '@/contexts/auth-provider';
import { Separator } from '@/components/ui/separator';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const visitReasons = [
  'Study / Read',
  'Research',
  'Print / Scan',
  'Computer Use',
  'Borrow / Return Book',
  'Work',
  'Others',
];

const formSchema = z.object({
  reason: z.string({
    required_error: 'Please select a reason for your visit.',
  }),
});

function getUserTypeIcon(type: string | null | undefined) {
  switch (type) {
    case 'Student': return GraduationCap;
    case 'Staff': return UserCog;
    case 'Employee': return Briefcase;
    default: return User;
  }
}

function getAffiliationIcon(name: string | null | undefined) {
  if (!name) return School;
  
  const iconMap: Record<string, any> = {
    'College of Accountancy': Calculator,
    'College of Agriculture': Sprout,
    'College of Arts and Science': Palette,
    'College of Business Administration': BarChart,
    'College of Communication': MessageSquare,
    'College of Informatics and Computing Studies': Cpu,
    'College of Criminology': Shield,
    'College of Education': BookOpen,
    'College of Engineering and Architecture': PencilRuler,
    'College of Medical Technology': Microscope,
    'College of Midwifery': Baby,
    'College of Music': Music,
    'College of Nursing': Stethoscope,
    'College of Physical Therapy': Activity,
    'College of Respiratory Therapy': Wind,
    'School of International Relations': Globe,
  };

  return iconMap[name] || BookMarked;
}

export default function VisitLogger({ user, onLogSuccess }: { user: AuthenticatedUser; onLogSuccess?: () => void }) {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [smartActiveLog, setSmartActiveLog] = useState<any>(null);
  
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerProgress, setTimerProgress] = useState(100);
  
  // High-Fidelity Sync: 5 Second confirmation timer (100 steps * 50ms)
  const [confirmProgress, setConfirmProgress] = useState(100);
  
  const submitRef = useRef<boolean>(false);

  const UserTypeIcon = getUserTypeIcon(user.user_type);
  const AffiliationIcon = getAffiliationIcon(user.college_office);

  const activeSessionQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'visit_logs'),
      where('uid', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
  }, [firestore, user?.uid]);

  const { data: recentLogs, isLoading: logsLoading } = useCollection(activeSessionQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: '',
    }
  });

  useEffect(() => {
    if (logsLoading || smartActiveLog || isLogged || user.role === 'admin' || submitRef.current) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!submitRef.current) {
            handleAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
      setTimerProgress((prev) => Math.max(0, prev - (100 / 60)));
    }, 1000);

    return () => clearInterval(interval);
  }, [logsLoading, smartActiveLog, isLogged, user.role]);

  // Unified Success Timer: 5 Seconds precisely
  useEffect(() => {
    if (!isLogged) return;

    const interval = setInterval(() => {
      setConfirmProgress((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1; 
      });
    }, 50); // 100 steps * 50ms = 5000ms (5 seconds)

    return () => clearInterval(interval);
  }, [isLogged]);

  useEffect(() => {
    if (isLogged && confirmProgress <= 0) {
      signOut();
    }
  }, [isLogged, confirmProgress, signOut]);

  const handleAutoSubmit = () => {
    const values = form.getValues();
    const reason = values.reason || 'Others';
    onSubmit({ reason });
  };

  useEffect(() => {
    if (recentLogs && recentLogs.length > 0) {
      const lastLog = recentLogs[0];
      
      if (lastLog.status === 'active') {
        const entryTime = lastLog.timestamp?.toDate();
        if (!entryTime) return;

        const now = new Date();
        const sameDay = isSameDay(entryTime, now);
        const closingTime = setMinutes(setHours(entryTime, 18), 0);
        const isPastClosing = isAfter(now, closingTime);
        const hoursDiff = differenceInHours(now, entryTime);

        if (sameDay && !isPastClosing && hoursDiff < 3) {
          setSmartActiveLog(lastLog);
        } else {
          autoCloseVisitLog(lastLog.id, lastLog.timestamp);
          setSmartActiveLog(null);
        }
      } else {
        setSmartActiveLog(null);
      }
    }
  }, [recentLogs]);

  const handleCheckOut = () => {
    if (!smartActiveLog || isSubmitting) return;
    setIsSubmitting(true);
    
    checkOutVisitLog(smartActiveLog.id, smartActiveLog.timestamp);
    
    toast({
      title: 'Check-Out Successful',
      description: 'Your library session has been closed.',
    });
    
    setIsLogged(true);
    onLogSuccess?.();
  }

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (isSubmitting || submitRef.current) return;
    submitRef.current = true;
    setIsSubmitting(true);
    
    const entryDate = new Date().toISOString().split('T')[0];
    
    addVisitLog({
      uid: user.uid,
      email: user.email!,
      userType: user.user_type as 'Student' | 'Staff' | 'Employee',
      college_office: user.college_office!,
      reason: data.reason || 'Others',
      entryDate: entryDate,
    });

    if (user.role === 'admin') {
      toast({
        title: 'Log Finalized',
        description: 'Access recorded. Opening analytics portal...',
      });
      onLogSuccess?.();
      router.push('/admin');
    } else {
      toast({
        title: 'Entry Confirmed',
        description: 'Your campus visit has been successfully recorded.',
      });
      
      setIsLogged(true);
      onLogSuccess?.();
    }
  }

  if (logsLoading) {
    return (
      <div className="flex p-20 flex-col items-center justify-center gap-6">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Authenticating Session...</p>
      </div>
    );
  }

  if (isLogged) {
    return (
      <Card className="glass p-12 text-center animate-in zoom-in-95 duration-500 rounded-[3rem] border border-black/5 dark:border-white/20 shadow-2xl shadow-primary/10 relative overflow-hidden">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10 text-green-500 shadow-inner">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <CardTitle className="text-4xl font-black mb-4 tracking-tighter text-foreground">Access Managed</CardTitle>
        <CardDescription className="text-lg font-medium mb-10 text-muted-foreground px-4 leading-relaxed">
          The system is now preparing for the next user.
        </CardDescription>
        <Button 
          variant="ghost" 
          onClick={() => signOut()}
          className="h-11 px-8 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all border border-black/5 dark:border-white/10 bg-white/5 shadow-sm hover:bg-primary hover:text-white mx-auto mb-8"
        >
          <LogOut className="h-4 w-4 mr-2" />
          End Session
        </Button>
        <div className="absolute bottom-0 left-0 w-full h-2 bg-black/5">
          <div 
            className="h-full bg-green-500 transition-all duration-75 ease-linear"
            style={{ width: `${confirmProgress}%` }}
          />
        </div>
      </Card>
    );
  }

  if (smartActiveLog) {
    return (
      <Card className="glass rounded-[3rem] overflow-hidden border border-black/5 dark:border-white/20 shadow-2xl shadow-primary/10 animate-in fade-in duration-700">
        <CardHeader className="bg-white/5 pb-10 pt-10 px-10 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-5">
            <div className="p-3.5 rounded-2xl blue-gradient text-white shadow-inner">
              <Clock className="h-8 w-8" />
            </div>
            <div className="text-left">
              <CardTitle className="text-3xl font-black tracking-tighter text-blue-gradient">Active Session</CardTitle>
              <CardDescription className="text-sm font-medium opacity-60 mt-1">Check-out required to finalize duration</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-10 px-10 pb-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-8 rounded-3xl glass border border-black/5 dark:border-white/20 bg-primary/5 text-left">
              <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-3 flex items-center gap-2">
                <Library className="h-3 w-3" /> Started Entry
              </div>
              <p className="text-2xl font-black">
                {smartActiveLog.timestamp ? format(smartActiveLog.timestamp.toDate(), 'hh:mm a') : 'Syncing...'}
              </p>
            </div>
            <div className="p-8 rounded-3xl glass border border-black/5 dark:border-white/20 bg-primary/5 text-left">
              <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-3 flex items-center gap-2">
                <Clock className="h-3 w-3" /> Purpose
              </div>
              <p className="text-2xl font-black truncate">{smartActiveLog.reason}</p>
            </div>
          </div>
          <Button 
            onClick={handleCheckOut}
            disabled={isSubmitting}
            className="w-full h-20 font-black uppercase tracking-[0.25em] text-sm rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] group blue-gradient text-white shadow-lg shadow-primary/20 border-none" 
          >
            {isSubmitting ? <LoaderCircle className="h-8 w-8 animate-spin" /> : (
              <div className="flex items-center justify-center gap-3">
                Check Out
                <MoveRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
              </div>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass rounded-[3rem] overflow-hidden border border-black/5 dark:border-white/20 shadow-2xl shadow-primary/10 relative">
      <CardHeader className="bg-white/5 pb-10 pt-10 px-10 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-5">
          <div className="p-3.5 rounded-2xl blue-gradient text-white border border-black/5 dark:border-white/20 shadow-inner">
            <Library className="h-8 w-8" />
          </div>
          <div className="text-left">
            <CardTitle className="leading-none">
              <span className="text-3xl font-black tracking-tighter text-blue-gradient">Visit Log</span>
            </CardTitle>
            <CardDescription className="text-sm font-medium opacity-60 tracking-tight text-muted-foreground mt-1">Identity verification system</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-10 px-10 pb-12">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
              <div className="md:col-span-2 p-6 rounded-3xl glass flex flex-col items-start justify-center text-left border border-black/5 dark:border-white/20 hover:bg-black/5 transition-all relative overflow-hidden group">
                <div className="absolute -bottom-20 -right-20 opacity-[0.1] group-hover:opacity-[0.15] transition-all duration-700 rotate-12 group-hover:rotate-6">
                  <UserTypeIcon className="h-40 w-40 text-primary" />
                </div>
                <div className="flex items-center gap-2 mb-2 text-primary/60 relative z-10">
                  <UserTypeIcon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">ID Class</span>
                </div>
                <p className="text-lg font-black text-foreground relative z-10">{user.user_type}</p>
              </div>
              <div className="md:col-span-3 p-6 rounded-3xl glass border border-black/5 dark:border-white/20 hover:bg-black/5 transition-all relative overflow-hidden group text-left">
                <div className="absolute -bottom-20 -right-20 opacity-[0.1] group-hover:opacity-[0.15] transition-all duration-700 rotate-12 group-hover:rotate-6">
                  <AffiliationIcon className="h-40 w-40 text-primary" />
                </div>
                <div className="flex items-center gap-2 mb-2 text-primary/60 relative z-10">
                  <AffiliationIcon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">University Affiliation</span>
                </div>
                <p className="text-base font-black text-foreground truncate relative z-10">
                  {user.college_office}
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="space-y-4 text-left">
                  <FormLabel className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
                    Primary Purpose of Entry
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-16 text-lg font-bold border-2 bg-white/5 transition-all hover:border-primary/30 rounded-2xl px-6 text-foreground">
                        <SelectValue placeholder="Select purpose..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl border-black/5 dark:border-white/20 glass shadow-2xl">
                      {visitReasons.map((reason) => (
                        <SelectItem key={reason} value={reason} className="py-4 px-6 text-base font-bold cursor-pointer rounded-xl hover:bg-primary/5">
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-20 font-black uppercase tracking-[0.25em] text-sm rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] group blue-gradient text-white shadow-lg shadow-primary/20 border-none" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle className="h-8 w-8 animate-spin" />
              ) : (
                <div className="flex items-center justify-center gap-3">
                  Log Entry
                  <ChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>

      {timeLeft > 0 && !isSubmitting && !logsLoading && !smartActiveLog && !isLogged && user.role !== 'admin' && (
        <div className="absolute bottom-0 left-0 w-full h-2 bg-black/5">
          <div 
            className={cn(
              "h-full transition-all duration-1000 ease-linear",
              timeLeft > 15 ? "bg-primary" : "bg-amber-500"
            )}
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      )}
    </Card>
  );
}
