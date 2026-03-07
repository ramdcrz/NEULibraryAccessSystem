'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

export default function LiveClock() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial time on mount to avoid hydration mismatch
    setCurrentTime(new Date());

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(timer);
  }, []);

  if (!currentTime) {
    return (
      <div className="hidden lg:flex items-center gap-2 px-4 h-8 animate-pulse bg-muted rounded-full w-48" />
    );
  }

  return (
    <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 rounded-full bg-muted/30 border border-border/40 text-[11px] font-bold tracking-tight text-muted-foreground animate-in fade-in duration-500">
      <Clock className="h-3.5 w-3.5 text-primary/60" />
      <div className="flex items-center gap-2">
        <span>{format(currentTime, 'EEEE, MMMM d, yyyy')}</span>
        <span className="text-primary/30 font-black">|</span>
        <span className="text-foreground font-black tabular-nums">
          {format(currentTime, 'hh:mm:ss a')}
        </span>
      </div>
    </div>
  );
}
