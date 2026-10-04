import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { trustStripContent } from '@/lib/data/homepage-content';

export function TrustStripSection() {
  return (
    <section className="py-6 border-b border-border/80 bg-muted/40 text-foreground">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Core Platform Foundations:
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
            {trustStripContent.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-xs py-1 px-2.5 rounded-lg bg-card/60 border border-border/60"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-foreground truncate">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate hidden xl:inline">
                    {item.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
