import { getPublicPrograms } from '@/lib/db/queries/programs';
import { getAllPublicSheets } from '@/lib/data/dsa-sheets';
import { HeroSection } from '@/components/homepage/hero-section';
import { CapabilitiesSection } from '@/components/homepage/capabilities-section';
import { ProgramsSection } from '@/components/homepage/programs-section';
import { JourneySection } from '@/components/homepage/journey-section';
import { SplitAudienceSection } from '@/components/homepage/split-audience-section';
import { PublicDsaSection } from '@/components/homepage/public-dsa-section';
import { TrustSection } from '@/components/homepage/trust-section';
import { AboutSection } from '@/components/homepage/about-section';
import { FinalCtaSection } from '@/components/homepage/final-cta-section';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const publicPrograms = await getPublicPrograms();
  const dsaSheets = getAllPublicSheets();

  return (
    <div className="flex flex-col w-full bg-gradient-hero">
      {/* 1. HERO: Editorial Split Composition with Pattern Code Showcase */}
      <HeroSection />

      {/* 2. CAPABILITIES: What RMS Careers Delivers (Editorial Asymmetric Cards) */}
      <CapabilitiesSection />

      {/* 3. PROGRAMS: Public Training Programs Showcase (#programs) */}
      <ProgramsSection programs={publicPrograms} />

      {/* 4. PLATFORM JOURNEY: Connected 4-Stage Learning Progression */}
      <JourneySection />

      {/* 5. AUDIENCE SPLIT: Two-Sided Platform (Students vs Academic Institutions) */}
      <SplitAudienceSection />

      {/* 6. PUBLIC DSA: Freemium Starter Practice Catalog & Local Anonymous Mode */}
      <PublicDsaSection sheets={dsaSheets} />

      {/* 7. TRUST & STANDARDS: No Exaggerations. Real Engineering Standards. */}
      <TrustSection />

      {/* 8. ABOUT: Dedicated About RMS Careers Section (#about) */}
      <AboutSection />

      {/* 9. FINAL CTA: Culmination Call to Action */}
      <FinalCtaSection />
    </div>
  );
}
