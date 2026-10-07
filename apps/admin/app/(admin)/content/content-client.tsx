'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  PlusCircle,
  Search,
  FilterX,
  Globe,
  BookOpen,
  Edit,
  Archive,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Sparkles,
  FileQuestion
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
import { toast } from 'sonner';
import {
  createContentAction,
  updateContentAction,
  updateContentLifecycleAction
} from './actions';
import type { ContentItemWithDetails } from '@/lib/db/queries';
import type { Program, ContentTypeEnum } from '@rms/db';

interface ContentClientProps {
  initialContentItems: ContentItemWithDetails[];
  programs: Program[];
  selectedProgramId?: string;
  selectedType?: string;
  selectedStatus?: string;
  searchQuery?: string;
}

const CONTENT_TYPE_LABELS: Record<ContentTypeEnum, string> = {
  lecture: 'Lecture',
  notes: 'Notes / Reading',
  dsa_sheet: 'DSA Sheet',
  quiz: 'Assessment Quiz',
  project: 'Project Milestone',
  resource: 'External Resource'
};

export function ContentClient({
  initialContentItems,
  programs,
  selectedProgramId = 'all',
  selectedType = 'all',
  selectedStatus = 'all',
  searchQuery = ''
}: ContentClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Edit Modal State
  const [editingItem, setEditingItem] = React.useState<ContentItemWithDetails | null>(null);

  // Filter States
  const [filterProgram, setFilterProgram] = React.useState(selectedProgramId);
  const [filterType, setFilterType] = React.useState(selectedType);
  const [filterStatus, setFilterStatus] = React.useState(selectedStatus);
  const [search, setSearch] = React.useState(searchQuery);

  // Create Form State
  const [createTitle, setCreateTitle] = React.useState('');
  const [createSlug, setCreateSlug] = React.useState('');
  const [createType, setCreateType] = React.useState<ContentTypeEnum>('lecture');
  const [createProgramId, setCreateProgramId] = React.useState<string>('global');
  const [createDescription, setCreateDescription] = React.useState('');
  const [createTopic, setCreateTopic] = React.useState('');
  const [createResourceLink, setCreateResourceLink] = React.useState('');
  const [createVideoUrl, setCreateVideoUrl] = React.useState('');
  const [createDuration, setCreateDuration] = React.useState('');
  const [createIsPublished, setCreateIsPublished] = React.useState(false);

  // Edit Form State
  const [editTitle, setEditTitle] = React.useState('');
  const [editSlug, setEditSlug] = React.useState('');
  const [editType, setEditType] = React.useState<ContentTypeEnum>('lecture');
  const [editProgramId, setEditProgramId] = React.useState<string>('global');
  const [editDescription, setEditDescription] = React.useState('');
  const [editTopic, setEditTopic] = React.useState('');
  const [editResourceLink, setEditResourceLink] = React.useState('');
  const [editVideoUrl, setEditVideoUrl] = React.useState('');
  const [editDuration, setEditDuration] = React.useState('');

  const applyFilters = React.useCallback(
    (newProgram: string, newType: string, newStatus: string, newSearch: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newProgram && newProgram !== 'all') {
        params.set('program', newProgram);
      } else {
        params.delete('program');
      }

      if (newType && newType !== 'all') {
        params.set('type', newType);
      } else {
        params.delete('type');
      }

      if (newStatus && newStatus !== 'all') {
        params.set('status', newStatus);
      } else {
        params.delete('status');
      }

      if (newSearch && newSearch.trim()) {
        params.set('q', newSearch.trim());
      } else {
        params.delete('q');
      }

      router.push(`/content?${params.toString()}`);
    },
    [router, searchParams]
  );

  const resetFilters = () => {
    setFilterProgram('all');
    setFilterType('all');
    setFilterStatus('all');
    setSearch('');
    router.push('/content');
  };

  const hasActiveFilters =
    filterProgram !== 'all' ||
    filterType !== 'all' ||
    filterStatus !== 'all' ||
    search.trim() !== '';

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      toast.error('Title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createContentAction({
        title: createTitle.trim(),
        slug: createSlug.trim() || undefined,
        contentType: createType,
        description: createDescription.trim() || undefined,
        programId: createProgramId === 'global' ? null : parseInt(createProgramId, 10),
        isPublished: createIsPublished,
        topic: createTopic.trim() || undefined,
        resourceLink: createResourceLink.trim() || undefined,
        videoUrl: createVideoUrl.trim() || undefined,
        durationMinutes: createDuration ? parseInt(createDuration, 10) : undefined
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to create content item.');
        return;
      }

      toast.success('Canonical content item created successfully.');
      setIsCreateOpen(false);
      // Reset form
      setCreateTitle('');
      setCreateSlug('');
      setCreateType('lecture');
      setCreateProgramId('global');
      setCreateDescription('');
      setCreateTopic('');
      setCreateResourceLink('');
      setCreateVideoUrl('');
      setCreateDuration('');
      setCreateIsPublished(false);
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (item: ContentItemWithDetails) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditSlug(item.slug);
    setEditType(item.contentType);
    setEditProgramId(item.programId ? String(item.programId) : 'global');
    setEditDescription(item.description || '');
    setEditTopic((item.metadata?.topic as string) || '');
    setEditResourceLink((item.metadata?.resourceLink as string) || '');
    setEditVideoUrl((item.metadata?.videoUrl as string) || '');
    setEditDuration(item.metadata?.durationMinutes ? String(item.metadata.durationMinutes) : '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editTitle.trim()) {
      toast.error('Title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await updateContentAction(editingItem.id, {
        title: editTitle.trim(),
        slug: editSlug.trim() || undefined,
        contentType: editType,
        description: editDescription.trim() || undefined,
        programId: editProgramId === 'global' ? null : parseInt(editProgramId, 10),
        topic: editTopic.trim() || undefined,
        resourceLink: editResourceLink.trim() || undefined,
        videoUrl: editVideoUrl.trim() || undefined,
        durationMinutes: editDuration ? parseInt(editDuration, 10) : undefined
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to update content item.');
        return;
      }

      toast.success('Content item updated in-place.');
      setEditingItem(null);
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLifecycleChange = async (
    item: ContentItemWithDetails,
    action: 'publish' | 'unpublish' | 'archive' | 'unarchive'
  ) => {
    try {
      const res = await updateContentLifecycleAction(item.id, action);
      if (!res.success) {
        toast.error(res.error || `Failed to ${action} content.`);
        return;
      }
      toast.success(`Content item ${action}ed successfully.`);
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Content Library</h1>
            <Badge variant="outline" className="h-6">
              {initialContentItems.length} Canonical Item{initialContentItems.length === 1 ? '' : 's'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Canonical learning library. Content is defined once and placed across batches via curriculum.
          </p>
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <PlusCircle className="h-4 w-4" />
              New Content Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Canonical Content Item</DialogTitle>
              <DialogDescription>
                Define once in the central library. Batches can reuse this content without duplication.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  required
                  placeholder="e.g. Dynamic Programming: Kadane's Algorithm"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content Type *</label>
                  <Select
                    value={createType}
                    onValueChange={(val) => setCreateType(val as ContentTypeEnum)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTENT_TYPE_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Scope / Program *</label>
                  <Select
                    value={createProgramId}
                    onValueChange={(val) => setCreateProgramId(val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global / Reusable Across All Programs</SelectItem>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          Program: {p.name} ({p.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Slug (optional)</label>
                <Input
                  placeholder="auto-generated from title if blank"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full min-h-[80px] p-2 text-sm rounded-md border border-input bg-background"
                  placeholder="Summary of learning outcomes and prerequisites..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Topic / Domain</label>
                  <Input
                    placeholder="e.g. Data Structures & Algorithms"
                    value={createTopic}
                    onChange={(e) => setCreateTopic(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Estimated Duration (mins)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 45"
                    value={createDuration}
                    onChange={(e) => setCreateDuration(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Video / Stream URL</label>
                  <Input
                    placeholder="https://..."
                    value={createVideoUrl}
                    onChange={(e) => setCreateVideoUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Resource / External Link</label>
                  <Input
                    placeholder="https://github.com/... or slides link"
                    value={createResourceLink}
                    onChange={(e) => setCreateResourceLink(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="createIsPublished"
                  checked={createIsPublished}
                  onChange={(e) => setCreateIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="createIsPublished" className="text-sm text-foreground">
                  Publish immediately (Default is Draft)
                </label>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Content Item'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content by title, slug, or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    applyFilters(filterProgram, filterType, filterStatus, search);
                  }
                }}
                className="pl-9"
              />
            </div>

            {/* Scope / Program Filter */}
            <div className="w-full lg:w-48">
              <Select
                value={filterProgram}
                onValueChange={(val) => {
                  setFilterProgram(val);
                  applyFilters(val, filterType, filterStatus, search);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scopes</SelectItem>
                  <SelectItem value="global">Global Only</SelectItem>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="w-full lg:w-44">
              <Select
                value={filterType}
                onValueChange={(val) => {
                  setFilterType(val);
                  applyFilters(filterProgram, val, filterStatus, search);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
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

            {/* Status Filter */}
            <div className="w-full lg:w-36">
              <Select
                value={filterStatus}
                onValueChange={(val) => {
                  setFilterStatus(val);
                  applyFilters(filterProgram, filterType, val, search);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => applyFilters(filterProgram, filterType, filterStatus, search)}
                className="gap-2"
              >
                Filter
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={resetFilters} className="gap-1.5 px-3">
                  <FilterX className="h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Table / List */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2">
          <CardTitle className="text-lg">Canonical Content Items</CardTitle>
          <CardDescription>
            Master content definitions available for batch assignment.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 pt-0 sm:pt-0">
          {initialContentItems.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No content items found"
              description={
                hasActiveFilters
                  ? 'No content matches your current filter criteria. Try clearing search or filters.'
                  : 'Start building the centralized academy library by creating your first canonical content item.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Create First Content Item
                  </Button>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[240px]">Content Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Lifecycle</TableHead>
                    <TableHead>Batches</TableHead>
                    <TableHead className="hidden md:table-cell">Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialContentItems.map((item) => {
                    const isGlobal = !item.programId;
                    const status = item.lifecycleStatus;

                    return (
                      <TableRow key={item.id}>
                        {/* Title & Slug */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground leading-snug">
                              {item.title}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono mt-0.5">
                              /{item.slug}
                            </span>
                            {Boolean(item.metadata?.topic) && (
                              <span className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-amber-500" />
                                {item.metadata.topic as string}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Content Type */}
                        <TableCell>
                          <Badge variant="secondary" className="font-normal text-xs capitalize">
                            {CONTENT_TYPE_LABELS[item.contentType] || item.contentType}
                          </Badge>
                        </TableCell>

                        {/* Scope */}
                        <TableCell>
                          {isGlobal ? (
                            <Badge
                              variant="outline"
                              className="gap-1 bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 font-medium"
                            >
                              <Globe className="h-3 w-3" />
                              Global
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="gap-1 bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 font-medium"
                            >
                              <BookOpen className="h-3 w-3" />
                              {item.programCode || item.programName}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Lifecycle Status */}
                        <TableCell>
                          {status === 'published' && (
                            <Badge
                              variant="outline"
                              className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Published
                            </Badge>
                          )}
                          {status === 'draft' && (
                            <Badge
                              variant="outline"
                              className="gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                            >
                              <XCircle className="h-3 w-3 text-amber-600" />
                              Draft
                            </Badge>
                          )}
                          {status === 'archived' && (
                            <Badge
                              variant="outline"
                              className="gap-1 bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30"
                            >
                              <Archive className="h-3 w-3 text-slate-500" />
                              Archived
                            </Badge>
                          )}
                        </TableCell>

                        {/* Batches Placed */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Layers className="h-3.5 w-3.5" />
                            <span>{item.batchUsageCount}</span>
                          </div>
                        </TableCell>

                        {/* Updated */}
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {formatDate(item.updatedAt)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quiz Workbench Shortcut for Quiz items */}
                            {item.contentType === 'quiz' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                                className="h-8 w-8 p-0 text-violet-600 hover:text-violet-700 hover:bg-violet-500/10"
                                title="Manage Quiz & Question Bank"
                              >
                                <Link href={`/content/${item.id}/quiz`}>
                                  <FileQuestion className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}

                            {/* Edit Button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(item)}
                              className="h-8 w-8 p-0"
                              title="Edit in-place"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            {/* Publish / Unpublish Toggle */}
                            {status === 'published' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleLifecycleChange(item, 'unpublish')}
                                className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                                title="Unpublish (revert to Draft)"
                              >
                                Unpublish
                              </Button>
                            ) : status === 'draft' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleLifecycleChange(item, 'publish')}
                                className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                title="Publish content item"
                              >
                                Publish
                              </Button>
                            ) : null}

                            {/* Archive / Unarchive */}
                            {status !== 'archived' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleLifecycleChange(item, 'archive')}
                                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-500/10"
                                title="Archive content"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleLifecycleChange(item, 'unarchive')}
                                className="h-8 px-2 text-xs text-blue-600 hover:bg-blue-500/10"
                                title="Restore to Draft"
                              >
                                Restore
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Content Modal */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Content Item</DialogTitle>
              <DialogDescription>
                Updates canonical record in-place. Primary ID ({editingItem.id}) is preserved.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content Type *</label>
                  <Select
                    value={editType}
                    onValueChange={(val) => setEditType(val as ContentTypeEnum)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTENT_TYPE_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Scope / Program *</label>
                  <Select
                    value={editProgramId}
                    onValueChange={(val) => setEditProgramId(val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global / Reusable Across All Programs</SelectItem>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          Program: {p.name} ({p.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Slug *</label>
                <Input
                  required
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full min-h-[80px] p-2 text-sm rounded-md border border-input bg-background"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Topic / Domain</label>
                  <Input
                    placeholder="e.g. Data Structures & Algorithms"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Estimated Duration (mins)</label>
                  <Input
                    type="number"
                    min="0"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Video / Stream URL</label>
                  <Input
                    value={editVideoUrl}
                    onChange={(e) => setEditVideoUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Resource / External Link</label>
                  <Input
                    value={editResourceLink}
                    onChange={(e) => setEditResourceLink(e.target.value)}
                  />
                </div>
              </div>

              {/* Quiz Configuration Workbench Link for Quizzes */}
              {editType === 'quiz' && (
                <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <FileQuestion className="h-4 w-4 text-violet-600" />
                      Quiz & Question Bank Workbench
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Configure practice/formal mode, timing, passing grade, and question choices.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    asChild
                    className="border-violet-500/30 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10 shrink-0"
                  >
                    <Link href={`/content/${editingItem.id}/quiz`}>
                      Open Quiz Workbench
                    </Link>
                  </Button>
                </div>
              )}

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
