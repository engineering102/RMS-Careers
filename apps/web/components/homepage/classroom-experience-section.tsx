import { classroomExperienceContent } from '@/lib/data/homepage-content';
import { Camera, CheckCircle2, HeartHandshake } from 'lucide-react';

export function ClassroomExperienceSection() {
  return (
    <section className="py-16 md:py-24 border-b border-border/70 relative" id="classroom-experience">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Human Storytelling Narrative */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <HeartHandshake className="h-3.5 w-3.5" />
              <span>{classroomExperienceContent.eyebrow}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              {classroomExperienceContent.headline}
            </h2>

            <div className="space-y-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              {classroomExperienceContent.narrative.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            <div className="pt-2 space-y-2.5">
              {classroomExperienceContent.storyPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-foreground/90">{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Premium Replaceable Photography Frame */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl border-2 border-dashed border-border bg-card p-8 sm:p-12 text-center shadow-lg overflow-hidden flex flex-col items-center justify-center min-h-[360px]">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Camera className="h-8 w-8" />
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary mb-2">
                Replaceable Photo Frame
              </span>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {classroomExperienceContent.photoSlot.label}
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                {classroomExperienceContent.photoSlot.caption}
              </p>
              <div className="mt-6 px-3 py-1 rounded-full bg-muted border border-border text-[11px] font-mono text-muted-foreground">
                Reserved for partner campus photography
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
