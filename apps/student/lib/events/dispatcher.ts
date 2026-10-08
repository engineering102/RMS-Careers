import 'server-only';

import { db, notifications, students, users } from '@rms/db';
import { eq } from 'drizzle-orm';
import type { DomainEvent } from '@/lib/types/notifications';
import { renderActivationLinkEmail, renderPasswordResetEmail } from '@/lib/email/account-emails';

export interface EmailDispatchResult {
  sent: boolean;
  reason?: 'provider_not_configured' | 'recipient_missing' | 'failed' | 'not_applicable';
  messageId?: string;
  error?: string;
}

export interface DomainEventConsumer {
  name: string;
  handle: (event: DomainEvent) => Promise<unknown>;
}

/**
 * Resolves userId and email for a given studentId if not already present on the event payload.
 */
async function resolveStudentIdentity(studentId: number): Promise<{ userId: string; email: string } | null> {
  const [row] = await db
    .select({
      userId: students.userId,
      email: users.email
    })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .where(eq(students.id, studentId))
    .limit(1);

  if (!row || !row.userId) {
    return null;
  }

  return { userId: row.userId, email: row.email };
}

/**
 * Consumer 1: In-App Notification Consumer.
 * Persists domain notifications into the PostgreSQL `notifications` table.
 */
export const inAppNotificationConsumer: DomainEventConsumer = {
  name: 'InAppNotificationConsumer',
  handle: async (event: DomainEvent) => {
    // Account-link events are email-only; they carry raw tokens and must never be persisted.
    if (event.type === 'ACTIVATION_LINK_REQUESTED' || event.type === 'PASSWORD_RESET_REQUESTED') {
      return null;
    }

    let targetUserId = 'userId' in event && event.userId ? event.userId : null;

    if (!targetUserId && 'studentId' in event && event.studentId) {
      const identity = await resolveStudentIdentity(event.studentId);
      targetUserId = identity?.userId || null;
    }

    if (!targetUserId) {
      console.warn(`[InAppNotificationConsumer] Unable to resolve userId for event type ${event.type}`);
      return null;
    }

    let title = '';
    let body = '';
    let actionUrl: string | null = null;

    switch (event.type) {
      case 'STUDENT_ACTIVATED':
        title = 'Welcome to RMS Careers!';
        body = 'Your student account has been successfully activated. Explore your dashboard and learning materials.';
        actionUrl = '/overview';
        break;

      case 'PROJECT_REVIEWED':
        title = `Project Review: ${event.assignmentTitle}`;
        body = `Your project submission has been reviewed with status "${event.status}" (Score: ${event.score}).${
          event.tutorFeedback ? ` Feedback: ${event.tutorFeedback}` : ''
        }`;
        actionUrl = event.actionUrl || '/assessments';
        break;

      case 'ASSESSMENT_DUE_SOON':
        title = `Assessment Due Soon: ${event.quizTitle}`;
        body = `Your formal assessment is due by ${new Date(event.dueAt).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'short'
        })} IST. Please ensure you complete it before the deadline.`;
        actionUrl = event.actionUrl || '/assessments';
        break;

      case 'MILESTONE_UNLOCKED':
        title = `New Milestone Unlocked: ${event.milestoneTitle}`;
        body = event.batchName
          ? `A new learning milestone has been unlocked in batch "${event.batchName}".`
          : `A new milestone has been unlocked in your learning pathway.`;
        actionUrl = event.actionUrl || '/batches';
        break;

      case 'STREAK_MILESTONE':
        title = `${event.streakCount}-Day Streak Achieved! 🔥`;
        body = `Fantastic dedication! You have maintained an active daily learning streak of ${event.streakCount} days in Asia/Kolkata timezone.`;
        actionUrl = event.actionUrl || '/overview';
        break;
    }

    const [inserted] = await db
      .insert(notifications)
      .values({
        userId: targetUserId,
        type: event.type,
        title,
        body,
        actionUrl,
        isRead: false
      })
      .returning();

    return inserted;
  }
};

/**
 * Consumer 2: Email Notification Consumer.
 * Dispatches critical transactional emails via Resend when configured.
 * Decoupled: Gracefully logs and succeeds if credentials are not present.
 */
