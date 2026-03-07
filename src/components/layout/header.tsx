'use client';

import { BookMarked, LogOut, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter, usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { ThemeToggle } from '../theme-toggle';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import LiveClock from './live-clock';
import { cn } from '@/lib/utils';

export default function Header() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  const isAdmin = user?.role === 'admin';
  const isAdminPage = pathname?.startsWith('/admin');

  return (
    <header className="sticky top-0 z-[100] w-full bg-background/5 backdrop-blur-3xl border-b border-white/10 dark:border-white/5 flex h-20 items-center gap-4 px-6 md:px-12 transition-all">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3.5 group transition-opacity hover:opacity-80">
          <div className="p-2 rounded-xl bg-foreground text-background shadow-sm transition-transform group-active:scale-95">
            <BookMarked className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black leading-none tracking-tight text-foreground">NEU Library</span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Terminal</span>
          </div>
        </Link>
        
        <div className="hidden lg:block h-8 w-[1px] bg-black/5 dark:bg-white/10" />
        
        <LiveClock />
      </div>

      <div className="ml-auto flex items-center gap-5">
        {isAdmin && (
          <Button 
            variant="ghost" 
            asChild
            className="hidden md:flex gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-primary/10 dark:hover:bg-white/5 rounded-full px-6 h-10 transition-all"
          >
            {isAdminPage ? (
              <Link href="/">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Logger Mode
              </Link>
            ) : (
              <Link href="/admin">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Panel
              </Link>
            )}
          </Button>
        )}

        <ThemeToggle />
        
        {loading ? (
           <div className="h-10 w-10 animate-pulse rounded-full bg-muted shadow-inner" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-accent/10 transition-all active:scale-90 p-0 overflow-hidden border border-white/10">
                <Avatar className="h-full w-full">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.email ?? ''} />
                  <AvatarFallback className="bg-primary text-white font-bold text-xs">{getInitials(user.email)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-2 rounded-[2rem] border glass mt-4 overflow-hidden" align="end">
              <DropdownMenuLabel className="font-normal p-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border border-black/5 dark:border-white/10 shadow-sm">
                    <AvatarImage src={user.photoURL ?? ''} />
                    <AvatarFallback className="font-bold text-xs bg-muted text-foreground">{getInitials(user.email)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1 overflow-hidden flex-1">
                    <p className="text-base font-black leading-none truncate tracking-tight text-foreground">
                      {user.displayName || 'Faculty/Staff'}
                    </p>
                    <p className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                      {user.email}
                    </p>
                  </div>
                </div>
                {user.user_type && (
                  <Badge variant="secondary" className="mt-5 w-full justify-center py-2.5 rounded-2xl text-foreground/70 font-black uppercase text-[8px] tracking-[0.25em] border-none bg-primary/5">
                    Verified {user.user_type}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 mx-2" />
              <div className="p-1">
                <DropdownMenuItem onClick={signOut} className="rounded-2xl cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive py-4 px-4 text-sm font-bold transition-all gap-3">
                  <LogOut className="h-4 w-4" />
                  <span className="uppercase tracking-[0.25em] text-[9px] font-black">End Session</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
