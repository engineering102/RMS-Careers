'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import type { QuizQuestionWithDetails } from '@/lib/db/queries';
import { parseQuizImport, QUIZ_IMPORT_EXAMPLE } from '@/lib/content/quiz-import';
import { importQuestionsAction } from './actions';

/**
 * Paste many questions at once instead of filling the question form for each. The text is parsed in
 * the browser as it is typed, so the author sees how many questions will be added and which blocks
 * need fixing before anything is saved.
 */
export function ImportQuestionsDialog({
  contentItemId,
  quizId,
  onImported
}: {
  contentItemId: string;
  quizId: string;
  onImported: (questions: QuizQuestionWithDetails[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState('');
  const [pending, setPending] = React.useState(false);

  const parsed = React.useMemo(() => parseQuizImport(text), [text]);
  const multiCount = parsed.questions.filter((q) => q.questionType === 'multiple_choice').length;

  const handleImport = async () => {
    if (parsed.questions.length === 0) return;
    setPending(true);
    try {
      const res = await importQuestionsAction(contentItemId, quizId, parsed.questions);
      if (res.success) {
        toast.success(`Added ${res.questions.length} ${res.questions.length === 1 ? 'question' : 'questions'}.`);
        onImported(res.questions);
        setText('');
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error('An unexpected error occurred while importing questions.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => setOpen(true)}>
        <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
        Import questions
      </Button>

      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Questions</DialogTitle>
            <DialogDescription>
              Paste questions separated by a blank line. Write options as <code>A)</code>, <code>B)</code>… and put{' '}
              <code>*</code> before each correct one, or add an <code>Answer: B</code> line. <code>Explanation:</code> and{' '}
              <code>Points:</code> lines are optional. Questions are added to the end of the bank.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="import-questions-text" className="text-sm font-medium">
                Questions
              </label>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setText(QUIZ_IMPORT_EXAMPLE)}
                disabled={pending}
              >
                Insert an example
              </Button>
            </div>
            <Textarea
              id="import-questions-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder={QUIZ_IMPORT_EXAMPLE}
              className="font-mono text-xs"
              spellCheck={false}
            />

            {text.trim() ? (
              <div className="grid gap-2 text-sm" aria-live="polite">
                <p className="flex items-center gap-2">
                  <CheckCircle2
                    className={parsed.questions.length > 0 ? 'h-4 w-4 text-success' : 'h-4 w-4 text-muted-foreground'}
                    aria-hidden="true"
                  />
                  {parsed.questions.length} {parsed.questions.length === 1 ? 'question' : 'questions'} ready
                  {multiCount > 0 ? ` (${multiCount} multiple-choice)` : ''},{' '}
                  {parsed.questions.reduce((sum, q) => sum + q.points, 0)} points in total.
                </p>
                {parsed.issues.length > 0 ? (
                  <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
                    <p className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
                      {parsed.issues.length} {parsed.issues.length === 1 ? 'block needs' : 'blocks need'} fixing and will be
                      skipped
                    </p>
                    <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto text-xs">
                      {parsed.issues.map((issue) => (
                        <li key={`${issue.block}-${issue.message}`}>
                          <span className="font-medium">Block {issue.block}</span>{' '}
                          <span className="text-muted-foreground">“{issue.excerpt}”</span>: {issue.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleImport} disabled={pending || parsed.questions.length === 0}>
              {pending
                ? 'Importing…'
                : parsed.questions.length > 0
                  ? `Add ${parsed.questions.length} ${parsed.questions.length === 1 ? 'question' : 'questions'}`
                  : 'Add questions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
