'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { LoaderCircle } from 'lucide-react';
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

const visitReasons = [
  'Research',
  'Borrow/Return Books',
  'Use Computer',
  'Study',
  'Other',
];

const userTypes = ['Student', 'Faculty', 'Employee'];

const formSchema = z.object({
  userType: z.enum(['Student', 'Faculty', 'Employee'], {
    required_error: 'You need to select a user type.',
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
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const entryDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      await addVisitLog({
        userId: user.uid,
        email: user.email,
        userType: data.userType,
        reason: data.reason,
        entryDate: entryDate,
      });

      toast({
        title: 'Visit Logged!',
        description: 'Thank you for logging your visit.',
      });
      form.reset();
    } catch (error) {
      console.error('Failed to log visit:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log your visit. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <CardTitle>Log Library Visit</CardTitle>
        <CardDescription>Select your status and the purpose of your visit today.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="userType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>I am a...</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1 sm:flex-row sm:space-x-4 sm:space-y-0"
                    >
                      {userTypes.map((type) => (
                        <FormItem key={type} className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={type} />
                          </FormControl>
                          <FormLabel className="font-normal">{type}</FormLabel>
                        </FormItem>
                      ))}
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
                <FormItem>
                  <FormLabel>Purpose of Visit</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {visitReasons.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Log My Visit
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
