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
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Eye, GraduationCap, User, Calendar, Hash, Building2, Phone, Mail, CheckCircle2, Clock } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import type { DetailedEnrollment } from '@/lib/db/queries';

interface EnrollmentsTableProps {
  enrollments: DetailedEnrollment[];
}

export function EnrollmentsTable({ enrollments }: EnrollmentsTableProps) {
  const [selectedEnrollment, setSelectedEnrollment] = React.useState<DetailedEnrollment | null>(null);

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
        description="Student registrations for active programs will automatically appear here."
      />
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Student Registrations</CardTitle>
          <CardDescription>
            Showing {enrollments.length} total student enrollment record{enrollments.length === 1 ? '' : 's'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email Sent</TableHead>
                <TableHead className="hidden md:table-cell">Registered On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground">
                    {item.student.fullName}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono">
                    {item.student.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-xs text-foreground">{item.program.name}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">{item.program.code}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>{getEmailStatusBadge(item.confirmationSentAt)}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 text-xs"
                      onClick={() => setSelectedEnrollment(item)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Details</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
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

              {/* Enrollment Registration Info */}
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
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
