'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin layout error boundary:', error);
  }, [error]);

  return (
    <main className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center text-center py-16">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        An error occurred while loading this section. If this is a database error, please ensure your <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">POSTGRES_URL</code> is properly configured.
      </p>
      {error.message && (
        <div className="my-4 p-3 bg-muted rounded-md text-xs text-muted-foreground text-left max-w-lg overflow-auto font-mono">
          {error.message}
        </div>
      )}
      <Button onClick={() => reset()} className="mt-2 gap-2" size="sm">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </main>
  );
}
