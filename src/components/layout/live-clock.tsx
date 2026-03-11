'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

export default function LiveClock() {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted || !currentTime) {
    return (
      <div className="hidden sm:flex items-center gap-2 px-6 h-10 bg-muted/20 rounded-full w-48 sm:w-56 animate-pulse" />
    );
  }

  return (
    <div className="hidden sm:flex items-center gap-3 px-4 sm:px-6 h-10 rounded-full bg-white/5 border border-black/5 dark:border-white/10 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground shadow-inner flex-nowrap whitespace-nowrap overflow-hidden">
      <Clock className="h-4 w-4 text-primary opacity-60 flex-shrink-0" />
      <div className="flex items-center flex-nowrap whitespace-nowrap">
        {/* Time is prioritized and placed first */}
        <span className="text-foreground font-black tabular-nums tracking-normal text-xs">
          {format(currentTime, 'hh:mm:ss a')}
        </span>
        
        {/* Divider and Date hide together on smaller screens */}
        <div className="hidden sm:flex items-center flex-nowrap">
          <span className="text-primary/20 font-black mx-3 select-none">|</span>
          <span className="font-bold">
            {format(currentTime, 'EEEE, MMM d')}
          </span>
        </div>
      </div>
    </div>
  );
}
