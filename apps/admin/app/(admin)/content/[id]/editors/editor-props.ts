import type { ContentItemWithDetails, ProjectAssignmentConfig, QuizWithDetails } from '@/lib/db/queries';
import type { BuilderForm } from '../builder-form';

/** What every type-specific editor receives from the builder shell. */
export interface EditorProps {
  item: ContentItemWithDetails;
  form: BuilderForm;
  set: <K extends keyof BuilderForm>(key: K, value: BuilderForm[K]) => void;
  errorFor: (path: string) => string | undefined;
  projectConfig: ProjectAssignmentConfig | null;
  quiz: QuizWithDetails | null;
}
