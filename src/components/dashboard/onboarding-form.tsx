
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { LoaderCircle, ChevronRight, School, UserCircle } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { updateUserDoc } from '@/lib/firebase/firestore';
import type { AuthenticatedUser } from '@/contexts/auth-provider';

const colleges = [
  'College of Arts and Sciences',
  'College of Business Administration',
  'College of Communication',
  'College of Computer Studies',
  'College of Criminology',
  'College of Education',
  'College of Engineering and Architecture',
  'College of Law',
  'College of Medicine',
  'College of Nursing',
  'Integrated School',
  'Graduate School',
  'Administrative Office',
];

const formSchema = z.object({
  college_office: z.string({
    required_error: 'Please select your college or office.',
  }),
  user_type: z.enum(['Student', 'Staff', 'Employee'], {
    required_error: 'Please select your classification.',
  }).optional(),
});

type OnboardingFormProps = {
  user: AuthenticatedUser;
};

export default function OnboardingForm({ user }: OnboardingFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If email local part doesn't have a dot, user is NOT a Student by default
  // and must choose between Staff/Employee.
  const email = user.email || '';
  const localPart = email.split('@')[0];
  const isAutoStudent = localPart.includes('.');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      college_office: user.college_office || '',
      user_type: user.user_type || (isAutoStudent ? 'Student' : undefined),
    }
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      updateUserDoc(user.uid, {
        college_office: data.college_office,
        user_type: data.user_type as 'Student' | 'Staff' | 'Employee',
      });

      toast({
        title: 'Profile Updated',
        description: 'Thank you! You can now log your library visit.',
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="glass overflow-hidden border-2 border-white/10 shadow-2xl">
      <CardHeader className="bg-primary/5 pb-8 border-b border-white/5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-primary/20 text-primary shadow-inner">
            <School className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Complete Your Profile</CardTitle>
        </div>
        <CardDescription className="text-base text-muted-foreground/80">
          Please provide your affiliation and classification details to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-8 px-6 pb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid gap-6">
              {!isAutoStudent && (
                <FormField
                  control={form.control}
                  name="user_type"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-primary" />
                        Classification
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 text-base glass border-2 transition-all hover:border-primary/50 focus:ring-primary/20">
                            <SelectValue placeholder="Are you Staff or Employee?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="glass">
                          <SelectItem value="Staff" className="py-3 text-base">Staff</SelectItem>
                          <SelectItem value="Employee" className="py-3 text-base">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Based on your email format, please select your specific role.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="college_office"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-lg font-semibold text-foreground">College / Office</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-14 text-base glass border-2 transition-all hover:border-primary/50 focus:ring-primary/20">
                          <SelectValue placeholder="Select your affiliation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass">
                        {colleges.map((college) => (
                          <SelectItem key={college} value={college} className="py-3 text-base">
                            {college}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                  Complete Setup
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
