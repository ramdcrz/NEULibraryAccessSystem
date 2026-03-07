'use client';

import { BookMarked, LogOut, ShieldCheck, LayoutDashboard, User, Command } from 'lucide-react';
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
    <header className="sticky top-0 z-50 bg-background/50 backdrop-blur-2xl border-b border-white/10 flex h-20 items-center gap-4 px-6 md:px-12 transition-all">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-4 group transition-transform active:scale-95">
          <div className="p-2.5 rounded-2xl bg-primary text-white shadow-2xl shadow-primary/30 transition-all group-hover:rotate-6 group-hover:scale-110">
            <BookMarked className="h-7 w-7" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black leading-none tracking-tighter text-foreground">NEU Library</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Terminal System</span>
          </div>
        </Link>
        
        <div className="hidden lg:block h-8 w-[1px] bg-white/10" />
        
        <LiveClock />
      </div>

      <div className="ml-auto flex items-center gap-6">
        {isAdmin && (
          <Button 
            variant="ghost" 
            asChild
            className="hidden md:flex gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-primary/5 rounded-2xl px-6 h-12 border-2 border-transparent hover:border-primary/20 transition-all"
          >
            {isAdminPage ? (
              <Link href="/">
                <LayoutDashboard className="h-4 w-4" />
                Logger Mode
              </Link>
            ) : (
              <Link href="/admin">
                <ShieldCheck className="h-4 w-4" />
                Admin Panel
              </Link>
            )}
          </Button>
        )}

        <div className="h-8 w-[1px] bg-white/10 hidden md:block" />

        <ThemeToggle />
        
        {loading ? (
           <div className="h-12 w-12 animate-pulse rounded-full bg-muted shadow-inner" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-12 w-12 rounded-full hover:bg-accent/10 transition-all active:scale-90 p-0 overflow-hidden border-2 border-primary/20">
                <Avatar className="h-full w-full">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.email ?? ''} />
                  <AvatarFallback className="bg-primary text-white font-black text-sm">{getInitials(user.email)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 glass p-3 rounded-[1.5rem] shadow-2xl border-none mt-4" align="end">
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-lg">
                    <AvatarImage src={user.photoURL ?? ''} />
                    <AvatarFallback className="font-black text-sm bg-primary/10 text-primary">{getInitials(user.email)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-base font-black leading-none truncate w-40 tracking-tight">
                      {user.displayName || 'Faculty/Staff'}
                    </p>
                    <p className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {user.email}
                    </p>
                  </div>
                </div>
                {user.user_type && (
                  <Badge variant="outline" className="mt-4 w-full justify-center py-2 rounded-xl border-primary/20 bg-primary/5 text-primary font-black uppercase text-[9px] tracking-[0.2em]">
                    Verified {user.user_type}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-2 bg-white/10" />
              <DropdownMenuItem onClick={signOut} className="rounded-xl cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive py-3 px-4 text-sm font-black transition-all gap-2">
                <LogOut className="h-4 w-4" />
                <span className="uppercase tracking-widest text-[10px]">Log out System</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}