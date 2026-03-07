'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { LoaderCircle, ChevronRight, UserCircle, Briefcase, GraduationCap, BookMarked } from 'lucide-react';
import { useState } from 'react';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { addVisitLog } from '@/lib/firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import type { AuthenticatedUser } from '@/contexts/auth-provider';
import { cn } from '@/lib/utils';

const visitReasons = [
  'Reading',
  'Research',
  'Computer Use',
  'Studying',
  'Others',
];

const userTypes = [
  { id: 'Student', icon: GraduationCap, label: 'Student' },
  { id: 'Faculty', icon: UserCircle, label: 'Faculty' },
  { id: 'Employee', icon: Briefcase, label: 'Employee' },
] as const;

const formSchema = z.object({
  userType: z.enum(['Student', 'Faculty', 'Employee'], {
    required_error: 'Please select your status.',
  }),
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogged, setIsLogged] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userType: 'Student',
      reason: '',
      otherReason: '',
    }
  });

  const selectedUserType = form.watch('userType');
  const selectedReason = form.watch('reason');

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const entryDate = new Date().toISOString().split('T')[0];
      const finalReason = data.reason === 'Others' ? data.otherReason!.trim() : data.reason;

      // Data Snapshotting: Include college_office and userType in the log
      addVisitLog({
        userId: user.uid,
        email: user.email!,
        userType: data.userType.toLowerCase() as any,
        college_office: user.college_office!,
        reason: finalReason,
        entryDate: entryDate,
      });

      toast({
        title: 'Welcome to NEU Library!',
        description: 'Your visit has been logged successfully. Signing out for the next user...',
      });
      
      setIsLogged(true);
      onLogSuccess?.();
      form.reset();

      // The Kiosk Reset: Auto-logout after 5 seconds
      setTimeout(() => {
        signOut();
      }, 5000);

    } catch (error) {
      console.error('Failed to log visit:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLogged) {
    return (
      <Card className="glass border-2 border-primary/20 shadow-2xl p-8 text-center animate-in zoom-in-95 duration-500">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BookMarked className="h-10 w-10" />
        </div>
        <CardTitle className="text-3xl font-bold mb-4">Welcome to NEU Library!</CardTitle>
        <CardDescription className="text-lg">
          Your visit has been recorded. This terminal will reset in a few seconds...
        </CardDescription>
        <div className="mt-8">
           <Button variant="outline" onClick={() => signOut()}>
             Logout Now
           </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass overflow-hidden border-2 border-white/10 shadow-2xl transition-all duration-500">
      <CardHeader className="bg-primary/5 pb-8 border-b border-white/5">
        <div className="flex items-center gap-3 mb-2 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="p-2 rounded-xl bg-primary/20 text-primary shadow-inner">
            <BookMarked className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Log Library Visit</CardTitle>
        </div>
        <CardDescription className="text-base text-muted-foreground/80">
          Affiliated with: <span className="text-primary font-semibold">{user.college_office}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-8 px-6 pb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="userType"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-lg font-semibold text-foreground">I am a...</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                    >
                      {userTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = selectedUserType === type.id;
                        const radioId = `user-type-${type.id}`;
                        return (
                          <div key={type.id} className="relative group">
                            <RadioGroupItem 
                              value={type.id} 
                              id={radioId}
                              className="sr-only" 
                            />
                            <Label
                              htmlFor={radioId}
                              className={cn(
                                "flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 h-full",
                                isSelected 
                                  ? "border-primary bg-primary/10 shadow-lg scale-[1.02] ring-2 ring-primary/20" 
                                  : "border-border/40 opacity-70 hover:opacity-100 hover:bg-accent/5 hover:border-border/80 hover:scale-[1.01]"
                              )}
                            >
                              <Icon className={cn("h-10 w-10 transition-all duration-300", isSelected ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground")} />
                              <span className={cn("text-base font-bold transition-colors", isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
                                {type.label}
                              </span>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-lg font-semibold text-foreground">Reason for Visit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-14 text-base glass border-2 transition-all hover:border-primary/50 focus:ring-primary/20">
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
                    <FormItem className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Type your reason here..." 
                          className="h-12 glass border-2 focus:border-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-16 text-xl font-bold shadow-2xl transition-all hover:scale-[1.01] active:scale-[0.99] rounded-2xl group" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle className="mr-2 h-6 w-6 animate-spin" />
              ) : (
                <>
                  Log My Visit
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
