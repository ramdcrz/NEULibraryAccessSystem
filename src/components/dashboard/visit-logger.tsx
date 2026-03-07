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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { addVisitLog } from '@/lib/firebase/firestore';
import type { AuthenticatedUser } from '@/contexts/auth-provider';
import { cn } from '@/lib/utils';

const visitReasons = [
  'Research',
  'Borrow/Return Books',
  'Use Computer',
  'Study',
  'Other',
];

const userTypes = [
  { id: 'Student', icon: GraduationCap },
  { id: 'Faculty', icon: UserCircle },
  { id: 'Employee', icon: Briefcase },
] as const;

const formSchema = z.object({
  userType: z.enum(['Student', 'Faculty', 'Employee'], {
    required_error: 'Please select your status.',
  }),
  reason: z.string({
    required_error: 'Please select a reason for your visit.',
  }),
});

type VisitLoggerProps = {
  user: AuthenticatedUser;
};

export default function VisitLogger({ user }: VisitLoggerProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userType: 'Student',
    }
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const entryDate = new Date().toISOString().split('T')[0];

      addVisitLog({
        userId: user.uid,
        email: user.email!,
        userType: data.userType.toLowerCase() as any,
        reason: data.reason,
        entryDate: entryDate,
      });

      toast({
        title: 'Success!',
        description: 'Your visit has been logged. Have a great day!',
      });
      form.reset();
    } catch (error) {
      console.error('Failed to initiate log submission:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="bg-primary/5 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-full bg-primary/20 text-primary">
            <BookMarked className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl font-bold">Log Library Visit</CardTitle>
        </div>
        <CardDescription className="text-base">Quickly record your entry by selecting your role and purpose.</CardDescription>
      </CardHeader>
      <CardContent className="pt-8 px-6 pb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="userType"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-lg font-semibold">I am a...</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                    >
                      {userTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = field.value === type.id;
                        return (
                          <FormLabel
                            key={type.id}
                            className={cn(
                              "flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:bg-accent/5",
                              isSelected 
                                ? "border-primary bg-primary/5 shadow-inner" 
                                : "border-border/50 opacity-70"
                            )}
                          >
                            <FormControl>
                              <RadioGroupItem value={type.id} className="sr-only" />
                            </FormControl>
                            <Icon className={cn("h-8 w-8", isSelected ? "text-primary" : "text-muted-foreground")} />
                            <span className={cn("font-semibold", isSelected ? "text-primary" : "text-muted-foreground")}>
                              {type.id}
                            </span>
                          </FormLabel>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-lg font-semibold">Purpose of Visit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 text-base glass border-2">
                        <SelectValue placeholder="Select why you are here" />
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
            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-bold shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle className="mr-2 h-6 w-6 animate-spin" />
              ) : (
                <>
                  Log My Visit
                  <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