export const emailNotificationConsumer: DomainEventConsumer = {
  name: 'EmailNotificationConsumer',
  handle: async (event: DomainEvent): Promise<EmailDispatchResult> => {
    // Only critical events trigger email dispatches
    const isCritical =
      event.type === 'ACTIVATION_LINK_REQUESTED' ||
      event.type === 'PASSWORD_RESET_REQUESTED' ||
      event.type === 'STUDENT_ACTIVATED' ||
      event.type === 'PROJECT_REVIEWED' ||
      event.type === 'ASSESSMENT_DUE_SOON';

    if (!isCritical) {
      return { sent: false, reason: 'not_applicable' };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      // Graceful provider skip, but visible in logs (never includes tokens or links).
      console.warn(`[EmailNotificationConsumer] RESEND_API_KEY not configured; skipped ${event.type} email.`);
      return { sent: false, reason: 'provider_not_configured' };
    }

    let recipientEmail = 'email' in event && event.email ? event.email : null;
    if (!recipientEmail && 'studentId' in event && event.studentId) {
      const identity = await resolveStudentIdentity(event.studentId);
      recipientEmail = identity?.email || null;
    }

    if (!recipientEmail) {
      return { sent: false, reason: 'recipient_missing' };
    }

    const fromAddress = process.env.EMAIL_FROM || 'RMS Careers <notifications@rms-careers.com>';

    let subject = '';
    let textContent = '';
    let htmlContent: string | undefined;

    if (event.type === 'ACTIVATION_LINK_REQUESTED' || event.type === 'PASSWORD_RESET_REQUESTED') {
      const input = { name: event.name, token: event.rawToken, expiresAt: event.expiresAt };
      const rendered =
        event.type === 'ACTIVATION_LINK_REQUESTED'
          ? renderActivationLinkEmail(input)
          : renderPasswordResetEmail(input);
      subject = rendered.subject;
      textContent = rendered.text;
      htmlContent = rendered.html;
    } else if (event.type === 'STUDENT_ACTIVATED') {
      subject = 'Welcome to RMS Careers — Account Activated';
      textContent = 'Your student account is now fully active. Log in to start learning at https://student.rms-careers.com';
    } else if (event.type === 'PROJECT_REVIEWED') {
      subject = `Project Feedback: ${event.assignmentTitle}`;
      textContent = `Your submission has been reviewed. Status: ${event.status}, Score: ${event.score}.\n\nFeedback: ${
        event.tutorFeedback || 'None'
      }\n\nView details: https://student.rms-careers.com/assessments`;
    } else if (event.type === 'ASSESSMENT_DUE_SOON') {
      subject = `Reminder: ${event.quizTitle} Due Soon`;
      textContent = `Your assessment is due on ${new Date(event.dueAt).toISOString()}.\n\nComplete now: https://student.rms-careers.com/assessments`;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipientEmail],
          subject,
          text: textContent,
          ...(htmlContent ? { html: htmlContent } : {})
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[EmailNotificationConsumer] Resend API error for ${event.type} (HTTP ${response.status}):`,
          errorText
        );
        return { sent: false, reason: 'failed', error: errorText };
      }

      const resData = (await response.json()) as { id?: string };
      return { sent: true, messageId: resData.id };
    } catch (err) {
      console.error('[EmailNotificationConsumer] Dispatch error:', err);
      return { sent: false, reason: 'failed', error: err instanceof Error ? err.message : String(err) };
    }
  }
};

/**
 * Event Dispatcher Bus: Fan-out engine coordinating domain event handlers.
 */
class EventDispatcher {
  private consumers: DomainEventConsumer[] = [
    inAppNotificationConsumer,
    emailNotificationConsumer
  ];

  /**
   * Register a custom domain event consumer (used for extensibility or test mocking)
   */
  public register(consumer: DomainEventConsumer): void {
    this.consumers.push(consumer);
  }

  /**
   * Reset consumers to standard defaults
   */
  public resetConsumers(): void {
    this.consumers = [inAppNotificationConsumer, emailNotificationConsumer];
  }

  /**
   * Dispatches a domain event asynchronously to all registered consumers.
   * Guarantees that failure in one consumer does not crash other consumers or caller workflows.
   */
  public async dispatch(event: DomainEvent): Promise<{ consumer: string; success: boolean; result?: unknown }[]> {
    const results = await Promise.allSettled(
      this.consumers.map(async (c) => {
        const res = await c.handle(event);
        return { consumer: c.name, success: true, result: res };
      })
    );

    return results.map((r, index) => {
      if (r.status === 'fulfilled') {
        return r.value;
      }
      console.error(`[EventDispatcher] Error in consumer ${this.consumers[index].name}:`, r.reason);
      return {
        consumer: this.consumers[index].name,
        success: false,
        result: r.reason instanceof Error ? r.reason.message : String(r.reason)
      };
    });
  }
}

export const eventDispatcher = new EventDispatcher();

/**
 * Convenience helper to dispatch domain events from anywhere in application code.
 */
export async function dispatchDomainEvent(event: DomainEvent) {
  return eventDispatcher.dispatch(event);
}
