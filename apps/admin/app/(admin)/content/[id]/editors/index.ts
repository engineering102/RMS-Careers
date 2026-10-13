import type * as React from 'react';
import type { ContentTypeEnum } from '@rms/db';
import type { EditorProps } from './editor-props';
import { LectureEditor } from './lecture-editor';
import { ReadingEditor } from './reading-editor';
import { ProjectEditor } from './project-editor';
import { QuizEditor } from './quiz-editor';
import { DsaSheetEditor } from './dsa-sheet-editor';

/** The type-specific section of the builder. Adding a type means adding an entry here. */
export const TYPE_EDITORS: Record<ContentTypeEnum, React.ComponentType<EditorProps>> = {
  lecture: LectureEditor,
  notes: ReadingEditor,
  resource: ReadingEditor,
  project: ProjectEditor,
  quiz: QuizEditor,
  dsa_sheet: DsaSheetEditor
};

export type { EditorProps };
