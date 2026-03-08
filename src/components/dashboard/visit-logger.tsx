
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { LoaderCircle, ChevronRight, Library, LogOut, CheckCircle2, User, School, Clock, MoveRight } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { addVisitLog, checkOutVisitLog } from '@/lib/firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import type { AuthenticatedUser } from '@/contexts/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';

const visitReasons = [
  'Reading',
  'Research',
  'Computer Use',
  'Studying',
  'Others',
];

const formSchema = z.object({
  reason: z.string({
    required_error: 'Please select a reason for your visit.',
  }),
  otherReason: z.string().optional(),
}).refine((data) => {
  if (data.reason === 'Others') {
    return data.otherReason && data.otherReason.trim().length > 3;
  }
  return true;
}, {
  message: "Please specify your reason (minimum 4 characters).",
  path: ["otherReason"],
});

export default function VisitLogger({ user, onLogSuccess }: { user: AuthenticatedUser; onLogSuccess?: () => void }) {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogged, setIsLogged] = useState(false);

  // Check for active session
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
  const activeLog = recentLogs && recentLogs.length > 0 && !recentLogs[0].exitTimestamp ? recentLogs[0] : null;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: '',
      otherReason: '',
    }
  });

  const selectedReason = form.watch('reason');

  async function handleCheckOut() {
    if (!activeLog) return;
    setIsSubmitting(true);
    try {
      checkOutVisitLog(activeLog.id, activeLog.timestamp);
      toast({
        title: 'Check-Out Successful',
        description: 'Your library session has been closed.',
      });
      setIsLogged(true);
      onLogSuccess?.();
      setTimeout(() => signOut(), 3000);
    } catch (error) {
      console.error('Check-out failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const entryDate = new Date().toISOString().split('T')[0];
      const finalReason = data.reason === 'Others' ? data.otherReason!.trim() : data.reason;

      addVisitLog({
        uid: user.uid,
        email: user.email!,
        userType: user.user_type as 'Student' | 'Staff' | 'Employee',
        college_office: user.college_office!,
        reason: finalReason,
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
        
        setTimeout(() => {
          signOut();
        }, 3000);
      }

    } catch (error) {
      console.error('Failed to log visit:', error);
      toast({
        variant: "destructive",
        title: "Submission Failure",
        description: "A database error occurred. Please refresh and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (logsLoading) {
    return (
      <Card className="glass p-20 flex flex-col items-center justify-center gap-6 rounded-[3rem] border border-black/5 dark:border-white/20">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary/30" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Authenticating Session...</p>
      </Card>
    );
  }

  if (isLogged) {
    return (
      <Card className="glass p-12 text-center animate-in zoom-in-95 duration-500 rounded-[3rem] border border-black/5 dark:border-white/20 shadow-2xl shadow-primary/10">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10 text-green-500 shadow-inner">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <CardTitle className="text-4xl font-black mb-4 tracking-tighter text-foreground">Access Managed</CardTitle>
        <CardDescription className="text-lg font-medium mb-10 text-muted-foreground px-4 leading-relaxed">
          The terminal is now preparing for the next user.
        </CardDescription>
        <Button 
          variant="ghost" 
          onClick={() => signOut()}
          className="h-11 px-8 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all border border-black/5 dark:border-white/10 bg-white/5 shadow-sm hover:bg-primary/10 hover:text-primary mx-auto"
        >
          <LogOut className="h-4 w-4 mr-2" />
          End Session
        </Button>
      </Card>
    );
  }

  if (activeLog) {
    return (
      <Card className="glass rounded-[3rem] overflow-hidden border border-black/5 dark:border-white/20 shadow-2xl shadow-primary/10 animate-in fade-in duration-700">
        <CardHeader className="bg-white/5 pb-10 pt-10 px-10 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-3.5 rounded-2xl blue-gradient text-white shadow-inner">
                <Clock className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black tracking-tighter text-blue-gradient">Active Session</CardTitle>
                <CardDescription className="text-sm font-medium opacity-60 mt-1">Check-out required to finalize duration</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-10 px-10 pb-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-8 rounded-3xl glass border border-black/5 dark:border-white/20 bg-primary/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-3 flex items-center gap-2">
                <Library className="h-3 w-3" /> Started Entry
              </div>
              <p className="text-2xl font-black">
                {activeLog.timestamp ? format(activeLog.timestamp.toDate(), 'hh:mm a') : 'Syncing...'}
              </p>
              <p className="text-xs font-bold opacity-40 mt-1">
                {activeLog.timestamp ? format(activeLog.timestamp.toDate(), 'PP') : 'Pending...'}
              </p>
            </div>
            <div className="p-8 rounded-3xl glass border border-black/5 dark:border-white/20 bg-primary/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-3 flex items-center gap-2">
                <Clock className="h-3 w-3" /> Purpose
              </div>
              <p className="text-2xl font-black truncate">{activeLog.reason}</p>
              <p className="text-xs font-bold opacity-40 mt-1">Verified Identity</p>
            </div>
          </div>

          <Separator className="bg-black/5" />

          <Button 
            onClick={handleCheckOut}
            disabled={isSubmitting}
            className="w-full h-20 font-black uppercase tracking-[0.25em] text-sm rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] group blue-gradient text-white shadow-lg shadow-primary/20 border-none" 
          >
            {isSubmitting ? <LoaderCircle className="h-8 w-8 animate-spin" /> : (
              <div className="flex items-center justify-center gap-3">
                Finalize & Check-Out
                <MoveRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
              </div>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass rounded-[3rem] overflow-hidden border border-black/5 dark:border-white/20 shadow-2xl shadow-primary/10">
      <CardHeader className="bg-white/5 dark:bg-white/5 pb-10 pt-10 px-10 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-3.5 rounded-2xl blue-gradient text-white border border-black/5 dark:border-white/20 shadow-inner">
              <Library className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="leading-none">
                <span className="text-3xl font-black tracking-tighter text-blue-gradient">Visit Log</span>
              </CardTitle>
              <CardDescription className="text-sm font-medium opacity-60 tracking-tight text-muted-foreground mt-1">Identity verification terminal</CardDescription>
            </div>
          </div>
          <Badge className="px-6 py-2 text-[10px] font-black uppercase tracking-[0.25em] blue-gradient text-white rounded-full shadow-lg shadow-primary/20 border-none">
            {user.user_type}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-10 px-10 pb-12">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
              <div className="md:col-span-2 p-6 rounded-3xl glass flex flex-col items-start justify-center text-left border border-black/5 dark:border-white/20 hover:bg-black/5 transition-all relative overflow-hidden group">
                <div className="absolute -bottom-20 -right-20 opacity-[0.15] group-hover:opacity-[0.22] transition-all duration-700 rotate-12 group-hover:rotate-6">
                  <User className="h-40 w-40 text-primary" />
                </div>
                <div className="flex items-center gap-2 mb-2 text-primary/60 relative z-10">
                  <User className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">ID Class</span>
                </div>
                <p className="text-lg font-black text-foreground relative z-10">{user.user_type}</p>
              </div>
              <div className="md:col-span-3 p-6 rounded-3xl glass border border-black/5 dark:border-white/20 hover:bg-black/5 transition-all relative overflow-hidden group">
                <div className="absolute -bottom-20 -right-20 opacity-[0.15] group-hover:opacity-[0.22] transition-all duration-700 rotate-12 group-hover:rotate-6">
                  <School className="h-40 w-40 text-primary" />
                </div>
                <div className="flex items-center gap-2 mb-2 text-primary/60 relative z-10">
                  <School className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">University Affiliation</span>
                </div>
                <p className="text-base font-black text-foreground truncate relative z-10" title={user.college_office ?? ''}>
                  {user.college_office}
                </p>
              </div>
            </div>

            <Separator className="bg-black/5 dark:bg-white/10" />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="space-y-4">
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedReason === 'Others' && (
              <FormField
                control={form.control}
                name="otherReason"
                render={({ field }) => (
                  <FormItem className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Please specify..." 
                        className="h-16 text-lg font-bold border-2 bg-white/5 focus:border-primary/50 rounded-2xl px-6 text-foreground"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button 
              type="submit" 
              className="w-full h-20 font-black uppercase tracking-[0.25em] text-sm rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] group blue-gradient text-white shadow-lg shadow-primary/20 border-none" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle className="h-8 w-8 animate-spin" />
              ) : (
                <div className="flex items-center justify-center gap-3">
                  Log Terminal Entry
                  <ChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
