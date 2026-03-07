'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { LoaderCircle, ChevronRight, BookMarked, LogOut, CheckCircle2, Info } from 'lucide-react';
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
        userId: user.uid,
        email: user.email!,
        userType: user.user_type as 'Student' | 'Staff' | 'Employee',
        college_office: user.college_office!,
        reason: finalReason,
        entryDate: entryDate,
      });

      if (user.role === 'admin') {
        toast({
          title: 'Visit Logged',
          description: 'Redirecting to Admin Dashboard...',
        });
        onLogSuccess?.();
        router.push('/admin');
      } else {
        toast({
          title: 'Visit recorded',
          description: 'Thank you for visiting the NEU Library.',
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
        title: "Error",
        description: "Failed to record your visit. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLogged) {
    return (
      <Card className="glass border-2 border-primary/20 shadow-2xl p-10 text-center animate-in zoom-in-95 duration-500">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10 text-green-500 animate-float">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <CardTitle className="text-3xl font-black mb-4">Visit Recorded</CardTitle>
        <CardDescription className="text-lg mb-8">
          Thank you for following university protocols. This terminal will reset shortly...
        </CardDescription>
        <Button 
          variant="outline" 
          onClick={() => signOut()}
          className="h-12 px-8 text-base font-bold rounded-2xl gap-2 hover:bg-primary hover:text-white transition-all"
        >
          <LogOut className="h-4 w-4" />
          Logout Now
        </Button>
      </Card>
    );
  }

  return (
    <Card className="glass overflow-hidden border-none shadow-2xl">
      <CardHeader className="bg-primary/5 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
              <BookMarked className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">Log Library Visit</CardTitle>
              <CardDescription>Confirm your details and purpose of visit</CardDescription>
            </div>
          </div>
          <Badge className="px-5 py-1.5 text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground rounded-full shadow-lg">
            {user.user_type}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-8 px-8 pb-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-muted/40 border border-border/40 backdrop-blur-sm transition-all hover:bg-muted/60">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Verified Classification</span>
                </div>
                <p className="text-xl font-black text-primary">{user.user_type}</p>
              </div>
              <div className="p-5 rounded-2xl bg-muted/40 border border-border/40 backdrop-blur-sm transition-all hover:bg-muted/60">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Verified Affiliation</span>
                </div>
                <p className="text-xl font-black text-primary truncate" title={user.college_office ?? ''}>
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
                  <FormLabel className="text-lg font-black tracking-tight flex items-center gap-2">
                    Reason for Visit
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-16 text-lg border-2 bg-background/50 transition-all hover:border-primary/50 rounded-2xl">
                        <SelectValue placeholder="Select purpose..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl shadow-2xl">
                      {visitReasons.map((reason) => (
                        <SelectItem key={reason} value={reason} className="py-4 text-base cursor-pointer">
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
                  <FormItem className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Please specify your reason here..." 
                        className="h-14 text-base border-2 bg-background/50 focus:border-primary rounded-2xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button 
              type="submit" 
              className="w-full h-20 text-2xl font-black shadow-2xl rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden" 
              disabled={isSubmitting}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-10 transition-opacity" />
              {isSubmitting ? (
                <LoaderCircle className="h-8 w-8 animate-spin" />
              ) : (
                <div className="flex items-center justify-center gap-3">
                  Confirm Entry
                  <ChevronRight className="h-7 w-7 transition-transform group-hover:translate-x-2" />
                </div>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}