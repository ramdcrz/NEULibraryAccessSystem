'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { LoaderCircle, ChevronRight, Library, LogOut, CheckCircle2, Info, User, School } from 'lucide-react';
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
import { addVisitLog } from '@/lib/firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import type { AuthenticatedUser } from '@/contexts/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

type VisitLoggerProps = {
  user: AuthenticatedUser;
  onLogSuccess?: () => void;
};

export default function VisitLogger({ user, onLogSuccess }: VisitLoggerProps) {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogged, setIsLogged] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: '',
      otherReason: '',
    }
  });

  const selectedReason = form.watch('reason');

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

  if (isLogged) {
    return (
      <Card className="glass border-none shadow-2xl p-12 text-center animate-in zoom-in-95 duration-500 rounded-[3rem]">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10 text-green-500 shadow-[0_0_40px_rgba(34,197,94,0.2)] transition-transform hover:scale-110">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <CardTitle className="text-4xl font-black mb-4 tracking-tighter">Access Granted</CardTitle>
        <CardDescription className="text-lg font-medium mb-10 text-muted-foreground px-4">
          Protocol requirement met. This terminal will reset to the login screen automatically.
        </CardDescription>
        <Button 
          variant="outline" 
          onClick={() => signOut()}
          className="h-14 px-10 text-base font-black rounded-2xl gap-2 hover:bg-primary hover:text-white transition-all border-2"
        >
          <LogOut className="h-5 w-5" />
          End Session
        </Button>
      </Card>
    );
  }

  return (
    <Card className="glass overflow-hidden border-none shadow-2xl rounded-[2.5rem]">
      <CardHeader className="bg-primary/5 pb-10 pt-8 px-8 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner transition-all hover:rotate-6 glow-primary">
              <Library className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tighter">Visit Log</CardTitle>
              <CardDescription className="text-sm font-medium">Verify credentials & state purpose</CardDescription>
            </div>
          </div>
          <Badge className="px-5 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] bg-primary text-primary-foreground rounded-full shadow-lg">
            {user.user_type}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-8 px-8 pb-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1 p-5 rounded-2xl bg-muted/40 border border-border/40 backdrop-blur-md transition-all hover:bg-muted/60 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <User className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Identity</span>
                </div>
                <p className="text-sm font-black text-foreground">{user.user_type}</p>
              </div>
              <div className="md:col-span-3 p-5 rounded-2xl bg-muted/40 border border-border/40 backdrop-blur-md transition-all hover:bg-muted/60">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <School className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Academic Affiliation</span>
                </div>
                <p className="text-sm font-black text-foreground truncate" title={user.college_office ?? ''}>
                  {user.college_office}
                </p>
              </div>
            </div>

            <Separator className="bg-border/40" />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-black tracking-tight flex items-center gap-2">
                    Primary Purpose of Visit
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-14 text-base font-medium border-2 bg-background/50 transition-all hover:border-primary/50 rounded-2xl px-5">
                        <SelectValue placeholder="Select one..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl shadow-2xl border-none">
                      {visitReasons.map((reason) => (
                        <SelectItem key={reason} value={reason} className="py-3 px-4 text-base font-medium cursor-pointer rounded-xl">
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
                  <FormItem className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Please specify (min. 4 characters)..." 
                        className="h-14 text-base font-medium border-2 bg-background/50 focus:border-primary rounded-2xl px-5"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button 
              type="submit" 
              className="w-full h-16 text-xl font-black shadow-2xl rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] group relative overflow-hidden glow-primary" 
              disabled={isSubmitting}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-10 transition-opacity" />
              {isSubmitting ? (
                <LoaderCircle className="h-7 w-7 animate-spin" />
              ) : (
                <div className="flex items-center justify-center gap-3">
                  Confirm University Entry
                  <ChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-2" />
                </div>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}