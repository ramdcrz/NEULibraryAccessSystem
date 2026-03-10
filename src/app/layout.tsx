
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/auth-provider';
import { ThemeProvider } from '@/contexts/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import HeaderWrapper from '@/components/layout/header-wrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'NEU Library Access System',
  description: 'Library Access Management System for New Era University',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased min-h-screen tracking-normal')}>
        <FirebaseClientProvider>
          <ThemeProvider>
            <AuthProvider>
              <div className="min-h-screen gradient-bg relative">
                <HeaderWrapper />
                {children}
              </div>
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
