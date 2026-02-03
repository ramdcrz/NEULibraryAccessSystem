'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Loading from './loading';
import Header from '@/components/layout/header';
import VisitLogger from '@/components/dashboard/visit-logger';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center gap-4 p-4 md:gap-8 md:p-8">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Welcome, {user.email?.split('@')[0]}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Please log your visit for today.
          </p>
        </div>
        <VisitLogger user={user} />
      </main>
    </div>
  );
}
