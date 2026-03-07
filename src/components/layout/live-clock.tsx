'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

export default function LiveClock() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!currentTime) {
    return (
      <div className="hidden lg:flex items-center gap-2 px-6 h-10 animate-pulse bg-muted/20 rounded-full w-56" />
    );
  }

  return (
    <div className="hidden lg:flex items-center gap-4 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground animate-in fade-in duration-700 shadow-inner">
      <Clock className="h-4 w-4 text-primary opacity-60" />
      <div className="flex items-center gap-3">
        <span className="font-bold">{format(currentTime, 'EEEE, MMM d')}</span>
        <span className="text-primary/20 font-black">|</span>
        <span className="text-foreground font-black tabular-nums tracking-normal text-xs">
          {format(currentTime, 'hh:mm:ss a')}
        </span>
      </div>
    </div>
  );
}