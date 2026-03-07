'use client';

import { BookMarked, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

export default function Header() {
  const { user, signOut, loading } = useAuth();

  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 glass flex h-16 items-center gap-4 px-4 md:px-6">
      <div className="flex items-center gap-2 font-bold text-primary animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <BookMarked className="h-6 w-6" />
        </div>
        <span className="text-xl tracking-tight hidden sm:inline-block">NEU Library Access</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        {loading ? (
           <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-accent/10">
                <Avatar className="h-10 w-10 border border-border/50">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.email ?? ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">{getInitials(user.email)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 glass p-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal p-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">Signed in as</p>
                  <p className="truncate text-xs leading-none text-muted-foreground mt-1">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem onClick={signOut} className="rounded-md cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
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
