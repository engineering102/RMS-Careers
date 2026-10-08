'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PlusCircle, BookOpen, ExternalLink, Check, Copy, Users, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { EmptyState } from '@/components/admin/empty-state';
import {
  createProgramAction,
  updateProgramStatusAction,
  updateProgramCollegeAction
} from './actions';
import { selectableColleges } from '@/lib/utils/college';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils/format-date';

interface CollegeOption {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

const NO_COLLEGE = '__none__';

interface ProgramItem {
  id: number;
  name: string;
  code: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  capacity: number;
  collegeId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  enrollmentCount?: number;
  remainingCapacity?: number;
}

export function ProgramsClient({
  initialPrograms,
  colleges
}: {
  initialPrograms: ProgramItem[];
  colleges: CollegeOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyUrl = (code: string) => {
    const url = `${window.location.origin}/enroll/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    toast.success('Enrollment link copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleStatusChange = async (id: number, status: 'draft' | 'active' | 'archived') => {
    const res = await updateProgramStatusAction(id, status);
    if (res.success) {
      toast.success(`Program status updated to ${status}`);
    } else {
      toast.error(res.error || 'Failed to update status');
    }
  };

  const handleCollegeChange = async (id: number, value: string) => {
    const res = await updateProgramCollegeAction(id, value === NO_COLLEGE ? null : value);
    if (res.success) {
      toast.success('Program college updated');
    } else {
      toast.error(res.error || 'Failed to update college');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await createProgramAction(formData);
    setLoading(false);
    if (res.success) {
      toast.success('Program created successfully');
      setIsOpen(false);
    } else {
      toast.error(res.error || 'Failed to create program');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Programs</h1>
          <p className="text-sm text-muted-foreground">
            Manage training programs and enrollment campaigns.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 gap-1.5">
              <PlusCircle className="h-4 w-4" />
              <span>New Program</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create Program</DialogTitle>
                <DialogDescription>
                  Enter details to set up a new training program for student enrollment.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Program Name *
                  </label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g. Bulk Import Test"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="code" className="text-sm font-medium">
                      Program Code *
                    </label>
                    <Input
                      id="code"
                      name="code"
                      placeholder="e.g. BULK-TEST-2026"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="capacity" className="text-sm font-medium">
                      Capacity *
                    </label>
                    <Input
                      id="capacity"
                      name="capacity"
                      type="number"
                      min="1"
                      placeholder="e.g. 10"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Brief description of the program"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="collegeId" className="text-sm font-medium">
                    College
                  </label>
                  <Select name="collegeId" defaultValue={NO_COLLEGE}>
                    <SelectTrigger id="collegeId">
                      <SelectValue placeholder="No college" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_COLLEGE}>No college (unassigned)</SelectItem>
                      {selectableColleges(colleges).map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.name} ({col.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="status" className="text-sm font-medium">
                      Status
                    </label>
                    <Select name="status" defaultValue="draft">
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="startDate" className="text-sm font-medium">
                      Start Date
                    </label>
                    <Input id="startDate" name="startDate" type="date" />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="endDate" className="text-sm font-medium">
                      End Date
                    </label>
                    <Input id="endDate" name="endDate" type="date" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Program'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {initialPrograms.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Create your first program"
          description="Set up a training program with schedule and capacity to start accepting student enrollments."
          action={
            <Button size="sm" variant="outline" onClick={() => setIsOpen(true)} className="gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" />
              Create Program
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {initialPrograms.map((prog) => (
            <Card key={prog.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-semibold">{prog.name}</CardTitle>
                  <Badge
                    variant={
                      prog.status === 'active'
                        ? 'default'
                        : prog.status === 'draft'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {prog.status.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription className="font-mono text-xs font-semibold text-primary">
                  Code: {prog.code}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm pb-3 flex-grow">
                {prog.description && (
                  <p className="text-muted-foreground text-xs line-clamp-2">{prog.description}</p>
                )}
                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> Enrolled:
                    </span>
                    <span className="font-semibold text-foreground">
                      {prog.enrollmentCount ?? 0} / {prog.capacity}
                    </span>
                  </div>
                  {prog.capacity > 0 && (
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, ((prog.enrollmentCount ?? 0) / prog.capacity) * 100)}%` }}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">College:</span>
                    <Select
                      defaultValue={prog.collegeId ?? NO_COLLEGE}
                      onValueChange={(val) => handleCollegeChange(prog.id, val)}
                    >
                      <SelectTrigger className="h-7 w-[170px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_COLLEGE}>No college</SelectItem>
                        {selectableColleges(colleges, prog.collegeId).map((col) => (
                          <SelectItem key={col.id} value={col.id}>
                            {col.name}
                            {col.isActive ? '' : ' (inactive)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {prog.startDate && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Start Date:</span>
                      <span className="font-medium">
                        {formatDate(prog.startDate)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 pt-3 border-t bg-muted/20">
                <div className="flex items-center justify-between w-full gap-2">
                  <Select
                    defaultValue={prog.status}
                    onValueChange={(val) =>
                      handleStatusChange(prog.id, val as 'draft' | 'active' | 'archived')
                    }
                  >
                    <SelectTrigger className="h-8 text-xs w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1">
                    <Link href={`/enrollments?program=${prog.code}`}>
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1" title="View Enrollments">
                        <List className="h-3 w-3" />
                        Enrollments
                      </Button>
                    </Link>

                    {prog.status === 'active' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleCopyUrl(prog.code)}
                          title="Copy Enrollment Link"
                        >
                          {copiedCode === prog.code ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <a href={`/enroll/${prog.code}`} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Open Enrollment Form">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
