
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  LoaderCircle, 
  ChevronRight, 
  School, 
  UserCircle, 
  ShieldCheck,
  GraduationCap,
  UserCog,
  Briefcase,
  BookMarked,
  Calculator,
  Sprout,
  Palette,
  BarChart,
  MessageSquare,
  Cpu,
  Shield,
  BookOpen,
  PencilRuler,
  Microscope,
  Baby,
  Music,
  Stethoscope,
  Activity,
  Wind,
  Globe
} from 'lucide-react';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
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

const offices = [
  'Registrar\'s Office',
  'Finance Office',
  'Human Resources Department',
  'Library Services',
  'Information Technology Department',
  'Student Affairs Office',
  'Guidance and Counseling',
  'Health Services',
  'Property and Supply Office',
  'Security Office',
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

// Icon Mapping Helper for Onboarding
function getAffiliationIcon(name: string | null | undefined) {
  if (!name) return School;
  
  const iconMap: Record<string, any> = {
    'College of Accountancy': Calculator,
    'College of Agriculture': Sprout,
    'College of Arts and Science': Palette,
    'College of Business Administration': BarChart,
    'College of Communication': MessageSquare,
    'College of Informatics and Computing Studies': Cpu,
    'College of Criminology': Shield,
    'College of Education': BookOpen,
    'College of Engineering and Architecture': PencilRuler,
    'College of Medical Technology': Microscope,
    'College of Midwifery': Baby,
    'College of Music': Music,
    'College of Nursing': Stethoscope,
    'College of Physical Therapy': Activity,
    'College of Respiratory Therapy': Wind,
    'School of International Relations': Globe,
  };

  return iconMap[name] || BookMarked;
}

export default function OnboardingForm({ user }: OnboardingFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const email = user.email || '';
  const isBackdoor = email === BACKDOOR_EMAIL;
  const localPart = email.split('@')[0];
  const isAutoStudent = !isBackdoor && localPart.includes('.');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      college_office: user.college_office || '',
      user_type: user.user_type || (isAutoStudent ? 'Student' : undefined),
    }
  });

  const selectedAffiliation = form.watch('college_office');
  const AffiliationIcon = getAffiliationIcon(selectedAffiliation);

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
    <Card className="glass overflow-hidden border-none shadow-2xl shadow-primary/10">
      <CardHeader className="bg-primary/5 pb-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl blue-gradient text-white shadow-inner rotate-0 hover:rotate-6 transition-transform">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-black tracking-tight">Profile Verification</CardTitle>
            <CardDescription className="text-sm">One-time setup required for access</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-5 px-6 pb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6">
              {!isAutoStudent && (
                <FormField
                  control={form.control}
                  name="user_type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-bold flex items-center gap-2">
                        {field.value === 'Student' ? <GraduationCap className="h-4 w-4 text-primary" /> : 
                         field.value === 'Staff' ? <UserCog className="h-4 w-4 text-primary" /> :
                         field.value === 'Employee' ? <Briefcase className="h-4 w-4 text-primary" /> :
                         <UserCircle className="h-4 w-4 text-primary" />}
                        Identity Classification
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 text-sm border-2 bg-background/50 hover:border-primary transition-all rounded-xl">
                            <SelectValue placeholder="Staff or Employee?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Staff" className="py-2.5 text-sm cursor-pointer">
                            <div className="flex items-center gap-2">
                              <UserCog className="h-4 w-4" /> Staff Member
                            </div>
                          </SelectItem>
                          <SelectItem value="Employee" className="py-2.5 text-sm cursor-pointer">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" /> University Employee
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs font-medium px-1">
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
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base font-bold flex items-center gap-2">
                      <AffiliationIcon className="h-4 w-4 text-primary" />
                      Academic Affiliation
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 text-sm border-2 bg-background/50 hover:border-primary transition-all rounded-xl">
                          <SelectValue placeholder="Select your College or Office" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl max-h-[300px]">
                        <SelectGroup>
                          <SelectLabel className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/30">Colleges</SelectLabel>
                          {colleges.map((college) => (
                            <SelectItem key={college} value={college} className="py-2 text-sm cursor-pointer">
                              {college}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <Separator className="my-1" />
                        <SelectGroup>
                          <SelectLabel className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/30">University Offices</SelectLabel>
                          {offices.map((office) => (
                            <SelectItem key={office} value={office} className="py-2 text-sm cursor-pointer">
                              {office}
                            </SelectItem>
                          ))}
                        </SelectGroup>
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
              className="w-full h-14 text-lg font-black rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] group blue-gradient text-white border-none shadow-lg shadow-primary/20" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle className="h-6 w-6 animate-spin" />
              ) : (
                <div className="flex items-center justify-center gap-2">
                  Verify & Continue
                  <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
