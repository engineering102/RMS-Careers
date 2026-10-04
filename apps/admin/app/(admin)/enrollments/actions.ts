'use server';

import { auth } from '@/lib/auth';
import {
  updateEnrollmentStatus,
  updateBulkEnrollmentStatus,
  getEnrollmentsWithDetails,
  getEnrollmentById,
  markEnrollmentConfirmationSent,
  type FetchEnrollmentsOptions,
  type DetailedEnrollment
} from '@/lib/db/queries';
import { sendEnrollmentConfirmationEmail } from '@/lib/email';
import { revalidatePath } from 'next/cache';

export async function updateEnrollmentStatusAction(
  id: number,
  status: DetailedEnrollment['status']
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access. Admin authentication required.' };
    }

    const success = await updateEnrollmentStatus(id, status);
    if (!success) {
      return { success: false, error: 'Failed to update enrollment status in database.' };
    }

    revalidatePath('/enrollments');
    revalidatePath('/programs');
    return { success: true };
  } catch (error) {
    console.error('Error in updateEnrollmentStatusAction:', error);
    return { success: false, error: 'An unexpected error occurred while updating status.' };
  }
}

export async function bulkUpdateEnrollmentStatusAction(
  ids: number[],
  status: DetailedEnrollment['status']
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access. Admin authentication required.' };
    }

    if (!ids || ids.length === 0) {
      return { success: false, error: 'No enrollments selected.' };
    }

    const count = await updateBulkEnrollmentStatus(ids, status);
    revalidatePath('/enrollments');
    revalidatePath('/programs');
    return { success: true, count };
  } catch (error) {
    console.error('Error in bulkUpdateEnrollmentStatusAction:', error);
    return { success: false, error: 'An unexpected error occurred during bulk status update.' };
  }
}

export async function resendEnrollmentEmailAction(id: number) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access. Admin authentication required.' };
    }

    const item = await getEnrollmentById(id);

    if (!item) {
      return { success: false, error: 'Enrollment record not found.' };
    }

    const emailResult = await sendEnrollmentConfirmationEmail({
      studentName: item.student.fullName,
      studentEmail: item.student.email,
      programName: item.program.name,
      programCode: item.program.code,
      status: item.status
    });

    if (emailResult.success) {
      await markEnrollmentConfirmationSent(item.id);
      revalidatePath('/enrollments');
      return { success: true, messageId: emailResult.messageId };
    } else {
      return {
        success: false,
        error: emailResult.error || 'Failed to deliver confirmation email.'
      };
    }
  } catch (error) {
    console.error('Error in resendEnrollmentEmailAction:', error);
    return { success: false, error: 'An error occurred while resending email.' };
  }
}

export async function bulkResendEnrollmentEmailsAction(ids: number[]) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access. Admin authentication required.' };
    }

    if (!ids || ids.length === 0) {
      return { success: false, error: 'No enrollments selected.' };
    }

    const allEnrollments = await getEnrollmentsWithDetails();
    const selectedList = allEnrollments.filter((e) => ids.includes(e.id));

    let sentCount = 0;
    let failedCount = 0;

    for (const item of selectedList) {
      try {
        const emailResult = await sendEnrollmentConfirmationEmail({
          studentName: item.student.fullName,
          studentEmail: item.student.email,
          programName: item.program.name,
          programCode: item.program.code,
          status: item.status
        });

        if (emailResult.success) {
          sentCount++;
          await markEnrollmentConfirmationSent(item.id);
        } else {
          failedCount++;
        }
      } catch (err) {
        console.error(`Bulk resend error for ${item.student.email}:`, err);
        failedCount++;
      }
    }

    revalidatePath('/enrollments');

    return {
      success: true,
      total: ids.length,
      sentCount,
      failedCount
    };
  } catch (error) {
    console.error('Error in bulkResendEnrollmentEmailsAction:', error);
    return { success: false, error: 'An unexpected error occurred during bulk email resend.' };
  }
}

export async function exportEnrollmentsCsvAction(
  options: FetchEnrollmentsOptions,
  selectedIds?: number[]
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access.' };
    }

    let items: DetailedEnrollment[] = [];
    if (selectedIds && selectedIds.length > 0) {
      const all = await getEnrollmentsWithDetails();
      items = all.filter((e) => selectedIds.includes(e.id));
    } else {
      items = await getEnrollmentsWithDetails(options);
    }

    if (items.length === 0) {
      return { success: false, error: 'No enrollment records match the export criteria.' };
    }

    const headers = [
      'Student Name',
      'Email',
      'Phone',
      'College Roll Number',
      'Branch',
      'Academic Year',
      'Program Name',
      'Program Code',
      'Enrollment Status',
      'Enrollment Date',
      'Email Status',
      'Confirmation Sent Date'
    ];

    const formatYearStr = (yr: number | null) => {
      if (!yr) return 'N/A';
      const suffixes: Record<number, string> = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
      return suffixes[yr] || `${yr}th Year`;
    };

    const csvRows = [
      headers.join(','),
      ...items.map((item) => {
        const fields = [
          `"${(item.student.fullName || '').replace(/"/g, '""')}"`,
          `"${(item.student.email || '').replace(/"/g, '""')}"`,
          `"${(item.student.phone || '').replace(/"/g, '""')}"`,
          `"${(item.student.collegeRollNumber || '').replace(/"/g, '""')}"`,
          `"${(item.student.branch || '').replace(/"/g, '""')}"`,
          `"${formatYearStr(item.student.year)}"`,
          `"${(item.program.name || '').replace(/"/g, '""')}"`,
          `"${(item.program.code || '').replace(/"/g, '""')}"`,
          `"${item.status}"`,
          `"${new Date(item.createdAt).toISOString()}"`,
          `"${item.confirmationSentAt ? 'Sent' : 'Not Sent'}"`,
          `"${item.confirmationSentAt ? new Date(item.confirmationSentAt).toISOString() : ''}"`
        ];
        return fields.join(',');
      })
    ];

    const csvData = csvRows.join('\n');
    const filename = `enrollments_export_${new Date().toISOString().split('T')[0]}.csv`;

    return { success: true, csvData, filename };
  } catch (error) {
    console.error('Error in exportEnrollmentsCsvAction:', error);
    return { success: false, error: 'Failed to generate enrollment CSV export.' };
  }
}
