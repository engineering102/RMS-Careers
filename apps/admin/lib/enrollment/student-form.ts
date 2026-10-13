// Client-safe field model for adding one student to a batch. The rules themselves are not repeated
// here: the Server Action validates with lib/csv/validator.ts (the bulk import validator), and this
// file only maps that validator's messages back to form fields.

export type StudentFormField = 'fullName' | 'email' | 'phone' | 'collegeRollNumber' | 'branch' | 'year';

export type StudentFormValues = Record<StudentFormField, string>;

export const EMPTY_STUDENT_FORM: StudentFormValues = {
  fullName: '',
  email: '',
  phone: '',
  collegeRollNumber: '',
  branch: '',
  year: ''
};

export type StudentFieldErrors = Partial<Record<StudentFormField, string>>;

/** Which field each bulk-import validator message is about (matched on the message text). */
const ISSUE_FIELDS: { field: StudentFormField; pattern: RegExp }[] = [
  { field: 'fullName', pattern: /full name/i },
  { field: 'email', pattern: /email/i },
  { field: 'phone', pattern: /phone/i },
  { field: 'collegeRollNumber', pattern: /roll number/i },
  { field: 'branch', pattern: /branch/i },
  { field: 'year', pattern: /academic year/i }
];

/**
 * Splits a validator `issue` ("A; B; C") into per-field messages. A message that matches no field is
 * returned under `unmatched` so it is still shown.
 */
export function fieldErrorsFromIssue(issue: string | undefined): {
  fieldErrors: StudentFieldErrors;
  unmatched: string[];
} {
  const fieldErrors: StudentFieldErrors = {};
  const unmatched: string[] = [];
  for (const message of (issue ?? '').split(';').map((m) => m.trim()).filter(Boolean)) {
    const match = ISSUE_FIELDS.find((f) => f.pattern.test(message));
    if (match && !fieldErrors[match.field]) fieldErrors[match.field] = message;
    else if (!match) unmatched.push(message);
  }
  return { fieldErrors, unmatched };
}
