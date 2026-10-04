'use client';

import { useState } from 'react';
import {
  Building2,
  Send,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Mail,
  Phone,
  User,
  MapPin,
  GraduationCap
} from 'lucide-react';
import { partnershipFormContent } from '@/lib/data/homepage-content';

export function PartnershipSection() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    role: '',
    email: '',
    mobile: '',
    institutionName: '',
    institutionType: partnershipFormContent.institutionTypes[0],
    city: '',
    state: '',
    website: '',
    studentStrength: '',
    branches: '',
    batches: '',
    timeline: partnershipFormContent.timelineOptions[0],
    objectives: [] as string[],
    additionalMessage: '',
    consent: false
  });

  const handleObjectiveToggle = (obj: string) => {
    setFormData((prev) => ({
      ...prev,
      objectives: prev.objectives.includes(obj)
        ? prev.objectives.filter((o) => o !== obj)
        : [...prev.objectives, obj]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consent) return;
    setLoading(true);

    // Minimum public lead submission handling
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-gradient-to-b from-card/40 to-background" id="partner">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Building2 className="h-3.5 w-3.5" />
            <span>{partnershipFormContent.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {partnershipFormContent.headline}
          </h2>
          <p className="text-base sm:text-lg text-primary/90 font-medium">
            {partnershipFormContent.subhead}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
            Discuss customized cohort programs, on-campus or virtual workshops, and structured placement preparation for your engineering students.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-3xl border border-emerald-500/30 bg-card p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              Partnership Inquiry Received
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Thank you, <span className="font-semibold text-foreground">{formData.fullName}</span>. Our academic leadership team will review the profile for <span className="font-semibold text-foreground">{formData.institutionName}</span> and reach out to <span className="font-semibold text-foreground">{formData.email}</span> within 1 business day.
            </p>
            <div className="pt-4 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Direct Institutional Consultation • No Commitments Required</span>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xl space-y-8"
          >
            {/* Section 1: Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>1. Official Representative Contact</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-foreground mb-1">
                    Full Name *
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Dr. Ramesh Kumar"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-xs font-semibold text-foreground mb-1">
                    Designation / Role *
                  </label>
                  <input
                    id="role"
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. Dean Academics / Head of T&P / HOD CSE"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-foreground mb-1">
                    Official College Email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. placement@college.edu.in"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="mobile" className="block text-xs font-semibold text-foreground mb-1">
                    Mobile Number *
                  </label>
                  <input
                    id="mobile"
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Institution Profile */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>2. Institution Details</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="institutionName" className="block text-xs font-semibold text-foreground mb-1">
                    Institution / College Name *
                  </label>
                  <input
                    id="institutionName"
                    type="text"
                    required
                    value={formData.institutionName}
                    onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                    placeholder="e.g. Institute of Engineering & Technology"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="institutionType" className="block text-xs font-semibold text-foreground mb-1">
                    Institution Type
                  </label>
                  <select
                    id="institutionType"
                    value={formData.institutionType}
                    onChange={(e) => setFormData({ ...formData, institutionType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {partnershipFormContent.institutionTypes.map((type, idx) => (
                      <option key={idx} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="city" className="block text-xs font-semibold text-foreground mb-1">
                    City *
                  </label>
                  <input
                    id="city"
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Hyderabad"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-xs font-semibold text-foreground mb-1">
                    State *
                  </label>
                  <input
                    id="state"
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Telangana"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="website" className="block text-xs font-semibold text-foreground mb-1">
                    College Website
                  </label>
                  <input
                    id="website"
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://college.edu.in"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Student Profile & Expected Participation */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                <span>3. Student Profile & Program Scope</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="studentStrength" className="block text-xs font-semibold text-foreground mb-1">
                    Estimated Student Strength
                  </label>
                  <input
                    id="studentStrength"
                    type="text"
                    value={formData.studentStrength}
                    onChange={(e) => setFormData({ ...formData, studentStrength: e.target.value })}
                    placeholder="e.g. 150 – 300 students"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="branches" className="block text-xs font-semibold text-foreground mb-1">
                    Target Branches
                  </label>
                  <input
                    id="branches"
                    type="text"
                    value={formData.branches}
                    onChange={(e) => setFormData({ ...formData, branches: e.target.value })}
                    placeholder="e.g. CSE, IT, ECE, All B.Tech"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="batches" className="block text-xs font-semibold text-foreground mb-1">
                    Academic Year / Batches
                  </label>
                  <input
                    id="batches"
                    type="text"
                    value={formData.batches}
                    onChange={(e) => setFormData({ ...formData, batches: e.target.value })}
                    placeholder="e.g. 3rd & 4th Year (2026/2027)"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Objectives & Timeline */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>4. Partnership Objectives & Timeline</span>
              </h3>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground">
                  Key Training Objectives (Select all that apply)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {partnershipFormContent.objectiveOptions.map((obj, idx) => (
                    <label
                      key={idx}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 cursor-pointer text-xs text-foreground transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.objectives.includes(obj)}
                        onChange={() => handleObjectiveToggle(obj)}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>{obj}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label htmlFor="timeline" className="block text-xs font-semibold text-foreground mb-1">
                  Target Program Timeline
                </label>
                <select
                  id="timeline"
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  className="w-full sm:w-1/2 px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {partnershipFormContent.timelineOptions.map((opt, idx) => (
                    <option key={idx} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label htmlFor="additionalMessage" className="block text-xs font-semibold text-foreground mb-1">
                  Additional Notes or Specific Requirements (Optional)
                </label>
                <textarea
                  id="additionalMessage"
                  rows={3}
                  value={formData.additionalMessage}
                  onChange={(e) => setFormData({ ...formData, additionalMessage: e.target.value })}
                  placeholder="Share details regarding semester schedules, preferred session modes (hybrid/online/on-campus), or existing placement targets."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-muted/40 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                />
              </div>
            </div>

            {/* Section 5: Consent & Submission */}
            <div className="pt-4 border-t border-border space-y-4">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  required
                  checked={formData.consent}
                  onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span>
                  I confirm that I represent this academic institution and authorize RMS Careers to contact me regarding institutional collaboration and program coordination.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !formData.consent}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm sm:text-base shadow-md hover:bg-primary/90 hover:shadow-lg disabled:opacity-50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Send className="h-4 w-4" />
                <span>{loading ? 'Submitting Inquiry...' : 'Submit Partnership Inquiry'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
