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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">Academic Credentials</h2>
            <p className="text-xs text-slate-400">Institutional record verified via college partnership</p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Verified Student</span>
        </span>
      </div>

      {/* Field Grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* College Name */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Building2 className="h-3.5 w-3.5 text-blue-400" />
            <span>Institution</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-200">
            {academic.collegeName}
            {academic.collegeCode ? ` (${academic.collegeCode})` : ''}
          </p>
        </div>

        {/* Branch / Department */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
            <span>Discipline / Branch</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-200">
            {academic.branch || 'Not Specified'}
          </p>
        </div>

        {/* Academic Year */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Calendar className="h-3.5 w-3.5 text-purple-400" />
            <span>Academic Year</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-200">
            {academic.year ? `Year ${academic.year} (B.Tech)` : 'Undergraduate'}
          </p>
        </div>

        {/* Roll Number */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Hash className="h-3.5 w-3.5 text-amber-400" />
            <span>College Roll Number</span>
          </div>
          <p className="mt-1 text-sm font-mono font-semibold text-slate-200">
            {academic.collegeRollNumber || 'N/A'}
          </p>
        </div>

        {/* Official Email */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span>Primary Email</span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-300 truncate">
            {academic.email}
          </p>
        </div>

        {/* Phone */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span>Contact Phone</span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-300">
            {academic.phone || 'Not Registered'}
          </p>
        </div>
      </div>

      {/* Lock Notice */}
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-950/60 border border-slate-800/50 px-3.5 py-2.5 text-xs text-slate-400">
        <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        <span>Academic and enrollment data are read-only and maintained directly by your institution.</span>
      </div>
    </div>
  );
}
