
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { LoaderCircle, ChevronRight, BookMarked, LogOut, CheckCircle2 } from 'lucide-react';
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
          title: 'Visit logged successfully',
          description: 'Thank you for visiting NEU Library.',
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
      <Card className="glass border-2 border-primary/20 shadow-2xl p-8 text-center animate-in zoom-in-95 duration-500">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 text-green-500">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <CardTitle className="text-3xl font-bold mb-4">Visit Recorded</CardTitle>
        <CardDescription className="text-lg">
          Thanks for utilizing the NEU Library! This terminal will reset shortly...
        </CardDescription>
        <div className="mt-8">
           <Button 
            variant="outline" 
            onClick={() => signOut()}
            className="h-12 px-6 text-base font-bold rounded-2xl gap-2"
           >
             <LogOut className="h-4 w-4" />
             Logout Now
           </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass overflow-hidden border-2 border-white/10 shadow-2xl">
      <CardHeader className="bg-primary/5 pb-8 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20 text-primary shadow-inner">
              <BookMarked className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">Log Library Visit</CardTitle>
            </div>
          </div>
          <Badge variant="outline" className="px-4 py-1 text-sm font-bold bg-primary/5 border-primary/20">
            {user.user_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-8 px-6 pb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Classification</p>
                <p className="text-lg font-bold">{user.user_type}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Affiliation</p>
                <p className="text-lg font-bold">{user.college_office}</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-lg font-semibold">Reason for Visit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-14 text-base glass border-2 transition-all hover:border-primary/50">
                        <SelectValue placeholder="What brings you to the library today?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass">
                      {visitReasons.map((reason) => (
                        <SelectItem key={reason} value={reason} className="py-3 text-base">
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
                  <FormItem className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Please specify your reason..." 
                        className="h-12 glass border-2 focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button 
              type="submit" 
              className="w-full h-16 text-xl font-bold shadow-2xl rounded-2xl group" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle className="mr-2 h-6 w-6 animate-spin" />
              ) : (
                <>
                  Confirm Entry
                  <ChevronRight className="ml-2 h-6 w-6 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
