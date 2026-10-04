import { HeroSection } from '@/components/homepage/hero-section';
import { GapSection } from '@/components/homepage/gap-section';
import { ApproachSection } from '@/components/homepage/approach-section';
import { DeliveryModelSection } from '@/components/homepage/delivery-model-section';
import { StudentExperienceSection } from '@/components/homepage/student-experience-section';
import { ClassroomExperienceSection } from '@/components/homepage/classroom-experience-section';
import { RmsInActionSection } from '@/components/homepage/rms-in-action-section';
import { PartnerFormSection } from '@/components/homepage/partner-form-section';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="flex flex-col w-full bg-gradient-hero">
      {/* 01. HERO: Editorial Typography & 6-Month Career-Readiness Journey System Visual */}
      <HeroSection />

      {/* 02. THE GAP: Editorial Problem Statement & Readiness Bridge Diagram */}
      <GapSection />

      {/* 03. THE RMS APPROACH: Interactive 5-Stage Framework across 6-Month Journey */}
      <ApproachSection />

      {/* 04. SIX-MONTH DELIVERY MODEL: 5 Program Components & Online (Primary) / Offline / Hybrid */}
      <DeliveryModelSection />

      {/* 05. WHAT STUDENTS EXPERIENCE: 5-Step Student Journey & UI Progress Glimpse */}
      <StudentExperienceSection />

      {/* 06. BUILT FROM REAL CLASSROOM EXPERIENCE: Origin Narrative & Photo Frame */}
      <ClassroomExperienceSection />

      {/* 07. RMS IN ACTION: Asymmetric Editorial Photography Gallery */}
      <RmsInActionSection />

      {/* 08. PARTNER WITH RMS: Comprehensive Institutional Partnership Enquiry Form */}
      <PartnerFormSection />
    </div>
  );
}
