import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Daily Planner',
  description: 'Agenda de horarios que recusa dois compromissos no mesmo minuto.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
