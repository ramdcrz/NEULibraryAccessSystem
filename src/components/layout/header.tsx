'use client';

import { BookMarked, LogOut, ShieldCheck, LayoutDashboard, User } from 'lucide-react';
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
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40 flex h-16 items-center gap-4 px-6 md:px-10 transition-all">
      <Link href="/" className="flex items-center gap-3 font-black text-primary animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="p-2 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 rotate-0 hover:rotate-6 transition-transform">
          <BookMarked className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg leading-tight tracking-tighter sm:inline-block">NEU Library</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none">Access System</span>
        </div>
      </Link>

      <div className="ml-auto flex items-center gap-4">
        {isAdmin && (
          <Button 
            variant="ghost" 
            asChild
            className="hidden md:flex gap-2 font-bold text-[11px] uppercase tracking-widest hover:bg-primary/5 rounded-xl px-4 h-10"
          >
            {isAdminPage ? (
              <Link href="/">
                <LayoutDashboard className="h-4 w-4" />
                Visit Logger
              </Link>
            ) : (
              <Link href="/admin">
                <ShieldCheck className="h-4 w-4" />
                Admin Panel
              </Link>
            )}
          </Button>
        )}

        <div className="h-6 w-[1px] bg-border/40 hidden md:block" />

        <ThemeToggle />
        
        {loading ? (
           <div className="h-10 w-10 animate-pulse rounded-full bg-muted shadow-inner" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-accent/10 transition-all active:scale-95">
                <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-md">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.email ?? ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">{getInitials(user.email)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 glass p-2 rounded-xl shadow-2xl border-none mt-2" align="end">
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={user.photoURL ?? ''} />
                    <AvatarFallback className="font-black text-xs">{getInitials(user.email)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-bold leading-none truncate w-36">
                      {user.displayName || 'Faculty/Staff'}
                    </p>
                    <p className="truncate text-[10px] font-medium text-muted-foreground lowercase">
                      {user.email}
                    </p>
                  </div>
                </div>
                {user.user_type && (
                  <Badge variant="outline" className="mt-3 w-full justify-center py-1 rounded-lg border-primary/20 bg-primary/5 text-primary font-black uppercase text-[9px] tracking-widest">
                    {user.user_type}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-border/40" />
              <DropdownMenuItem onClick={signOut} className="rounded-lg cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive py-2.5 px-3 text-sm font-bold transition-colors">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
