import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { AppShell } from '@/components/app-shell';


export const metadata: Metadata = {
  title: "Company's Brain — Organizational Intelligence",
  description: 'The intelligence layer of your organization. An AI-native organizational memory and intelligence platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
