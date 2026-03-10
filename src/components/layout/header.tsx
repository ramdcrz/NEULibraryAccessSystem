'use client';

import { BookMarked, LogOut, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  const isAdmin = user?.role === 'admin';
  const isAdminPage = pathname?.startsWith('/admin');

  return (
    <header className="sticky top-0 z-[100] w-full bg-background/5 backdrop-blur-3xl border-b border-black/5 dark:border-white/10 flex h-20 items-center gap-4 px-4 sm:px-6 md:px-12 transition-all">
      <div className="flex items-center gap-4 sm:gap-8 py-2">
        <Link href="/" className="flex items-center gap-2 sm:gap-3.5 group transition-opacity hover:opacity-80 py-1">
          <div className="flex-shrink-0 p-1.5 sm:p-2 rounded-xl blue-gradient text-white shadow-md shadow-primary/20 transition-transform group-active:scale-95 aspect-square flex items-center justify-center">
            <BookMarked className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-sm sm:text-lg font-black leading-none tracking-tight text-blue-gradient">NEU Library</span>
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-0">Access System</span>
          </div>
        </Link>
        
        <div className="hidden lg:block h-8 w-[1px] bg-black/5 dark:bg-white/10" />
        
        <LiveClock />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        {isAdmin && (
          <Button 
            variant="ghost" 
            asChild
            className={cn(
              "h-8 sm:h-10 px-3 sm:px-6 font-black text-[8px] sm:text-[10px] uppercase tracking-widest rounded-full transition-all border border-black/5 dark:border-white/10 bg-white/5 shadow-sm group",
              "hover:bg-primary/10 hover:text-primary dark:hover:bg-white/10"
            )}
          >
            {isAdminPage ? (
              <Link href="/">
                <LayoutDashboard className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5 sm:mr-2 group-hover:text-primary transition-colors" />
                <span className="hidden xs:inline">Logger Mode</span>
                <span className="xs:hidden">Logger</span>
              </Link>
            ) : (
              <Link href="/admin">
                <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5 sm:mr-2 group-hover:text-primary transition-colors" />
                <span className="hidden xs:inline">Admin Panel</span>
                <span className="xs:hidden">Admin</span>
              </Link>
            )}
          </Button>
        )}

        <ThemeToggle />
        
        {loading ? (
           <div className="h-8 w-8 sm:h-10 sm:w-10 animate-pulse rounded-full bg-muted shadow-inner" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex h-9 w-9 sm:h-[42px] sm:w-[42px] items-center justify-center rounded-full blue-gradient cursor-pointer active:scale-95 transition-transform group shadow-md shadow-primary/10">
                <div className="relative h-8 w-8 sm:h-[38px] sm:w-[38px] rounded-full overflow-hidden border-2 border-background bg-background flex items-center justify-center shadow-sm">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={user.photoURL ?? ''} alt={user.email ?? ''} />
                    <AvatarFallback className="blue-gradient text-white font-bold text-[10px] sm:text-xs">{getInitials(user.email)}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 sm:w-72 p-2 rounded-[1.5rem] sm:rounded-[2rem] border glass mt-4 shadow-2xl overflow-hidden border-white/20" align="end">
              <DropdownMenuLabel className="font-normal p-4 sm:p-5 pb-0">
                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                  <Avatar className="h-10 w-10 sm:h-14 sm:w-14 border border-black/5 dark:border-white/10 shadow-sm">
                    <AvatarImage src={user.photoURL ?? ''} />
                    <AvatarFallback className="font-bold text-[10px] sm:text-xs bg-muted text-foreground">{getInitials(user.email)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5 sm:space-y-1 overflow-hidden flex-1">
                    <p className="text-sm sm:text-base font-black leading-none truncate tracking-tight text-foreground">
                      {user.displayName || 'Faculty/Staff'}
                    </p>
                    <p className="truncate text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 sm:mt-1">
                      {user.email}
                    </p>
                  </div>
                </div>
                {user.user_type && (
                  <div className="mb-2">
                    <Badge variant="secondary" className="w-full justify-center py-2 sm:py-3 rounded-xl text-foreground/70 font-black uppercase text-[7px] sm:text-[8px] tracking-[0.2em] border-none bg-primary/10 hover:bg-primary/10 pointer-events-none shadow-none">
                      Verified {user.user_type}
                    </Badge>
                  </div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 mx-2" />
              <div className="p-1">
                <DropdownMenuItem onClick={signOut} className="rounded-xl sm:rounded-2xl cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-bold transition-all gap-3">
                  <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="uppercase tracking-[0.25em] text-[8px] sm:text-[9px] font-black">End Session</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}