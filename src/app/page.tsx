'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Loading from './loading';
import Header from '@/components/layout/header';
import VisitLogger from '@/components/dashboard/visit-logger';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  if (loading || !user) {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col gradient-bg">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-full max-w-2xl text-center space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wide uppercase mb-2">
            Library Access Management
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Welcome, <span className="text-primary">{user.email?.split('@')[0]}</span>
          </h1>
          <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl">
            Your presence matters. Help us maintain a secure and productive environment by logging your visit.
          </p>
        </div>
        <div className="w-full max-w-2xl">
          <VisitLogger user={user} />
        </div>
      </main>
      <footer className="w-full border-t glass py-6 text-center text-sm text-muted-foreground">
        © {year ?? '...'} New Era University Library. All rights reserved.
      </footer>
    </div>
  );
}
