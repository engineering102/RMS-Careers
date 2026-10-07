/**
 * @file apps/admin/lib/utils/external-assessment-template.ts
 *
 * Sample CSV template generator for external assessment ingestion.
 * Client-safe: does not import database or server-only modules.
 */

export function generateExternalAssessmentCsvTemplate(): string {
  const headers = [
    'College Roll Number',
    'Email',
    'Score',
    'Max Score',
    'Percentile'
  ];

  const sampleRows = [
    ['CS2026-001', 'aarav@college.edu', '88', '100', '92'],
    ['CS2026-002', 'bhavna@college.edu', '75', '100', '78'],
    ['CS2026-003', 'chirag@college.edu', '94', '100', '98']
  ];

  return [
    headers.join(','),
    ...sampleRows.map((r) => r.join(','))
  ].join('\n');
}
