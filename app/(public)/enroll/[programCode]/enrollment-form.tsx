'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { submitStudentEnrollment, type EnrollmentActionResult } from './actions';
import { toast } from 'sonner';

interface EnrollmentFormProps {
  programCode: string;
  programName: string;
}

export function EnrollmentForm({ programCode, programName }: EnrollmentFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [successData, setSuccessData] = React.useState<{
    studentName: string;
    programName: string;
    programCode: string;
    status: string;
  } | null>(null);

  // Form field states
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [collegeRollNumber, setCollegeRollNumber] = React.useState('');
  const [branch, setBranch] = React.useState('');
  const [year, setYear] = React.useState<string>('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Client-side quick checks
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = 'Full Name is required';
    if (!email.trim()) errors.email = 'Email is required';
    if (!phone.trim()) errors.phone = 'Phone Number is required';
    if (!collegeRollNumber.trim()) errors.collegeRollNumber = 'College Roll Number is required';
    if (!branch.trim()) errors.branch = 'Branch is required';
    if (!year) errors.year = 'Year is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const result: EnrollmentActionResult = await submitStudentEnrollment({
        programCode,
        fullName,
        email,
        phone,
        collegeRollNumber,
        branch,
        year: Number(year)
      });

      if (result.success) {
        setSuccessData({
          studentName: result.data.studentName,
          programName: result.data.programName,
          programCode: result.data.programCode,
          status: result.data.status
        });
        toast.success('Registration completed successfully!');
      } else {
        setFormError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        toast.error(result.error);
      }
    } catch (err) {
      console.error(err);
      setFormError('An unexpected error occurred. Please try again.');
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Render Success Screen if registration completed
  if (successData) {
    return (
      <Card className="border-emerald-200 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-lg animate-in fade-in-50 duration-300">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-50">
            Registration Successful
          </CardTitle>
          <CardDescription className="text-emerald-800/80 dark:text-emerald-300/80 text-base">
            You&apos;re registered for <strong className="font-semibold">{successData.programName}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md mx-auto">
          <div className="rounded-lg border bg-background/80 p-4 space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground font-medium">Student Name</span>
              <span className="font-semibold text-foreground">{successData.studentName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground font-medium">Program Name</span>
              <span className="font-semibold text-foreground">{successData.programName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground font-medium">Program Code</span>
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{successData.programCode}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground font-medium">Registration Status</span>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 capitalize dark:bg-amber-950 dark:text-amber-300">
                {successData.status}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Your registration is currently pending review by the academy administration.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render Registration Form
  return (
    <Card className="shadow-md border-border">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
          <Sparkles className="h-3.5 w-3.5" /> Student Registration
        </div>
        <CardTitle className="text-xl font-bold">Register for Program</CardTitle>
        <CardDescription>
          Fill in your details below to register for {programName}.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5 animate-in fade-in-50">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-sm font-medium leading-none">
              Full Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="fullName"
              placeholder="e.g. Rahul Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSubmitting}
              className={fieldErrors.fullName ? 'border-destructive' : ''}
            />
            {fieldErrors.fullName && (
              <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
            )}
          </div>

          {/* Email & Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium leading-none">
                Email Address <span className="text-destructive">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. rahul@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className={fieldErrors.email ? 'border-destructive' : ''}
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-sm font-medium leading-none">
                Phone Number <span className="text-destructive">*</span>
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting}
                className={fieldErrors.phone ? 'border-destructive' : ''}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-destructive">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          {/* College Roll Number & Branch Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="collegeRollNumber" className="text-sm font-medium leading-none">
                College Roll Number <span className="text-destructive">*</span>
              </label>
              <Input
                id="collegeRollNumber"
                placeholder="e.g. 21GN1A0501"
                value={collegeRollNumber}
                onChange={(e) => setCollegeRollNumber(e.target.value)}
                disabled={isSubmitting}
                className={fieldErrors.collegeRollNumber ? 'border-destructive' : ''}
              />
              {fieldErrors.collegeRollNumber && (
                <p className="text-xs text-destructive">{fieldErrors.collegeRollNumber}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="branch" className="text-sm font-medium leading-none">
                Branch / Specialization <span className="text-destructive">*</span>
              </label>
              <Input
                id="branch"
                placeholder="e.g. CSE / IT / ECE"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                disabled={isSubmitting}
                className={fieldErrors.branch ? 'border-destructive' : ''}
              />
              {fieldErrors.branch && (
                <p className="text-xs text-destructive">{fieldErrors.branch}</p>
              )}
            </div>
          </div>

          {/* Year */}
          <div className="space-y-1.5">
            <label htmlFor="year" className="text-sm font-medium leading-none">
              Academic Year <span className="text-destructive">*</span>
            </label>
            <Select
              value={year}
              onValueChange={setYear}
              disabled={isSubmitting}
            >
              <SelectTrigger id="year" className={fieldErrors.year ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select academic year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1st Year</SelectItem>
                <SelectItem value="2">2nd Year</SelectItem>
                <SelectItem value="3">3rd Year</SelectItem>
                <SelectItem value="4">4th Year</SelectItem>
              </SelectContent>
            </Select>
            {fieldErrors.year && (
              <p className="text-xs text-destructive">{fieldErrors.year}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <Button
            type="submit"
            className="w-full text-base h-11 font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting Registration...
              </>
            ) : (
              'Complete Registration'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
