import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// content_items.program_id is nullable: global content reaches students through batch_curriculum.
// An INNER JOIN on it silently hides that content (this hid global quizzes from /assessments while
// the library listed them). The query unit tests mock drizzle chains and cannot see join types, so
// this guard checks the query sources directly.
describe('Student queries never inner-join programs on the nullable content_items.program_id', () => {
  const queriesDir = path.resolve(__dirname, '../db/queries');
  const files = fs.readdirSync(queriesDir).filter((f) => f.endsWith('.ts'));

  it.each(files)('%s uses leftJoin for programs on contentItems.programId', (file) => {
    const source = fs.readFileSync(path.join(queriesDir, file), 'utf8');
    const innerJoinOnNullableProgram =
      /innerJoin\(\s*programs\s*,\s*eq\(\s*programs\.id\s*,\s*contentItems\.programId\s*\)\s*\)/;
    expect(source).not.toMatch(innerJoinOnNullableProgram);
  });
});
