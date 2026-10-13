'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  EMPTY_STUDENT_FORM,
  type StudentFieldErrors,
  type StudentFormField,
  type StudentFormValues
} from '@/lib/enrollment/student-form';
import { addStudentToBatchAction, type AddStudentToBatchResult } from './students/actions';

const FIELDS: {
  name: Exclude<StudentFormField, 'year'>;
  label: string;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}[] = [
  { name: 'fullName', label: 'Full name', autoComplete: 'off' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'off' },
  { name: 'phone', label: 'Phone', type: 'tel', inputMode: 'tel', autoComplete: 'off' },
  { name: 'collegeRollNumber', label: 'College roll number', autoComplete: 'off' },
  { name: 'branch', label: 'Branch', autoComplete: 'off' }
];

export function successMessage(
  batchName: string,
  data: Extract<AddStudentToBatchResult, { success: true }>['data']
): string {
  const parts = [
    `Added ${data.studentName} to ${batchName} as Pending. Confirm the enrollment on Enrollments to give portal access.`
  ];
  if (!data.isNewStudent) parts.push('Existing student record reused; its profile was updated from this form.');
  if (data.emails.requested) parts.push(`Emails: ${data.emails.sent} sent, ${data.emails.failed} not sent.`);
  return parts.join(' ');
}

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  batchName: string;
  programLabel: string;
  collegeLabel: string;
  /** Where focus goes when the dialog closes (the Add students button). */
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}

export function AddStudentDialog({
  open,
  onOpenChange,
  batchId,
  batchName,
  programLabel,
  collegeLabel,
  returnFocusRef
}: AddStudentDialogProps) {
  const router = useRouter();
  const [values, setValues] = React.useState<StudentFormValues>(EMPTY_STUDENT_FORM);
  const [sendEmails, setSendEmails] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<StudentFieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const reset = () => {
    setValues(EMPTY_STUDENT_FORM);
    setSendEmails(false);
    setFieldErrors({});
    setFormError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const setField = (name: StudentFormField, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await addStudentToBatchAction(batchId, values, { sendEmails });
      if (res.success) {
        toast.success(successMessage(batchName, res.data));
        reset();
        onOpenChange(false);
        router.refresh();
      } else {
        setFieldErrors(res.fieldErrors ?? {});
        setFormError(res.error);
      }
    } catch {
      setFormError('An unexpected error occurred while adding the student.');
    } finally {
      setSubmitting(false);
    }
  };

  const errorId = (name: StudentFormField) => `add-student-${name}-error`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        onInteractOutside={(event) => {
          if (submitting) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Add a student</DialogTitle>
            <DialogDescription>
              Adding to <strong className="text-foreground">{batchName}</strong> · {programLabel} · {collegeLabel}.
              The enrollment starts as Pending.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            {FIELDS.map((field) => (
              <div key={field.name} className="grid gap-1.5">
                <Label htmlFor={`add-student-${field.name}`}>{field.label}</Label>
                <Input
                  id={`add-student-${field.name}`}
                  name={field.name}
                  type={field.type ?? 'text'}
                  inputMode={field.inputMode}
                  autoComplete={field.autoComplete}
                  required
                  value={values[field.name]}
                  onChange={(e) => setField(field.name, e.target.value)}
                  aria-invalid={fieldErrors[field.name] ? 'true' : undefined}
                  aria-describedby={fieldErrors[field.name] ? errorId(field.name) : undefined}
                  disabled={submitting}
                  className="aria-[invalid=true]:border-destructive"
                />
                {fieldErrors[field.name] ? (
                  <p id={errorId(field.name)} className="text-xs text-destructive">
                    {fieldErrors[field.name]}
                  </p>
                ) : null}
              </div>
            ))}

            <div className="grid gap-1.5">
              <Label htmlFor="add-student-year">Academic year</Label>
              <select
                id="add-student-year"
                name="year"
                required
                value={values.year}
                onChange={(e) => setField('year', e.target.value)}
                aria-invalid={fieldErrors.year ? 'true' : undefined}
                aria-describedby={fieldErrors.year ? errorId('year') : undefined}
                disabled={submitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive"
              >
                <option value="">Select year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
              {fieldErrors.year ? (
                <p id={errorId('year')} className="text-xs text-destructive">
                  {fieldErrors.year}
                </p>
              ) : null}
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="add-student-send-emails"
                checked={sendEmails}
                onChange={(e) => setSendEmails(e.target.checked)}
                disabled={submitting}
                className="mt-0.5"
              />
              <Label htmlFor="add-student-send-emails" className="font-normal leading-snug">
                Send the activation and enrollment confirmation emails now
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} aria-busy={submitting || undefined}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Adding…
                </>
              ) : (
                'Add student'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
