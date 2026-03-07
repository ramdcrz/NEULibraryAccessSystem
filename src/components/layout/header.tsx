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
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40 flex h-20 items-center gap-4 px-6 md:px-10 transition-all">
      <Link href="/" className="flex items-center gap-3 font-black text-primary animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="p-2.5 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 rotate-3 hover:rotate-0 transition-transform">
          <BookMarked className="h-7 w-7" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl leading-tight tracking-tighter sm:inline-block">NEU Library</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">Access System</span>
        </div>
      </Link>

      <div className="ml-auto flex items-center gap-4">
        {isAdmin && (
          <Button 
            variant="ghost" 
            asChild
            className="hidden md:flex gap-2 font-black text-xs uppercase tracking-widest hover:bg-primary/5 rounded-2xl px-6 h-12"
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

        <div className="h-8 w-[1px] bg-border/40 hidden md:block" />

        <ThemeToggle />
        
        {loading ? (
           <div className="h-11 w-11 animate-pulse rounded-full bg-muted shadow-inner" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-12 w-12 rounded-full hover:bg-accent/10 transition-all active:scale-95">
                <Avatar className="h-11 w-11 border-2 border-primary/20 shadow-lg">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.email ?? ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-black">{getInitials(user.email)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 glass p-3 rounded-2xl shadow-2xl border-none mt-2" align="end">
              <DropdownMenuLabel className="font-normal p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={user.photoURL ?? ''} />
                    <AvatarFallback className="font-black">{getInitials(user.email)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-black leading-none truncate w-40">
                      {user.displayName || 'Faculty/Staff'}
                    </p>
                    <p className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                      {user.email}
                    </p>
                  </div>
                </div>
                {user.user_type && (
                  <Badge variant="outline" className="mt-4 w-full justify-center py-1.5 rounded-xl border-primary/20 bg-primary/5 text-primary font-black uppercase text-[10px] tracking-widest">
                    {user.user_type}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-2 bg-border/40" />
              <DropdownMenuItem onClick={signOut} className="rounded-xl cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive py-3 px-4 font-bold transition-colors">
                <LogOut className="mr-3 h-4 w-4" />
                <span>Log out of Terminal</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}