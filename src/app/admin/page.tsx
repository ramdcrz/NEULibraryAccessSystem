'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import Loading from '@/app/loading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Users, BarChart3, History } from 'lucide-react';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return <Loading />;
  }

  const stats = [
    { title: 'Total Visits Today', value: '0', icon: History, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Active Users', value: '0', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { title: 'Peak Hours', value: 'N/A', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col gradient-bg">
      <Header />
      <main className="flex-1 p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-sm">
            <ShieldCheck className="h-4 w-4" />
            Administrator Portal
          </div>
          <h1 className="text-4xl font-black tracking-tight">Library Analytics</h1>
          <p className="text-muted-foreground text-lg">
            Monitor library usage and manage user access from this dashboard.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="glass border-2 border-white/10 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="glass border-2 border-white/10 shadow-xl overflow-hidden min-h-[400px] flex items-center justify-center text-center p-8">
          <div className="max-w-md space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
              <BarChart3 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">Ready for Data</h2>
            <p className="text-muted-foreground">
              Once you start logging visits with your test accounts, the real-time analytics and visit history will populate here in the next sprint.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
