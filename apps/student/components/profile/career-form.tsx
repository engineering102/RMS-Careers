'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  Github,
  Linkedin,
  Globe,
  Building2,
  Code2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { updateStudentProfileAction } from '@/lib/actions/profile';
import type { StudentCareerProfile } from '@/lib/types/profile';

interface CareerFormProps {
  career: StudentCareerProfile;
}

const POPULAR_LANGUAGES = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Java',
  'C++',
  'Go',
  'Rust',
  'C#',
  'SQL'
];

export function CareerForm({ career }: CareerFormProps) {
  const [githubUrl, setGithubUrl] = useState(career.githubUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(career.linkedinUrl || '');
  const [portfolioUrl, setPortfolioUrl] = useState(career.portfolioUrl || '');
  const [targetCompanies, setTargetCompanies] = useState(career.targetCompanies || '');
  const [primaryLanguage, setPrimaryLanguage] = useState(career.primaryLanguage || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await updateStudentProfileAction({
        githubUrl: githubUrl.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        portfolioUrl: portfolioUrl.trim() || null,
        targetCompanies: targetCompanies.trim() || null,
        primaryLanguage: primaryLanguage.trim() || null
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || 'Career profile updated successfully!'
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to update career profile.'
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'An unexpected network error occurred while updating profile.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <Briefcase className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-100">Career & Placement Profile</h2>
          <p className="text-xs text-slate-400">
            Portfolio links and engineering preferences shared with placement coordinators
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* GitHub & LinkedIn URLs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Github className="h-3.5 w-3.5 text-slate-400" />
              <span>GitHub Profile</span>
            </label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Linkedin className="h-3.5 w-3.5 text-sky-400" />
              <span>LinkedIn Profile</span>
            </label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Portfolio Website */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-emerald-400" />
            <span>Personal Portfolio / Blog URL</span>
          </label>
          <input
            type="url"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            placeholder="https://myportfolio.dev"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Target Companies & Primary Language */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-amber-400" />
              <span>Target Companies</span>
            </label>
            <input
              type="text"
              value={targetCompanies}
              onChange={(e) => setTargetCompanies(e.target.value)}
              placeholder="e.g. Google, Microsoft, Amazon, Atlassian"
              maxLength={255}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">Comma-separated target companies</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-purple-400" />
              <span>Primary Language</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={primaryLanguage}
                onChange={(e) => setPrimaryLanguage(e.target.value)}
                placeholder="e.g. TypeScript, Java, Python"
                maxLength={50}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {/* Quick language chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {POPULAR_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setPrimaryLanguage(lang)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition ${
                    primaryLanguage === lang
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`flex items-center gap-2 rounded-xl p-3.5 text-xs ${
              feedback.type === 'success'
                ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                : 'border border-red-500/20 bg-red-500/10 text-red-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Changes…</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
