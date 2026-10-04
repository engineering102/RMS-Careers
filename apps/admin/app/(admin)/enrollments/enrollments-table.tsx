'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Eye,
  GraduationCap,
  User,
  Calendar,
  Hash,
  Building2,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Send,
  MoreVertical,
  Check,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import type { DetailedEnrollment } from '@/lib/db/queries';
import {
  updateEnrollmentStatusAction,
  bulkUpdateEnrollmentStatusAction,
  resendEnrollmentEmailAction,
  bulkResendEnrollmentEmailsAction,
  exportEnrollmentsCsvAction
} from './actions';
import { toast } from 'sonner';

interface EnrollmentsTableProps {
  enrollments: DetailedEnrollment[];
  totalCount: number;
}

const PAGE_SIZE = 15;

export function EnrollmentsTable({ enrollments, totalCount }: EnrollmentsTableProps) {
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] = React.useState<DetailedEnrollment | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Action states
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {}
  });

  // Reset selected IDs when enrollments list changes
  React.useEffect(() => {
    setSelectedIds([]);
    setCurrentPage(1);
  }, [enrollments]);

  // Pagination calculation
  const totalPages = Math.ceil(enrollments.length / PAGE_SIZE) || 1;
  const paginatedEnrollments = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return enrollments.slice(start, start + PAGE_SIZE);
  }, [enrollments, currentPage]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allCurrentIds = paginatedEnrollments.map((e) => e.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...allCurrentIds])));
    } else {
      const currentIdsSet = new Set(paginatedEnrollments.map((e) => e.id));
      setSelectedIds(selectedIds.filter((id) => !currentIdsSet.has(id)));
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    }
  };

  const isAllPaginatedSelected =
    paginatedEnrollments.length > 0 &&
    paginatedEnrollments.every((e) => selectedIds.includes(e.id));
  const isSomePaginatedSelected =
    paginatedEnrollments.some((e) => selectedIds.includes(e.id)) && !isAllPaginatedSelected;

  // Single Status Update
  const handleSingleStatusChange = (id: number, status: DetailedEnrollment['status']) => {
    if (status === 'cancelled') {
      setConfirmDialog({
        isOpen: true,
        title: 'Cancel Enrollment?',
        description: 'Are you sure you want to cancel this student enrollment? This action can be modified later.',
        onConfirm: async () => {
          setIsUpdatingStatus(true);
          const res = await updateEnrollmentStatusAction(id, 'cancelled');
          setIsUpdatingStatus(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          if (res.success) {
            toast.success('Enrollment status updated to Cancelled');
            if (selectedEnrollment?.id === id) {
              setSelectedEnrollment((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
            }
          } else {
            toast.error(res.error || 'Failed to update status');
          }
        }
      });
      return;
    }

    executeSingleStatusChange(id, status);
  };

  const executeSingleStatusChange = async (id: number, status: DetailedEnrollment['status']) => {
    setIsUpdatingStatus(true);
    const res = await updateEnrollmentStatusAction(id, status);
    setIsUpdatingStatus(false);
    if (res.success) {
      toast.success(`Enrollment status updated to ${status}`);
      if (selectedEnrollment?.id === id) {
        setSelectedEnrollment((prev) => (prev ? { ...prev, status } : null));
      }
    } else {
      toast.error(res.error || 'Failed to update status');
    }
  };

  // Single Resend Email
  const handleResendSingleEmail = async (id: number) => {
    setIsSendingEmail(true);
    toast.info('Sending confirmation email...');
    const res = await resendEnrollmentEmailAction(id);
    setIsSendingEmail(false);

    if (res.success) {
      toast.success('Confirmation email sent successfully');
      if (selectedEnrollment?.id === id) {
        setSelectedEnrollment((prev) =>
          prev ? { ...prev, confirmationSentAt: new Date() } : null
        );
      }
    } else {
      toast.error(res.error || 'Email dispatch failed. Enrollment remains created.');
    }
  };

  // Bulk Operations
  const handleBulkConfirm = () => {
    setConfirmDialog({
      isOpen: true,
      title: `Confirm ${selectedIds.length} Selected Enrollment(s)?`,
      description: `This will update the status of ${selectedIds.length} student registration(s) to Confirmed.`,
      onConfirm: async () => {
        setIsUpdatingStatus(true);
        const res = await bulkUpdateEnrollmentStatusAction(selectedIds, 'confirmed');
        setIsUpdatingStatus(false);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

        if (res.success) {
          toast.success(`Successfully confirmed ${res.count} enrollment(s)`);
          setSelectedIds([]);
        } else {
          toast.error(res.error || 'Bulk update failed');
        }
      }
    });
  };

  const handleBulkResendEmail = () => {
    setConfirmDialog({
      isOpen: true,
      title: `Resend Emails for ${selectedIds.length} Enrollment(s)?`,
      description: `Attempting acknowledgement email dispatch for ${selectedIds.length} selected enrollment(s). Successful deliveries will update confirmationSentAt timestamp.`,
      onConfirm: async () => {
        setIsSendingEmail(true);
        toast.info(`Sending ${selectedIds.length} email(s)...`);
        const res = await bulkResendEnrollmentEmailsAction(selectedIds);
        setIsSendingEmail(false);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

        if (res.success) {
          if ((res.failedCount ?? 0) > 0) {
            toast.warning(
              `Bulk email complete: ${res.sentCount ?? 0} sent, ${res.failedCount ?? 0} failed or skipped.`
            );
          } else {
            toast.success(`All ${res.sentCount ?? 0} confirmation email(s) sent successfully.`);
          }
          setSelectedIds([]);
        } else {
          toast.error(res.error || 'Bulk email dispatch failed');
        }
      }
    });
  };

  const handleBulkExport = async () => {
    const res = await exportEnrollmentsCsvAction({}, selectedIds);
    if (res.success && res.csvData) {
      const blob = new Blob([res.csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', res.filename || 'selected_enrollments.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${selectedIds.length} selected record(s) to CSV`);
    } else {
      toast.error(res.error || 'Failed to export selected enrollments');
    }
  };

  const getStatusBadge = (status: DetailedEnrollment['status']) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 capitalize">
            Confirmed
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 capitalize">
            Pending
          </Badge>
        );
      case 'waitlisted':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 capitalize">
            Waitlisted
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 capitalize">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
    }
  };

  const getEmailStatusBadge = (confirmationSentAt: Date | null) => {
    if (confirmationSentAt) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-[11px]">
          <CheckCircle2 className="h-3 w-3 text-blue-600" /> Sent
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 gap-1 text-[11px]">
        <Clock className="h-3 w-3 text-slate-400" /> Not Sent
      </Badge>
    );
  };

  const formatYear = (year: number | null) => {
    if (!year) return 'N/A';
    const suffixes: Record<number, string> = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
    return suffixes[year] || `${year}th Year`;
  };

  if (enrollments.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No enrollments found"
        description="Try changing your search terms or filters above to find matching student registrations."
      />
    );
  }

  return (
    <>
      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-primary/5 p-3.5 shadow-sm border-primary/20 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="px-2.5 py-1 text-xs">
              {selectedIds.length} Selected
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Choose an action to apply to selected enrollments
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkConfirm}
              disabled={isUpdatingStatus}
              className="h-8 gap-1 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Check className="h-3.5 w-3.5" /> Confirm Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkResendEmail}
              disabled={isSendingEmail}
              className="h-8 gap-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Send className="h-3.5 w-3.5" /> Resend Emails
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkExport}
              className="h-8 gap-1 text-xs"
            >
              <Download className="h-3.5 w-3.5" /> Export Selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="h-8 text-xs text-muted-foreground"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Main Table Card (Desktop) & Card View (Mobile) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Student Registrations</CardTitle>
            <CardDescription>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, enrollments.length)} of {enrollments.length} matching record{enrollments.length === 1 ? '' : 's'}.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40px] pl-4">
                    <Checkbox
                      checked={isAllPaginatedSelected}
                      indeterminate={isSomePaginatedSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email & Roll</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Branch & Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email Status</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEnrollments.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <TableRow
                      key={item.id}
                      className={`hover:bg-muted/50 ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {item.student.fullName}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="font-mono text-muted-foreground">{item.student.email}</span>
                          <span className="text-[11px] text-muted-foreground/80">
                            Roll: {item.student.collegeRollNumber || 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-xs text-foreground">{item.program.name}</span>
                          <span className="text-[11px] font-mono text-muted-foreground">{item.program.code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium">{item.student.branch || 'N/A'}</span>
                          <span className="text-muted-foreground">{formatYear(item.student.year)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>{getEmailStatusBadge(item.confirmationSentAt)}</TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setSelectedEnrollment(item)}
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
                                Actions
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => setSelectedEnrollment(item)}
                                className="text-xs gap-2"
                              >
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleResendSingleEmail(item.id)}
                                disabled={isSendingEmail}
                                className="text-xs gap-2 text-blue-600"
                              >
                                <Send className="h-3.5 w-3.5" /> Resend Email
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
                                Set Status
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleSingleStatusChange(item.id, 'confirmed')}
                                className="text-xs gap-2 text-emerald-600"
                              >
                                <Check className="h-3.5 w-3.5" /> Mark Confirmed
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSingleStatusChange(item.id, 'pending')}
                                className="text-xs gap-2 text-amber-600"
                              >
                                <Clock className="h-3.5 w-3.5" /> Mark Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSingleStatusChange(item.id, 'waitlisted')}
                                className="text-xs gap-2 text-blue-600"
                              >
                                <User className="h-3.5 w-3.5" /> Mark Waitlisted
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSingleStatusChange(item.id, 'cancelled')}
                                className="text-xs gap-2 text-destructive"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Cancel Enrollment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Responsive Cards View */}
          <div className="block md:hidden divide-y">
            {paginatedEnrollments.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div key={item.id} className={`p-4 space-y-3 ${isSelected ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                      />
                      <div>
                        <h4 className="font-semibold text-sm">{item.student.fullName}</h4>
                        <p className="font-mono text-xs text-muted-foreground">{item.student.email}</p>
                      </div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-md">
                    <div>
                      <span className="text-muted-foreground block">Program:</span>
                      <span className="font-medium text-foreground">{item.program.code}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Roll Number:</span>
                      <span className="font-mono text-foreground">{item.student.collegeRollNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Branch / Year:</span>
                      <span className="font-medium text-foreground">
                        {item.student.branch || 'N/A'} ({formatYear(item.student.year)})
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Email Status:</span>
                      {getEmailStatusBadge(item.confirmationSentAt)}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => setSelectedEnrollment(item)}
                    >
                      <Eye className="h-3.5 w-3.5" /> Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1 text-blue-600 border-blue-200"
                      onClick={() => handleResendSingleEmail(item.id)}
                      disabled={isSendingEmail}
                    >
                      <Send className="h-3.5 w-3.5" /> Resend Email
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <CardFooter className="flex items-center justify-between border-t p-3 text-xs text-muted-foreground">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Enrollment Details Dialog */}
      <Dialog
        open={selectedEnrollment !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEnrollment(null);
        }}
      >
        {selectedEnrollment && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Enrollment Details
                </DialogTitle>
                {getStatusBadge(selectedEnrollment.status)}
              </div>
              <DialogDescription>
                Detailed registration information for {selectedEnrollment.student.fullName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm py-2">
              {/* Student Section */}
              <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Student Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-muted-foreground block">Full Name:</span>
                    <span className="font-semibold text-foreground">{selectedEnrollment.student.fullName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Email:</span>
                    <span className="font-mono text-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3 text-muted-foreground" /> {selectedEnrollment.student.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Phone:</span>
                    <span className="font-mono text-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" /> {selectedEnrollment.student.phone || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Roll Number:</span>
                    <span className="font-mono text-foreground flex items-center gap-1">
                      <Hash className="h-3 w-3 text-muted-foreground" /> {selectedEnrollment.student.collegeRollNumber || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Branch:</span>
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" /> {selectedEnrollment.student.branch || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Academic Year:</span>
                    <span className="font-medium text-foreground">{formatYear(selectedEnrollment.student.year)}</span>
                  </div>
                </div>
              </div>

              {/* Program Section */}
              <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" /> Program Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-muted-foreground block">Program Name:</span>
                    <span className="font-semibold text-foreground">{selectedEnrollment.program.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Program Code:</span>
                    <span className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
                      {selectedEnrollment.program.code}
                    </span>
                  </div>
                </div>
              </div>

              {/* Enrollment Registration Info & Status Actions */}
              <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Registration Log & Email Status
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-muted-foreground block">Registered On:</span>
                    <span className="font-medium text-foreground">
                      {new Date(selectedEnrollment.createdAt).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Confirmation Email Sent:</span>
                    <span className="font-medium text-foreground">
                      {selectedEnrollment.confirmationSentAt
                        ? new Date(selectedEnrollment.confirmationSentAt).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })
                        : 'Not sent yet'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => handleResendSingleEmail(selectedEnrollment.id)}
                disabled={isSendingEmail}
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSendingEmail ? 'Sending...' : 'Resend Email'}</span>
              </Button>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      Update Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleSingleStatusChange(selectedEnrollment.id, 'confirmed')}
                    >
                      Confirmed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSingleStatusChange(selectedEnrollment.id, 'pending')}
                    >
                      Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSingleStatusChange(selectedEnrollment.id, 'waitlisted')}
                    >
                      Waitlisted
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSingleStatusChange(selectedEnrollment.id, 'cancelled')}
                      className="text-destructive"
                    >
                      Cancelled
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedEnrollment(null)}
                  className="h-8 text-xs"
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> {confirmDialog.title}
            </DialogTitle>
            <DialogDescription className="pt-2">{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={confirmDialog.onConfirm}
              disabled={isUpdatingStatus || isSendingEmail}
            >
              Confirm Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
