import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMetadataFor } from '@/lib/content/create-metadata';
import { readAuthoringFields } from '@/lib/content/student-metadata';
import { readExternalTestFields } from '@/lib/content/external-test';

vi.mock('server-only', () => ({}));

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({ auth: () => mockAuth() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mockCreateContentItem = vi.fn();
const mockGetOrCreateQuiz = vi.fn();
vi.mock('@/lib/db/queries', () => ({
  createContentItem: (...args: unknown[]) => mockCreateContentItem(...args),
  getOrCreateQuizForContentItem: (...args: unknown[]) => mockGetOrCreateQuiz(...args),
  getProgramById: vi.fn()
}));

import { createContentAction } from '../../app/(admin)/content/actions';

describe('createMetadataFor: what the create dialog stores, per type', () => {
  it('a lecture keeps its video and duration, read back the way the builder reads them', () => {
    const metadata = createMetadataFor({
      contentType: 'lecture',
      topic: 'Sliding Window',
      subject: 'dsa',
      inLibrary: true,
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      durationMinutes: 42,
      // Another type's field: never stored on a lecture.
      resourceLink: 'https://example.com/doc'
    });
    const fields = readAuthoringFields(metadata);
    expect(fields).toMatchObject({
      topic: 'Sliding Window',
      subject: 'dsa',
      inLibrary: true,
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      provider: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      durationMinutes: 42,
      resourceLink: ''
    });
  });

  it('a reading keeps its notes and document link', () => {
    const fields = readAuthoringFields(
      createMetadataFor({
        contentType: 'notes',
        notes: 'Key ideas\n  - indented',
        resourceLink: 'https://docs.google.com/x',
        durationMinutes: 10,
        videoUrl: 'https://youtu.be/dQw4w9WgXcQ'
      })
    );
    expect(fields.notes).toBe('Key ideas\n  - indented');
    expect(fields.resourceLink).toBe('https://docs.google.com/x');
    expect(fields.durationMinutes).toBe(10);
    expect(fields.videoUrl).toBe('');
  });

  it('a DSA sheet points metadata.slug at the requested catalogue sheet', () => {
    expect(createMetadataFor({ contentType: 'dsa_sheet', slug: 'blind-75' })).toMatchObject({ slug: 'blind-75' });
  });

  it('an external test stores its platform, link and code under the external-test keys', () => {
    const metadata = createMetadataFor({
      contentType: 'external_test',
      externalProvider: 'QwikTest',
      externalUrl: 'https://rms-careers.qwiktest.in/assessment-1',
      assessmentCode: 'QT-1',
      durationMinutes: 60,
      inLibrary: true
    });
    expect(readExternalTestFields(metadata)).toEqual({
      externalProvider: 'QwikTest',
      externalUrl: 'https://rms-careers.qwiktest.in/assessment-1',
      assessmentCode: 'QT-1'
    });
    expect(metadata.durationMinutes).toBe(60);
    expect(metadata).not.toHaveProperty('inLibrary');
  });

  it('a blank optional field is simply not stored', () => {
    expect(createMetadataFor({ contentType: 'project', topic: '  ', subject: '' })).toEqual({});
  });
});

describe('createContentAction: type-specific fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'admin', role: 'admin' } });
    mockCreateContentItem.mockImplementation(async (input) => ({ id: 'new-1', ...input }));
  });

  it('saves an external test with everything the dialog collected', async () => {
    const res = await createContentAction({
      title: 'Aptitude Test 1',
      contentType: 'external_test',
      description: 'Sign in with your college email.',
      externalProvider: 'QwikTest',
      externalUrl: 'https://rms-careers.qwiktest.in/assessment-1',
      assessmentCode: 'QT-CSE26-aptitude',
      durationMinutes: 60
    });
    expect(res.success).toBe(true);
    expect(mockCreateContentItem).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'external_test',
        description: 'Sign in with your college email.',
        metadata: expect.objectContaining({
          externalProvider: 'QwikTest',
          externalUrl: 'https://rms-careers.qwiktest.in/assessment-1',
          assessmentCode: 'QT-CSE26-aptitude',
          durationMinutes: 60
        })
      })
    );
  });

  it('rejects an external test link that is not https', async () => {
    const res = await createContentAction({
      title: 'Aptitude Test 1',
      contentType: 'external_test',
      externalUrl: 'http://example.com/test'
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.fieldErrors?.externalUrl?.[0]).toMatch(/https/);
    expect(mockCreateContentItem).not.toHaveBeenCalled();
  });

  it('requires a catalogue slug for a DSA sheet', async () => {
    const res = await createContentAction({ title: 'Blind 75', contentType: 'dsa_sheet' });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.fieldErrors?.slug?.[0]).toMatch(/catalogue sheet/);
    expect(mockCreateContentItem).not.toHaveBeenCalled();
  });

  it('stores a reading’s notes and Library choice', async () => {
    await createContentAction({
      title: 'Big-O Cheat Sheet',
      contentType: 'notes',
      notesMarkdown: 'O(1) < O(log n)',
      subject: 'dsa',
      inLibrary: true
    });
    expect(mockCreateContentItem).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ notes: 'O(1) < O(log n)', subject: 'dsa', inLibrary: true })
      })
    );
  });

  it('rejects an unknown subject', async () => {
    const res = await createContentAction({ title: 'Big-O', contentType: 'notes', subject: 'astrology' });
    expect(res.success).toBe(false);
  });
});
