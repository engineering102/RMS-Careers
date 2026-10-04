import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen,
  Code2,
  Terminal,
  Database,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  Layers
} from 'lucide-react';
import { getAllPublicSheets } from '@/lib/data/dsa-sheets';

export const metadata: Metadata = {
  title: 'Curriculum & Engineering Tracks',
  description:
    'Comprehensive curriculum specification covering Data Structures & Algorithms, Full-Stack Development, and System Design.',
  openGraph: {
    title: 'Curriculum & Engineering Tracks | RMS Careers',
    description:
      'Explore structured computer science curriculum pathways and freemium starter DSA sheets.'
  }
};

export default function CurriculumPage() {
  const publicSheets = getAllPublicSheets();

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-6xl">
      {/* Header */}
      <div className="max-w-3xl mb-12 space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <BookOpen className="h-4 w-4" />
          <span>Curriculum Architecture</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Structured Engineering Pathways
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Our curriculum is built backwards from the exact technical expectations of top engineering companies. We focus on durable mental models and repeatable problem-solving patterns.
        </p>
      </div>

      {/* Freemium Banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 mb-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Freemium Learning Model</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Free Starter DSA Sheets — Open for Anonymous Practice
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Anyone can practice our foundational starter sheets directly in the browser. Local progress is saved in your browser storage with zero sign-up requirements.
          </p>
        </div>
        <Link
          href="/learn/dsa"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-sm hover:bg-primary/90 transition-all shrink-0"
        >
          <Code2 className="h-4 w-4" />
          <span>Practice Starter Sheets</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Three Tracks */}
      <div className="space-y-12">
        {/* Track 1: DSA */}
        <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Code2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Track 01</span>
                <h3 className="text-2xl font-bold text-foreground">Data Structures & Algorithms</h3>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 self-start sm:self-auto">
              Starter Sheets Public
            </span>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            A pattern-driven journey covering all core algorithmic paradigms. From initial array traversals to advanced graph algorithms and dynamic programming state transitions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-muted/40 border border-border/60">
              <h4 className="font-semibold text-foreground text-sm mb-1">Phase 1: Foundations</h4>
              <p className="text-xs text-muted-foreground">
                Arrays, Hash Maps, Two Pointers, Sliding Window, Linked Lists, Stacks & Queues.
              </p>
              <div className="mt-2 text-xs font-semibold text-primary">★ Included in Starter Sheets</div>
            </div>

            <div className="p-4 rounded-lg bg-muted/40 border border-border/60">
              <h4 className="font-semibold text-foreground text-sm mb-1">Phase 2: Trees & Graphs</h4>
              <p className="text-xs text-muted-foreground">
                Binary Trees, BSTs, Heaps, BFS, DFS, Topological Sort, Union-Find.
              </p>
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> Enrolled Cohorts
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/40 border border-border/60">
              <h4 className="font-semibold text-foreground text-sm mb-1">Phase 3: Advanced Optimization</h4>
              <p className="text-xs text-muted-foreground">
                1D/2D Dynamic Programming, Backtracking, Trie, Greedy Strategies.
              </p>
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> Enrolled Cohorts
              </div>
            </div>
          </div>

          {/* Public Starter Sheets List */}
          <div className="pt-4 border-t border-border space-y-3">
            <h4 className="text-sm font-bold text-foreground">Available Public Starter Sheets:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {publicSheets.map((sheet) => (
                <Link
                  key={sheet.id}
                  href={`/learn/dsa/${sheet.slug}`}
                  className="p-3 rounded-lg border border-border bg-background hover:border-primary/40 transition-all flex items-center justify-between text-sm group"
                >
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {sheet.title}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Track 2: Full-Stack */}
        <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                <Terminal className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Track 02</span>
                <h3 className="text-2xl font-bold text-foreground">Full-Stack Web Engineering</h3>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground self-start sm:self-auto">
              <Lock className="h-3 w-3" />
              Enrolled Cohorts
            </span>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Move beyond superficial tutorials. Build real-world web applications adhering to modern architectural principles: strict TypeScript typing, Next.js Server Components, Drizzle ORM, relational database schema design, and secure tokenized authentication.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-muted/40 border border-border/60">
              <h4 className="font-semibold text-foreground text-sm mb-1">Frontend Engineering</h4>
              <p className="text-xs text-muted-foreground">
                Next.js 15 App Router, React 19, Tailwind CSS, accessible components, client vs server boundaries.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/40 border border-border/60">
              <h4 className="font-semibold text-foreground text-sm mb-1">Backend & Database</h4>
              <p className="text-xs text-muted-foreground">
                PostgreSQL, Drizzle ORM, atomic transactions, indexing strategies, partial unique constraints.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/40 border border-border/60">
              <h4 className="font-semibold text-foreground text-sm mb-1">Security & Cloud Deployment</h4>
              <p className="text-xs text-muted-foreground">
                SHA-256 token hashing, Auth.js sessions, RBAC authorization, Cloudflare edge compatibility.
              </p>
            </div>
          </div>
        </div>

        {/* Track 3: System Design */}
        <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Track 03</span>
                <h3 className="text-2xl font-bold text-foreground">System Design & Architecture</h3>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground self-start sm:self-auto">
              <Lock className="h-3 w-3" />
              Enrolled Cohorts
            </span>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Understand how scalable distributed systems operate. Cover caching strategies, database sharding and replication, load balancing, rate limiting, and asynchronous event-driven pipelines.
          </p>
        </div>
      </div>
    </div>
  );
}
