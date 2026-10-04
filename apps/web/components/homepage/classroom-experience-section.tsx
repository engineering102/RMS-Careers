import Image from 'next/image';
import { classroomExperienceContent } from '@/lib/data/homepage-content';
import { CheckCircle2, HeartHandshake } from 'lucide-react';

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

          {/* Right Column: Real Classroom Photography */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl border border-border bg-card p-3 sm:p-4 shadow-xl overflow-hidden group">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden">
                <Image
                  src={classroomExperienceContent.photoSlot.imageSrc || '/images/homepage/classroom/classroom01.jpeg'}
                  alt={classroomExperienceContent.photoSlot.label}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-card/85 backdrop-blur-md border border-border/80">
                  <div className="text-xs font-bold text-foreground">
                    {classroomExperienceContent.photoSlot.label}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {classroomExperienceContent.photoSlot.caption}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
