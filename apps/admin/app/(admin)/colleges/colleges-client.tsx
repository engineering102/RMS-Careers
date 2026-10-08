'use client';

import { useState } from 'react';
import { PlusCircle, Building2, Pencil, Power } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { EmptyState } from '@/components/admin/empty-state';
import { formatDate } from '@/lib/utils/format-date';
import { createCollegeAction, updateCollegeAction, setCollegeActiveAction } from './actions';

interface CollegeItem {
  id: string;
  name: string;
  code: string;
  city: string | null;
  state: string | null;
  isActive: boolean;
  createdAt: Date;
}

export function CollegesClient({ initialColleges }: { initialColleges: CollegeItem[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CollegeItem | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [statusTarget, setStatusTarget] = useState<CollegeItem | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (college: CollegeItem) => {
    setEditing(college);
    setFieldErrors({});
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (editing) formData.set('id', editing.id);
    const res = editing
      ? await updateCollegeAction(formData)
      : await createCollegeAction(formData);
    setLoading(false);
    if (res.success) {
      toast.success(editing ? 'College updated' : 'College created');
      setFormOpen(false);
    } else {
      setFieldErrors(res.fieldErrors ?? {});
      toast.error(res.error || 'Failed to save college');
    }
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    setLoading(true);
    const res = await setCollegeActiveAction(statusTarget.id, !statusTarget.isActive);
    setLoading(false);
    if (res.success) {
      toast.success(statusTarget.isActive ? 'College deactivated' : 'College activated');
      setStatusTarget(null);
    } else {
      toast.error(res.error || 'Failed to update status');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Colleges</h1>
          <p className="text-sm text-muted-foreground">
            Manage partner institutions. Deactivating a college keeps all existing records.
          </p>
        </div>
        <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
          <PlusCircle className="h-4 w-4" />
          <span>New College</span>
        </Button>
      </div>

      {initialColleges.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Add your first college"
          description="Register a partner institution so programs and batches can be associated with it."
          action={
            <Button size="sm" variant="outline" onClick={openCreate} className="gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" />
              Create College
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialColleges.map((college) => (
                <TableRow key={college.id}>
                  <TableCell className="font-medium">{college.name}</TableCell>
                  <TableCell className="font-mono text-xs">{college.code}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[college.city, college.state].filter(Boolean).join(', ') || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={college.isActive ? 'default' : 'outline'}>
                      {college.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(college.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs"
                        onClick={() => openEdit(college)}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        onClick={() => setStatusTarget(college)}
                      >
                        <Power className="h-3 w-3" />
                        {college.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit} key={editing?.id ?? 'new'}>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit College' : 'Create College'}</DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Update institution details. The college identifier never changes.'
                  : 'Register a new partner institution.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="college-name" className="text-sm font-medium">
                  College Name *
                </label>
                <Input id="college-name" name="name" defaultValue={editing?.name ?? ''} required />
                {fieldErrors.name && (
                  <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
                )}
              </div>
              <div className="grid gap-2">
                <label htmlFor="college-code" className="text-sm font-medium">
                  College Code *
                </label>
                <Input
                  id="college-code"
                  name="code"
                  placeholder="e.g. MVSR"
                  defaultValue={editing?.code ?? ''}
                  required
                />
                {fieldErrors.code && (
                  <p className="text-xs text-destructive">{fieldErrors.code[0]}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="college-city" className="text-sm font-medium">
                    City
                  </label>
                  <Input id="college-city" name="city" defaultValue={editing?.city ?? ''} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="college-state" className="text-sm font-medium">
                    State
                  </label>
                  <Input id="college-state" name="state" defaultValue={editing?.state ?? ''} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editing ? 'Save Changes' : 'Create College'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>
              {statusTarget?.isActive ? 'Deactivate' : 'Activate'} {statusTarget?.name}?
            </DialogTitle>
            <DialogDescription>
              {statusTarget?.isActive
                ? 'This college will no longer be offered when creating programs, batches or imports. Existing students, programs, batches and enrollments are not changed. You can reactivate it at any time.'
                : 'This college will be offered again in selectors for new programs, batches and imports.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={statusTarget?.isActive ? 'destructive' : 'default'}
              disabled={loading}
              onClick={confirmStatusChange}
            >
              {loading ? 'Updating...' : statusTarget?.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
