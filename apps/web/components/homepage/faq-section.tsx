'use client';

import { useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { faqContent } from '@/lib/data/homepage-content';

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-card/20" id="faq">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-18 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{faqContent.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {faqContent.headline}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {faqContent.description}
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {faqContent.faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-card transition-all overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary gap-4"
                  aria-expanded={isOpen}
                >
                  <span className="font-bold text-sm sm:text-base text-foreground leading-snug">
                    {faq.question}
                  </span>
                  <div
                    className={`h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-primary/10 text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/60 pt-4 animate-in fade-in duration-200">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
