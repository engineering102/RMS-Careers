import React from 'react';
import {
  GraduationCap,
  Building2,
  Calendar,
  Hash,
  Mail,
  Phone,
  ShieldCheck,
  Lock
} from 'lucide-react';
import type { StudentAcademicProfile } from '@/lib/types/profile';

interface AcademicCardProps {
  academic: StudentAcademicProfile;
}

export function AcademicCard({ academic }: AcademicCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Academic Credentials</h2>
            <p className="text-xs text-muted-foreground">Institutional record verified via college partnership</p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-medium text-success">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Verified Student</span>
        </span>
      </div>

      {/* Field Grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* College Name */}
        <div className="rounded-xl border border-border/80 bg-background/40 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span>Institution</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {academic.collegeName}
            {academic.collegeCode ? ` (${academic.collegeCode})` : ''}
          </p>
        </div>

        {/* Branch / Department */}
        <div className="rounded-xl border border-border/80 bg-background/40 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
            <span>Discipline / Branch</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {academic.branch || 'Not Specified'}
          </p>
        </div>

        {/* Academic Year */}
        <div className="rounded-xl border border-border/80 bg-background/40 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-purple-400" />
            <span>Academic Year</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {academic.year ? `Year ${academic.year} (B.Tech)` : 'Undergraduate'}
          </p>
        </div>

        {/* Roll Number */}
        <div className="rounded-xl border border-border/80 bg-background/40 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Hash className="h-3.5 w-3.5 text-warning" />
            <span>College Roll Number</span>
          </div>
          <p className="mt-1 text-sm font-mono font-semibold text-foreground">
            {academic.collegeRollNumber || 'N/A'}
          </p>
        </div>

        {/* Official Email */}
        <div className="rounded-xl border border-border/80 bg-background/40 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Primary Email</span>
          </div>
          <p className="mt-1 text-sm font-medium text-foreground/80 truncate">
            {academic.email}
          </p>
        </div>

        {/* Phone */}
        <div className="rounded-xl border border-border/80 bg-background/40 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Contact Phone</span>
          </div>
          <p className="mt-1 text-sm font-medium text-foreground/80">
            {academic.phone || 'Not Registered'}
          </p>
        </div>
      </div>

      {/* Lock Notice */}
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-background/60 border border-border/50 px-3.5 py-2.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span>Academic and enrollment data are read-only and maintained directly by your institution.</span>
      </div>
    </div>
  );
}
