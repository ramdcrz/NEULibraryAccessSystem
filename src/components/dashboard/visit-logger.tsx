'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { LoaderCircle, ChevronRight, Library, LogOut, CheckCircle2, User, School } from 'lucide-react';
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
      <Card className="glass border-none p-12 text-center animate-in zoom-in-95 duration-500 rounded-[3rem]">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10 text-green-500">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <CardTitle className="text-4xl font-black mb-4 tracking-tighter">Access Granted</CardTitle>
        <CardDescription className="text-lg font-medium mb-10 text-muted-foreground px-4 leading-relaxed">
          Protocol requirement met. This terminal will reset automatically.
        </CardDescription>
        <Button 
          variant="outline" 
          onClick={() => signOut()}
          className="h-16 px-12 text-base font-black rounded-2xl gap-2 hover:bg-primary hover:text-white transition-all border-2"
        >
          <LogOut className="h-5 w-5" />
          End Session
        </Button>
      </Card>
    );
  }

  return (
    <Card className="glass border-none rounded-[3rem] overflow-hidden">
      <CardHeader className="bg-white/5 pb-10 pt-10 px-10 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary border border-white/20">
              <Library className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-3xl font-black tracking-tighter">Visit Log</CardTitle>
              <CardDescription className="text-sm font-medium opacity-60 tracking-tight">Identity verification terminal</CardDescription>
            </div>
          </div>
          <Badge className="px-6 py-2 text-[10px] font-black uppercase tracking-[0.25em] bg-primary text-primary-foreground rounded-full">
            {user.user_type}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-10 px-10 pb-12">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="md:col-span-1 p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 mb-2 text-primary/60">
                  <User className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">ID Class</span>
                </div>
                <p className="text-base font-black text-foreground">{user.user_type}</p>
              </div>
              <div className="md:col-span-3 p-6 rounded-3xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2 text-primary/60">
                  <School className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">University Affiliation</span>
                </div>
                <p className="text-base font-black text-foreground truncate" title={user.college_office ?? ''}>
                  {user.college_office}
                </p>
              </div>
            </div>

            <Separator className="bg-white/10" />

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
                      <SelectTrigger className="h-16 text-lg font-bold border-2 bg-white/5 transition-all hover:border-primary/30 rounded-2xl px-6">
                        <SelectValue placeholder="Select purpose..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-[2rem] border-white/10 glass">
                      {visitReasons.map((reason) => (
                        <SelectItem key={reason} value={reason} className="py-4 px-6 text-base font-bold cursor-pointer rounded-xl">
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
                        className="h-16 text-lg font-bold border-2 bg-white/5 focus:border-primary/50 rounded-2xl px-6"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button 
              type="submit" 
              className="w-full h-20 text-xl font-black rounded-3xl transition-all hover:scale-[1.01] active:scale-[0.99] group bg-primary" 
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