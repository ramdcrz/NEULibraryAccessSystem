'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

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
    return null;
  }

  return (
    <div className="hidden sm:flex items-center px-4 h-10 rounded-full bg-white/5 border border-black/5 dark:border-white/10 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground shadow-inner flex-nowrap whitespace-nowrap overflow-hidden animate-in fade-in duration-500">
      <div className="flex items-center flex-nowrap whitespace-nowrap">
        {/* Time is primary and stays visible longer */}
        <span className="text-foreground font-black tabular-nums tracking-normal text-xs">
          {format(currentTime, 'hh:mm:ss a')}
        </span>
        
        {/* Date and Divider disappear on medium windows (md) */}
        <div className="hidden md:flex items-center flex-nowrap">
          <span className="text-primary/20 font-black mx-3 select-none">|</span>
          <span className="font-bold">
            {format(currentTime, 'EEEE, MMM d')}
          </span>
        </div>
      </div>
    </div>
  );
}
