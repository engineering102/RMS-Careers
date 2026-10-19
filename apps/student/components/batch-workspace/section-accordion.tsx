import React from 'react';
import { BookOpen, ChevronRight, Code2, FolderGit2, HelpCircle, Video } from 'lucide-react';
import { CurriculumItemRow } from './curriculum-item-row';
import { WEEK_SECTIONS, type WeekSectionGroup, type WeekSectionKey } from '@/lib/batch-workspace/week-pages';

const SECTION_ICONS: Record<WeekSectionKey, React.ComponentType<{ className?: string }>> = {
  lectures: Video,
  notes: BookOpen,
  dsa: Code2,
  assessments: HelpCircle,
  projects: FolderGit2
};

interface SectionAccordionProps {
  weekNumber: number;
  section: WeekSectionGroup;
  isOpen: boolean;
  /** The topic shared by every item in the week, shown under the week title instead of on each row. */
  hideTopic: boolean;
  onToggle: (key: WeekSectionKey) => void;
}

/** One content-type section of a week: a disclosure header with the section's progress, and its item rows. */
export function SectionAccordion({ weekNumber, section, isOpen, hideTopic, onToggle }: SectionAccordionProps) {
  const anchorId = `week-${weekNumber}-${section.key}`;
  const buttonId = `${anchorId}-header`;
  const panelId = `${anchorId}-panel`;
  const Icon = SECTION_ICONS[section.key];
  const isComplete = section.totalCount > 0 && section.completedCount === section.totalCount;
  const percent = section.totalCount > 0 ? Math.round((section.completedCount / section.totalCount) * 100) : 0;
  // A section of one content type (e.g. Lectures) needs no per-row type badge.
  const isMixed = (WEEK_SECTIONS.find((s) => s.key === section.key)?.types.length ?? 1) > 1;
  const showType = isMixed && new Set(section.items.map((i) => i.contentType)).size > 1;

  return (
    <section id={anchorId} className="scroll-mt-24 border-t border-border first:border-t-0">
      <h3>
        <button
          id={buttonId}
          type="button"
          onClick={() => onToggle(section.key)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
            isOpen ? 'bg-secondary/40' : ''
          }`}
        >
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${
              isOpen ? 'rotate-90' : ''
            }`}
            aria-hidden
          />
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{section.label}</span>
          <span className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-secondary sm:block" aria-hidden>
            <span
              className={`block h-full rounded-full ${isComplete ? 'bg-success' : 'bg-primary'}`}
              style={{ width: `${percent}%` }}
            />
          </span>
          <span
            className={`shrink-0 text-right text-xs font-medium tabular-nums ${
              isComplete ? 'text-success' : 'text-muted-foreground'
            }`}
          >
            {section.completedCount} / {section.totalCount} done
          </span>
        </button>
      </h3>

      {/* The panel stays in the DOM (hidden) so aria-controls always resolves; rows render only while open. */}
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen} className="px-2 pb-3 sm:px-4">
        {isOpen && (
          <div className="overflow-hidden rounded-lg border border-border bg-background/40">
            {section.items.map((item) => (
              <CurriculumItemRow key={item.id} item={item} showTopic={!hideTopic} showType={showType} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
