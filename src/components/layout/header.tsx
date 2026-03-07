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
    <header className="sticky top-0 z-[100] w-full bg-background/5 backdrop-blur-3xl border-b border-black/5 dark:border-white/10 flex h-20 items-center gap-4 px-6 md:px-12 transition-all">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3.5 group transition-opacity hover:opacity-80">
          <div className="p-2 rounded-xl purple-gradient text-white shadow-md shadow-primary/20 transition-transform group-active:scale-95">
            <BookMarked className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black leading-none tracking-tight text-purple-gradient">NEU Library</span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Terminal</span>
          </div>
        </Link>
        
        <div className="hidden lg:block h-8 w-[1px] bg-black/5 dark:bg-white/10" />
        
        <LiveClock />
      </div>

      <div className="ml-auto flex items-center gap-4">
        {isAdmin && (
          <div className="hidden md:flex items-center gap-4">
            <Button 
              variant="ghost" 
              asChild
              className="flex gap-2 font-black text-[10px] uppercase tracking-widest h-10 px-6 rounded-full transition-all border border-black/5 dark:border-white/10 bg-white/5 shadow-inner light:hover:text-primary dark:hover:bg-white/5 group"
            >
              {isAdminPage ? (
                <Link href="/">
                  <LayoutDashboard className="h-3.5 w-3.5 group-hover:text-primary" />
                  Logger Mode
                </Link>
              ) : (
                <Link href="/admin">
                  <ShieldCheck className="h-3.5 w-3.5 group-hover:text-primary" />
                  Admin Panel
                </Link>
              )}
            </Button>
          </div>
        )}

        <ThemeToggle />
        
        {loading ? (
           <div className="h-10 w-10 animate-pulse rounded-full bg-muted shadow-inner" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full purple-gradient cursor-pointer active:scale-95 transition-transform group">
                <div className="relative h-10 w-10 rounded-full p-0.5 overflow-hidden border-2 border-background shadow-sm bg-background transition-all flex items-center justify-center">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={user.photoURL ?? ''} alt={user.email ?? ''} />
                    <AvatarFallback className="purple-gradient text-white font-bold text-xs">{getInitials(user.email)}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-2 rounded-[2rem] border glass mt-4 shadow-2xl overflow-hidden border-white/20" align="end">
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
                  <Badge variant="secondary" className="mt-5 w-full justify-center py-2.5 rounded-2xl text-foreground/70 font-black uppercase text-[8px] tracking-[0.25em] border-none bg-primary/10">
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