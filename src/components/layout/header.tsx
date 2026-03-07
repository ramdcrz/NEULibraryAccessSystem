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
    <header className="sticky top-0 z-50 w-full bg-background/60 backdrop-blur-2xl border-b border-white/5 flex h-16 items-center gap-4 px-6 md:px-12 transition-all">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3.5 group transition-opacity hover:opacity-80">
          <div className="p-1.5 rounded-lg bg-foreground text-background shadow-sm transition-transform group-active:scale-95">
            <BookMarked className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold leading-none tracking-tight text-foreground">NEU Library</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground mt-0.5">Terminal</span>
          </div>
        </Link>
        
        <div className="hidden lg:block h-6 w-[1px] bg-border/50" />
        
        <LiveClock />
      </div>

      <div className="ml-auto flex items-center gap-4">
        {isAdmin && (
          <Button 
            variant="ghost" 
            asChild
            className="hidden md:flex gap-2 font-bold text-[10px] uppercase tracking-widest hover:bg-secondary rounded-full px-5 h-9 transition-all"
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
           <div className="h-9 w-9 animate-pulse rounded-full bg-muted shadow-inner" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-accent/10 transition-all active:scale-90 p-0 overflow-hidden">
                <Avatar className="h-full w-full">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.email ?? ''} />
                  <AvatarFallback className="bg-primary text-white font-bold text-xs">{getInitials(user.email)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-2 rounded-[1.5rem] shadow-2xl border-white/10 glass mt-3 overflow-hidden" align="end">
              <DropdownMenuLabel className="font-normal p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border border-white/10 shadow-sm">
                    <AvatarImage src={user.photoURL ?? ''} />
                    <AvatarFallback className="font-bold text-xs bg-muted text-foreground">{getInitials(user.email)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1 overflow-hidden">
                    <p className="text-sm font-black leading-none truncate w-44 tracking-tight text-foreground">
                      {user.displayName || 'Faculty/Staff'}
                    </p>
                    <p className="truncate text-[9px] font-bold text-muted-foreground uppercase tracking-widest w-44">
                      {user.email}
                    </p>
                  </div>
                </div>
                {user.user_type && (
                  <Badge variant="secondary" className="mt-4 w-full justify-center py-2 rounded-xl text-foreground/70 font-black uppercase text-[8px] tracking-[0.2em] border-none bg-primary/5">
                    Verified {user.user_type}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5 mx-2" />
              <div className="p-1">
                <DropdownMenuItem onClick={signOut} className="rounded-xl cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive py-3 px-3 text-sm font-bold transition-all gap-3">
                  <LogOut className="h-4 w-4" />
                  <span className="uppercase tracking-[0.2em] text-[9px] font-black">Log out System</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
