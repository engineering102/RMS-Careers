import './globals.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Academy Enrollment - Admin',
  description: 'Internal admin tool for managing student enrollment.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen w-full flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

