'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Layers,
  ArrowLeft,
  PlusCircle,
  Calendar,
  Building2,
  BookOpen,
  Globe,
  Trash2,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Check,
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { EmptyState } from '@/components/admin/empty-state';
import { formatDate } from '@/lib/utils/format-date';
import { toast } from 'sonner';
import {
  addContentToBatchAction,
  updatePlacementAction,
  removePlacementAction,
  reorderCurriculumAction
} from './actions';
import type {
  CurriculumPlacementItem,
  EligibleContentItem
} from '@/lib/db/queries';
import type { Batch, College, Program, ContentTypeEnum } from '@rms/db';

interface BatchCurriculumClientProps {
  batch: Batch;
  college: College | null;
  program: Program | null;
  initialCurriculum: CurriculumPlacementItem[];
  eligibleContent: EligibleContentItem[];
}

const CONTENT_TYPE_LABELS: Record<ContentTypeEnum, string> = {
  lecture: 'Lecture',
  notes: 'Notes / Reading',
  dsa_sheet: 'DSA Sheet',
  quiz: 'Assessment Quiz',
  project: 'Project Milestone',
  resource: 'External Resource'
};

export function BatchCurriculumClient({
  batch,
  college,
  program,
  initialCurriculum,
  eligibleContent
}: BatchCurriculumClientProps) {
  const router = useRouter();
  const isReadOnly = ['completed', 'archived'].includes(batch.status);

  // Dialog States
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingPlacement, setEditingPlacement] = React.useState<CurriculumPlacementItem | null>(null);
  const [deletingPlacement, setDeletingPlacement] = React.useState<CurriculumPlacementItem | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Add Content Modal States
  const [selectedContentId, setSelectedContentId] = React.useState<string>('');
  const [addWeekNumber, setAddWeekNumber] = React.useState<number>(1);
  const [addIsRequired, setAddIsRequired] = React.useState<boolean>(true);
  const [addAvailableFrom, setAddAvailableFrom] = React.useState<string>('');
  const [addDueAt, setAddDueAt] = React.useState<string>('');
  const [pickerSearch, setPickerSearch] = React.useState<string>('');
  const [pickerType, setPickerType] = React.useState<string>('all');

  // Edit Placement States
  const [editWeekNumber, setEditWeekNumber] = React.useState<number>(1);
  const [editSequenceOrder, setEditSequenceOrder] = React.useState<number>(1);
  const [editIsRequired, setEditIsRequired] = React.useState<boolean>(true);
  const [editAvailableFrom, setEditAvailableFrom] = React.useState<string>('');
  const [editDueAt, setEditDueAt] = React.useState<string>('');

  // Group curriculum items by weekNumber
  const weeksMap = React.useMemo(() => {
    const map = new Map<number, CurriculumPlacementItem[]>();
    for (const item of initialCurriculum) {
      if (!map.has(item.weekNumber)) {
        map.set(item.weekNumber, []);
      }
      map.get(item.weekNumber)!.push(item);
    }
    // Sort items within each week by sequenceOrder
    for (const [, items] of map.entries()) {
      items.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    }
    return map;
  }, [initialCurriculum]);

  const sortedWeeks = React.useMemo(() => {
    return Array.from(weeksMap.keys()).sort((a, b) => a - b);
  }, [weeksMap]);

  // Next suggested week
  const highestWeek = sortedWeeks.length > 0 ? sortedWeeks[sortedWeeks.length - 1] : 1;

  // Filter eligible content inside picker
  const filteredEligibleContent = React.useMemo(() => {
    return eligibleContent.filter((c) => {
      if (pickerType !== 'all' && c.contentType !== pickerType) return false;
      if (pickerSearch.trim()) {
        const query = pickerSearch.trim().toLowerCase();
        return (
          c.title.toLowerCase().includes(query) ||
          c.slug.toLowerCase().includes(query) ||
          (c.topic && c.topic.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [eligibleContent, pickerType, pickerSearch]);

  const handleOpenAdd = (defaultWeek?: number) => {
    setAddWeekNumber(defaultWeek ?? (highestWeek || 1));
    setSelectedContentId('');
    setAddIsRequired(true);
    setAddAvailableFrom('');
    setAddDueAt('');
    setPickerSearch('');
    setPickerType('all');
    setIsAddOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContentId) {
      toast.error('Please select a content item to add.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await addContentToBatchAction(batch.id, {
        contentItemId: selectedContentId,
        weekNumber: addWeekNumber,
        isRequired: addIsRequired,
        availableFrom: addAvailableFrom ? new Date(addAvailableFrom).toISOString() : undefined,
        dueAt: addDueAt ? new Date(addDueAt).toISOString() : undefined
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to add content.');
        return;
      }

      toast.success('Content item placed into batch curriculum.');
      setIsAddOpen(false);
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item: CurriculumPlacementItem) => {
    setEditingPlacement(item);
    setEditWeekNumber(item.weekNumber);
    setEditSequenceOrder(item.sequenceOrder);
    setEditIsRequired(item.isRequired);
    setEditAvailableFrom(
      item.availableFrom ? new Date(item.availableFrom).toISOString().slice(0, 16) : ''
    );
    setEditDueAt(item.dueAt ? new Date(item.dueAt).toISOString().slice(0, 16) : '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlacement) return;

    try {
      setSubmitting(true);
      const res = await updatePlacementAction(batch.id, editingPlacement.id, {
        weekNumber: editWeekNumber,
        sequenceOrder: editSequenceOrder,
        isRequired: editIsRequired,
        availableFrom: editAvailableFrom ? new Date(editAvailableFrom).toISOString() : undefined,
        dueAt: editDueAt ? new Date(editDueAt).toISOString() : undefined
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to update placement.');
        return;
      }

      toast.success('Curriculum placement updated.');
      setEditingPlacement(null);
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!deletingPlacement) return;
    try {
      setSubmitting(true);
      const res = await removePlacementAction(batch.id, deletingPlacement.id);
      if (!res.success) {
        toast.error(res.error || 'Failed to remove placement.');
        return;
      }
      toast.success('Placement removed from batch. Canonical content preserved.');
      setDeletingPlacement(null);
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveSequence = async (
    item: CurriculumPlacementItem,
    direction: 'up' | 'down'
  ) => {
    if (isReadOnly) return;
    const weekItems = weeksMap.get(item.weekNumber) || [];
    const currentIndex = weekItems.findIndex((x) => x.id === item.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= weekItems.length) return;

    const targetItem = weekItems[targetIndex];

    const updates = [
      { placementId: item.id, weekNumber: item.weekNumber, sequenceOrder: targetItem.sequenceOrder },
      { placementId: targetItem.id, weekNumber: targetItem.weekNumber, sequenceOrder: item.sequenceOrder }
    ];

    try {
      const res = await reorderCurriculumAction(batch.id, updates);
      if (!res.success) {
        toast.error(res.error || 'Failed to reorder items.');
        return;
      }
      toast.success('Item sequence updated.');
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred.');
    }
  };

  const handleToggleRequired = async (item: CurriculumPlacementItem) => {
    if (isReadOnly) return;
    try {
      const res = await updatePlacementAction(batch.id, item.id, {
        isRequired: !item.isRequired
      });
      if (!res.success) {
        toast.error(res.error || 'Failed to toggle required status.');
        return;
      }
      toast.success(`Marked as ${!item.isRequired ? 'Required' : 'Optional'}.`);
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred.');
    }
  };

  const totalItems = initialCurriculum.length;
  const requiredCount = initialCurriculum.filter((c) => c.isRequired).length;
  const optionalCount = totalItems - requiredCount;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Navigation & Breadcrumb Backlink */}
      <div className="flex items-center gap-2">
        <Link
          href="/batches"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Batches
        </Link>
      </div>

      {/* Header Card */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">{batch.name}</h1>
            <Badge
              variant="outline"
              className={
                batch.status === 'active'
                  ? 'border-emerald-500/30 text-emerald-700 bg-emerald-500/10'
                  : batch.status === 'completed'
                  ? 'border-blue-500/30 text-blue-700 bg-blue-500/10'
                  : 'border-slate-500/30 text-slate-700 bg-slate-500/10'
              }
            >
              {batch.status.toUpperCase()}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2">
            {program && (
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                Program: <strong className="text-foreground">{program.name} ({program.code})</strong>
              </span>
            )}
            {college && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                College: <strong className="text-foreground">{college.name}</strong>
              </span>
            )}
            {batch.startDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Timeline: {formatDate(batch.startDate)} – {batch.endDate ? formatDate(batch.endDate) : 'Ongoing'}
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        {!isReadOnly && (
          <Button onClick={() => handleOpenAdd()} className="gap-2 shrink-0">
            <PlusCircle className="h-4 w-4" />
            Add Content
          </Button>
        )}
      </div>

      {/* Read-Only Banner */}
      {isReadOnly && (
        <div className="flex items-center gap-3 p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            This batch is marked as <strong>{batch.status}</strong>. Curriculum placements are archived and read-only.
          </span>
        </div>
      )}

      {/* Curriculum Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total Placements</div>
          <div className="text-2xl font-bold mt-0.5">{totalItems}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Active Weeks</div>
          <div className="text-2xl font-bold mt-0.5">{sortedWeeks.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Required Content</div>
          <div className="text-2xl font-bold mt-0.5 text-emerald-600">{requiredCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Optional Materials</div>
          <div className="text-2xl font-bold mt-0.5 text-slate-500">{optionalCount}</div>
        </Card>
      </div>

      {/* Empty State */}
      {initialCurriculum.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No curriculum assigned yet"
          description="Build this batch's learning schedule by adding published canonical content items from the central library."
          action={
            !isReadOnly && (
              <Button onClick={() => handleOpenAdd(1)} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Add First Content Item
              </Button>
            )
          }
        />
      ) : (
        /* Weeks Accordion / Sections */
        <div className="flex flex-col gap-5">
          {sortedWeeks.map((weekNum) => {
            const items = weeksMap.get(weekNum) || [];

            return (
              <Card key={weekNum} className="border shadow-sm overflow-hidden">
                <CardHeader className="p-4 bg-muted/40 border-b flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Badge variant="secondary" className="font-semibold text-sm px-2.5 py-0.5">
                      Week {weekNum}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {items.length} item{items.length === 1 ? '' : 's'} assigned
                    </span>
                  </div>

                  {!isReadOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenAdd(weekNum)}
                      className="gap-1 h-7 text-xs"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add to Week {weekNum}
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="p-0 divide-y">
                  {items.map((item, index) => {
                    const isFirst = index === 0;
                    const isLast = index === items.length - 1;

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                      >
                        {/* Sequence & Content Info */}
                        <div className="flex items-start gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-xs font-mono font-semibold text-muted-foreground mt-0.5">
                            #{item.sequenceOrder}
                          </div>

                          <div className="flex flex-col">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground text-sm">
                                {item.title}
                              </span>

                              {/* Content Type Badge */}
                              <Badge variant="secondary" className="text-[11px] font-normal px-2 py-0 capitalize">
                                {CONTENT_TYPE_LABELS[item.contentType] || item.contentType}
                              </Badge>

                              {/* Scope Badge */}
                              {item.isGlobal ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 gap-1"
                                >
                                  <Globe className="h-2.5 w-2.5" />
                                  Global
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30"
                                >
                                  {item.contentProgramCode || 'Program'}
                                </Badge>
                              )}

                              {/* Archived Notice */}
                              {item.lifecycleStatus === 'archived' && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30"
                                >
                                  Archived in Library
                                </Badge>
                              )}
                            </div>

                            <span className="text-xs text-muted-foreground font-mono mt-0.5">
                              /{item.slug}
                            </span>

                            {/* Schedule info if set */}
                            {(item.availableFrom || item.dueAt) && (
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                                {item.availableFrom && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Available: {formatDate(item.availableFrom)}
                                  </span>
                                )}
                                {item.dueAt && (
                                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                    <CalendarDays className="h-3 w-3" />
                                    Due: {formatDate(item.dueAt)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controls & Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {/* Required / Optional Toggle */}
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleToggleRequired(item)}
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              item.isRequired
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium'
                                : 'bg-muted text-muted-foreground border-transparent'
                            } ${!isReadOnly ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                          >
                            {item.isRequired && <Check className="h-3 w-3" />}
                            {item.isRequired ? 'Required' : 'Optional'}
                          </button>

                          {/* Reorder Up / Down */}
                          {!isReadOnly && (
                            <div className="flex items-center rounded border bg-background">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isFirst}
                                onClick={() => handleMoveSequence(item, 'up')}
                                className="h-7 w-7 p-0 rounded-r-none"
                                title="Move up in sequence"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isLast}
                                onClick={() => handleMoveSequence(item, 'down')}
                                className="h-7 w-7 p-0 rounded-l-none border-l"
                                title="Move down in sequence"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}

                          {/* Edit Schedule / Week */}
                          {!isReadOnly && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(item)}
                              className="h-7 text-xs px-2.5"
                            >
                              Edit
                            </Button>
                          )}

                          {/* Remove Placement */}
                          {!isReadOnly && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeletingPlacement(item)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                              title="Remove placement"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Content Modal (Picker) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Content to Batch Curriculum</DialogTitle>
            <DialogDescription>
              Select an eligible published content item to place into this batch.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
            {/* Filter / Search within picker */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search available content..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <div className="w-full sm:w-44">
                <Select value={pickerType} onValueChange={setPickerType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(CONTENT_TYPE_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Content Selection List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto border rounded-md p-2">
              {filteredEligibleContent.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No eligible published content found matching your search.
                </div>
              ) : (
                filteredEligibleContent.map((c) => {
                  const isSelected = selectedContentId === c.id;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedContentId(c.id)}
                      className={`w-full text-left p-2.5 rounded-md border text-xs transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-transparent hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm leading-snug">{c.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-muted-foreground font-mono">/{c.slug}</span>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 capitalize font-normal">
                            {CONTENT_TYPE_LABELS[c.contentType] || c.contentType}
                          </Badge>
                          {c.isGlobal ? (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 text-sky-600 border-sky-500/30">
                              Global
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 text-purple-600 border-purple-500/30">
                              {c.programCode || 'Program'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Target Placement Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Target Week *</label>
                <Input
                  type="number"
                  min="1"
                  max="104"
                  required
                  value={addWeekNumber}
                  onChange={(e) => setAddWeekNumber(parseInt(e.target.value, 10) || 1)}
                  className="h-9"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="addIsRequired"
                  checked={addIsRequired}
                  onChange={(e) => setAddIsRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="addIsRequired" className="text-xs font-medium cursor-pointer">
                  Mark as Required (Default)
                </label>
              </div>
            </div>

            {/* Schedule (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Available From (optional)</label>
                <Input
                  type="datetime-local"
                  value={addAvailableFrom}
                  onChange={(e) => setAddAvailableFrom(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Due Date (optional)</label>
                <Input
                  type="datetime-local"
                  value={addDueAt}
                  onChange={(e) => setAddDueAt(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !selectedContentId}>
                {submitting ? 'Placing...' : 'Place in Curriculum'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Placement Modal */}
      {editingPlacement && (
        <Dialog open={!!editingPlacement} onOpenChange={(open) => !open && setEditingPlacement(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Placement</DialogTitle>
              <DialogDescription>
                Adjust week assignment, order, and scheduling for {editingPlacement.title}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Week Number *</label>
                  <Input
                    type="number"
                    min="1"
                    max="104"
                    required
                    value={editWeekNumber}
                    onChange={(e) => setEditWeekNumber(parseInt(e.target.value, 10) || 1)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Sequence Order *</label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={editSequenceOrder}
                    onChange={(e) => setEditSequenceOrder(parseInt(e.target.value, 10) || 1)}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsRequired"
                  checked={editIsRequired}
                  onChange={(e) => setEditIsRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="editIsRequired" className="text-xs font-medium cursor-pointer">
                  Required Content Item
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Available From</label>
                <Input
                  type="datetime-local"
                  value={editAvailableFrom}
                  onChange={(e) => setEditAvailableFrom(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Due Date</label>
                <Input
                  type="datetime-local"
                  value={editDueAt}
                  onChange={(e) => setEditDueAt(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPlacement(null)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Placement Confirmation Modal */}
      {deletingPlacement && (
        <Dialog open={!!deletingPlacement} onOpenChange={(open) => !open && setDeletingPlacement(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Remove Placement from Batch</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove <strong>{deletingPlacement.title}</strong> from Week {deletingPlacement.weekNumber}?
              </DialogDescription>
            </DialogHeader>

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md space-y-1">
              <div>• Only the batch curriculum placement is deleted.</div>
              <div>• The canonical content item in the Content Library is preserved.</div>
              <div>• Any historical student completion/activity records remain intact.</div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingPlacement(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemove}
                disabled={submitting}
              >
                {submitting ? 'Removing...' : 'Remove Placement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
