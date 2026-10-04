import { describe, it, expect } from 'vitest';
import {
  heroContent,
  whatIsRmsContent,
  whatWeOfferContent,
  builtFromExperienceContent,
  audienceSplitContent,
  rewardsTeaserContent,
  inActionContent,
  finalCtaContent
} from '../data/homepage-content';
import { metadata } from '../../app/layout';

describe('Homepage V2 Refinement & Architecture (@rms/web)', () => {
  describe('Section 1: Hero Section Content & Invariants', () => {
    it('features the exact core promise headline', () => {
      expect(heroContent.headlinePrefix).toBe('Your Degree Gets You Started.');
      expect(heroContent.headlineHighlight).toBe('Your Skills Get You Hired.');
    });

    it('positions RMS as career-readiness partner bridging academic learning and industry expectations', () => {
      expect(heroContent.description).toContain('RMS Careers works with engineering colleges');
      expect(heroContent.description).toContain('bridge the gap between academic learning and industry expectations');
      expect(heroContent.description).toContain('mentorship');
    });

    it('provides exactly two primary editorial CTAs', () => {
      expect(heroContent.primaryCta.label).toBe('Partner With RMS →');
      expect(heroContent.primaryCta.href).toBe('#partner');
      expect(heroContent.secondaryCta.label).toBe('Explore Our Approach →');
      expect(heroContent.secondaryCta.href).toBe('#approach');
    });

    it('contains only verified, supported proof points without fabricated statistics', () => {
      expect(heroContent.proofPoints).toEqual([
        'B.Tech Across Branches & Years',
        'Live Mentorship & Code Reviews',
        'Institutional College Partnerships'
      ]);
    });

    it('features a verified algorithmic code snippet pattern', () => {
      expect(heroContent.codeSnippet.pattern).toBe('Algorithmic Invariant & Time Complexity');
      expect(heroContent.codeSnippet.code).toContain('maxWaterArea');
    });
  });

  describe('Section 2: What is RMS? Conceptual Framing', () => {
    it('provides a concise conceptual definition without reproducing 6 pillars or full journey', () => {
      expect(whatIsRmsContent.headline).toBe('What Exactly is RMS Careers?');
      expect(whatIsRmsContent.description).toContain('bridges the gap between academic education and practical career readiness');
      expect(whatIsRmsContent.pillars).toHaveLength(3);
    });

    it('links toward the pedagogical credibility section', () => {
      expect(whatIsRmsContent.cta.label).toContain('About RMS');
      expect(whatIsRmsContent.cta.href).toBe('#built-from-experience');
    });
  });

  describe('Section 3: What We Offer (4 High-Level Concepts)', () => {
    it('defines exactly four high-level umbrella areas instead of a giant feature grid', () => {
      expect(whatWeOfferContent.areas).toHaveLength(4);
      const titles = whatWeOfferContent.areas.map((a) => a.title);
      expect(titles).toEqual([
        'Technical Learning',
        'Practical Projects',
        'Career Preparation',
        'Mentorship & Guidance'
      ]);
    });

    it('links each focus area toward the future programs architecture', () => {
      whatWeOfferContent.areas.forEach((area) => {
        expect(area.href).toBe('/programs');
        expect(area.highlights.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('Section 4: Built From Real Classroom Experience', () => {
    it('articulates origin in engineering classrooms closing the theory-vs-practice gap', () => {
      expect(builtFromExperienceContent.headline).toBe('Built From Real Classroom Experience.');
      expect(builtFromExperienceContent.description).toContain('founded inside engineering college classrooms');
      expect(builtFromExperienceContent.description).toContain('gap between textbook theory and what hiring engineering teams actually evaluate');
    });

    it('specifies an authentic, clearly marked replaceable visual slot without stock photos', () => {
      expect(builtFromExperienceContent.placeholderNote.tag).toBe('Replaceable Visual Frame');
      expect(builtFromExperienceContent.placeholderNote.title).toContain('Classroom & Workshop Visual');
    });

    it('defines core engineering pedagogical principles', () => {
      expect(builtFromExperienceContent.principles).toHaveLength(3);
      expect(builtFromExperienceContent.principles[0].title).toBe('Intuition Over Rote Memorization');
      expect(builtFromExperienceContent.principles[1].title).toBe('Production-Grade Standards');
      expect(builtFromExperienceContent.principles[2].title).toBe('Institutional Accountability');
    });
  });

  describe('Section 5: Students / Institutions Dual Journey', () => {
    it('clearly differentiates individual student experience from institutional partnership', () => {
      // Students card
      expect(audienceSplitContent.students.message).toBe('Build skills, projects and career confidence.');
      expect(audienceSplitContent.students.cta.label).toBe('Explore Student Experience');
      expect(audienceSplitContent.students.cta.href).toBe('/learn');

      // Institutions card
      expect(audienceSplitContent.institutions.message).toBe(
        'Bring structured career readiness to students through institutional partnership.'
      );
      expect(audienceSplitContent.institutions.cta.label).toBe('Partner With RMS');
      expect(audienceSplitContent.institutions.cta.href).toBe('#final-cta');
    });

    it('highlights institutional partnership model rather than course marketplace checkout', () => {
      expect(audienceSplitContent.institutions.highlights).toContain(
        'MoU-based cohort delivery tailored to your academic calendar'
      );
    });
  });

  describe('Section 6: Learning With Rewards Teaser', () => {
    it('features compact teaser elements: XP, streaks, badges, leaderboards', () => {
      expect(rewardsTeaserContent.features).toHaveLength(4);
      const titles = rewardsTeaserContent.features.map((f) => f.title);
      expect(titles).toContain('Experience Points (XP)');
      expect(titles).toContain('Daily Practice Streaks');
      expect(titles).toContain('Milestone Badges');
      expect(titles).toContain('Campus Leaderboards');
    });

    it('contains no unsupported promises of cash or placement guarantees and includes clear enrolled disclaimer', () => {
      const allText = JSON.stringify(rewardsTeaserContent);
      expect(allText).not.toContain('cash');
      expect(allText).not.toContain('guaranteed placement');
      expect(allText).not.toContain('100% placement');
      expect(rewardsTeaserContent.disclaimer).toContain('exclusively to enrolled cohort students');
    });
  });

  describe('Section 7: RMS in Action Visual Strip', () => {
    it('contains four authentic visual moment categories: Teaching, Workshops, Code Reviews, Projects', () => {
      expect(inActionContent.categories).toHaveLength(4);
      const cats = inActionContent.categories.map((c) => c.category);
      expect(cats).toEqual(['Teaching', 'Workshops', 'Code Reviews', 'Projects']);
    });
  });

  describe('Section 8: Final Decision Point CTA', () => {
    it('presents exactly two clean decision options (Student Experience vs Institutional Partnership)', () => {
      expect(finalCtaContent.studentCta.label).toBe('Explore Student Experience');
      expect(finalCtaContent.studentCta.href).toBe('/learn');
      expect(finalCtaContent.institutionCta.label).toBe('Partner With RMS');
      expect(finalCtaContent.institutionCta.href).toContain('mailto:partnerships@rms-careers.com');
    });
  });

  describe('Canonical Domain & Metadata Integrity', () => {
    it('sets canonical domain to https://www.rms-careers.com', () => {
      expect(metadata.metadataBase?.toString()).toBe('https://www.rms-careers.com/');
    });

    it('incorporates core promise into default title', () => {
      const defaultTitle = typeof metadata.title === 'object' && metadata.title !== null && 'default' in metadata.title
        ? metadata.title.default
        : metadata.title;
      expect(defaultTitle).toContain('Your Degree Gets You Started. Your Skills Get You Hired.');
    });
  });
});
