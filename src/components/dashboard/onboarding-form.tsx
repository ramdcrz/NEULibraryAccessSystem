'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { LoaderCircle, ChevronRight, School, UserCircle, ShieldCheck } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';

const colleges = [
  'College of Accountancy',
  'College of Agriculture',
  'College of Arts and Science',
  'College of Business Administration',
  'College of Communication',
  'College of Informatics and Computing Studies',
  'College of Criminology',
  'College of Education',
  'College of Engineering and Architecture',
  'College of Medical Technology',
  'College of Midwifery',
  'College of Music',
  'College of Nursing',
  'College of Physical Therapy',
  'College of Respiratory Therapy',
  'School of International Relations',
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

const BACKDOOR_EMAIL = 'nemostyles009@gmail.com';

export default function OnboardingForm({ user }: OnboardingFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const email = user.email || '';
  const localPart = email.split('@')[0];
  const isBackdoor = email === BACKDOOR_EMAIL;
  
  // Backdoor email NEVER auto-assigns Student
  const isAutoStudent = !isBackdoor && localPart.includes('.');

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
        title: 'Profile verified',
        description: 'You are now ready to log your first library visit.',
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="glass overflow-hidden border-none shadow-2xl">
      <CardHeader className="bg-primary/5 pb-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-3xl font-black tracking-tight">Profile Verification</CardTitle>
            <CardDescription className="text-base">One-time setup required for library access</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-10 px-8 pb-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid gap-8">
              {!isAutoStudent && (
                <FormField
                  control={form.control}
                  name="user_type"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-xl font-black flex items-center gap-3">
                        <UserCircle className="h-5 w-5 text-primary" />
                        Identify Classification
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-16 text-lg border-2 bg-background/50 hover:border-primary transition-all rounded-2xl">
                            <SelectValue placeholder="Staff or Employee?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl shadow-2xl">
                          <SelectItem value="Staff" className="py-4 text-base cursor-pointer">Staff Member</SelectItem>
                          <SelectItem value="Employee" className="py-4 text-base cursor-pointer">University Employee</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-sm font-medium px-1">
                        Select based on your official appointment status.
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
                  <FormItem className="space-y-4">
                    <FormLabel className="text-xl font-black flex items-center gap-3">
                      <School className="h-5 w-5 text-primary" />
                      Academic Affiliation
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-16 text-lg border-2 bg-background/50 hover:border-primary transition-all rounded-2xl">
                          <SelectValue placeholder="Select your College or Office" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl shadow-2xl max-h-[400px]">
                        {colleges.map((college) => (
                          <SelectItem key={college} value={college} className="py-4 text-base cursor-pointer">
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

            <Separator className="bg-border/40" />

            <Button 
              type="submit" 
              className="w-full h-20 text-2xl font-black shadow-2xl rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] group" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle className="h-8 w-8 animate-spin" />
              ) : (
                <div className="flex items-center justify-center gap-3">
                  Verify & Continue
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
