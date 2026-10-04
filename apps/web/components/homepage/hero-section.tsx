import Link from 'next/link';
import {
  Code2,
  ArrowRight,
  Layers,
  CheckCircle2,
  Terminal,
  Cpu,
  Sparkles,
  Zap,
  Lock
} from 'lucide-react';
import { heroContent } from '@/lib/data/homepage-content';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-10 pb-16 sm:pt-14 sm:pb-20 md:pt-18 md:pb-24 border-b border-border/70 bg-grid-pattern">
      {/* Subtle radial ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-center">
          {/* LEFT CONTENT COLUMN */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold tracking-wide shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{heroContent.eyebrow}</span>
            </div>

            {/* Primary Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.9rem] xl:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
              {heroContent.headlinePrefix}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 dark:from-blue-400 dark:via-indigo-300 dark:to-blue-300">
                {heroContent.headlineHighlight}
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              {heroContent.description}
            </p>

            {/* Call to Actions */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                href={heroContent.primaryCta.href}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm sm:text-base shadow-md hover:bg-primary/90 hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Code2 className="h-5 w-5" />
                <span>{heroContent.primaryCta.label}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={heroContent.secondaryCta.href}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-card text-foreground font-semibold text-sm sm:text-base shadow-sm hover:bg-muted/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Layers className="h-5 w-5 text-muted-foreground" />
                <span>{heroContent.secondaryCta.label}</span>
              </Link>
            </div>

            {/* Proof Points & Invariants */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground border-t border-border/80">
              {heroContent.proofPoints.map((point, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="font-medium text-foreground/80">{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT VISUAL ELEMENT: Editorial Code & Pattern Showcase Window */}
          <div className="lg:col-span-5 relative">
            <div className="rounded-2xl border border-border bg-card/95 shadow-xl shadow-blue-500/5 backdrop-blur-sm overflow-hidden glow-card">
              {/* Window Header / Title Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/60 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  <span className="ml-2 text-xs font-mono font-medium text-muted-foreground">
                    {heroContent.codeSnippet.filename}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                  <Zap className="h-3 w-3" />
                  <span>Pattern Proof</span>
                </div>
              </div>

              {/* Pattern Tag */}
              <div className="px-4 py-2 bg-primary/5 border-b border-border/60 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  {heroContent.codeSnippet.pattern}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  O(n) Time • O(n) Space
                </span>
              </div>

              {/* Code Presentation */}
              <div className="p-4 bg-muted/20 font-mono text-[13px] leading-relaxed overflow-x-auto text-foreground/90">
                <pre className="text-foreground/90">
                  <code>
                    <span className="text-muted-foreground select-none">1  </span>
                    <span className="text-blue-600 dark:text-blue-400">function</span>{' '}
                    <span className="text-indigo-600 dark:text-indigo-300 font-bold">twoSum</span>
                    (nums: <span className="text-emerald-600 dark:text-emerald-400">number[]</span>, target:{' '}
                    <span className="text-emerald-600 dark:text-emerald-400">number</span>) &#123;
                    {'\n'}
                    <span className="text-muted-foreground select-none">2    </span>
                    <span className="text-blue-600 dark:text-blue-400">const</span> seen ={' '}
                    <span className="text-blue-600 dark:text-blue-400">new</span> Map&lt;
                    <span className="text-emerald-600 dark:text-emerald-400">number</span>,{' '}
                    <span className="text-emerald-600 dark:text-emerald-400">number</span>&gt;();{'\n'}
                    <span className="text-muted-foreground select-none">3    </span>
                    <span className="text-purple-600 dark:text-purple-400">for</span> (
                    <span className="text-blue-600 dark:text-blue-400">let</span> i ={' '}
                    <span className="text-amber-600 dark:text-amber-400">0</span>; i &lt; nums.length; i++) &#123;
                    {'\n'}
                    <span className="text-muted-foreground select-none">4      </span>
                    <span className="text-blue-600 dark:text-blue-400">const</span> complement = target - nums[i];{'\n'}
                    <span className="text-muted-foreground select-none">5      </span>
                    <span className="text-purple-600 dark:text-purple-400">if</span> (seen.has(complement)) &#123;
                    {'\n'}
                    <span className="text-muted-foreground select-none">6        </span>
                    <span className="text-purple-600 dark:text-purple-400">return</span> [seen.get(complement)!, i];
                    {'\n'}
                    <span className="text-muted-foreground select-none">7      </span>&#125;{'\n'}
                    <span className="text-muted-foreground select-none">8      </span>seen.set(nums[i], i);{'\n'}
                    <span className="text-muted-foreground select-none">9    </span>&#125;{'\n'}
                    <span className="text-muted-foreground select-none">10   </span>
                    <span className="text-purple-600 dark:text-purple-400">return</span> [];{'\n'}
                    <span className="text-muted-foreground select-none">11 </span>&#125;
                  </code>
                </pre>
              </div>

              {/* Status / Test Verification Footer */}
              <div className="p-3 bg-muted/40 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Execution Passed
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <Lock className="h-3 w-3" />
                  <span>Local In-Browser Evaluator</span>
                </div>
              </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {heroContent.metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card/60 p-2.5 shadow-sm"
                >
                  <div className="text-base sm:text-lg font-bold text-foreground">
                    {metric.value}
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
