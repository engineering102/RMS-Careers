import { describe, it, expect } from 'vitest';
import { parseDriveUrl } from '@/lib/content/drive-url';

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';

describe('parseDriveUrl (Drive share link → in-page viewer)', () => {
  it('embeds the standard "Copy link" share URL for a Drive file', () => {
    expect(parseDriveUrl(`https://drive.google.com/file/d/${ID}/view?usp=sharing`)).toEqual({
      kind: 'file',
      fileId: ID,
      embedUrl: `https://drive.google.com/file/d/${ID}/preview`
    });
  });

  it('accepts edit/preview variants, account prefixes and surrounding whitespace', () => {
    for (const link of [
      `https://drive.google.com/file/d/${ID}/edit`,
      `https://drive.google.com/file/d/${ID}/preview`,
      `https://drive.google.com/file/d/${ID}`,
      `https://drive.google.com/u/0/file/d/${ID}/view`,
      `  https://drive.google.com/file/d/${ID}/view  `
    ]) {
      expect(parseDriveUrl(link)?.embedUrl).toBe(`https://drive.google.com/file/d/${ID}/preview`);
    }
  });

  it('accepts the legacy open?id= and uc?id= forms', () => {
    expect(parseDriveUrl(`https://drive.google.com/open?id=${ID}`)?.fileId).toBe(ID);
    expect(parseDriveUrl(`https://drive.google.com/uc?id=${ID}&export=download`)?.fileId).toBe(ID);
  });

  it('keeps the resource key that older shared files need', () => {
    expect(parseDriveUrl(`https://drive.google.com/file/d/${ID}/view?usp=sharing&resourcekey=0-abc_DEF`)?.embedUrl).toBe(
      `https://drive.google.com/file/d/${ID}/preview?resourcekey=0-abc_DEF`
    );
  });

  it('embeds Google Docs, Slides and Sheets through their own preview pages', () => {
    expect(parseDriveUrl(`https://docs.google.com/document/d/${ID}/edit?usp=sharing`)).toMatchObject({
      kind: 'document',
      embedUrl: `https://docs.google.com/document/d/${ID}/preview`
    });
    expect(parseDriveUrl(`https://docs.google.com/presentation/d/${ID}/edit#slide=id.p`)).toMatchObject({
      kind: 'presentation',
      embedUrl: `https://docs.google.com/presentation/d/${ID}/preview`
    });
    expect(parseDriveUrl(`https://docs.google.com/spreadsheets/u/1/d/${ID}/edit`)).toMatchObject({
      kind: 'spreadsheet',
      embedUrl: `https://docs.google.com/spreadsheets/d/${ID}/preview`
    });
  });

  it('rejects folders, other hosts, lookalike domains, http and junk', () => {
    for (const link of [
      `https://drive.google.com/drive/folders/${ID}`,
      `https://drive.google.com/file/d/short/view`,
      `https://drive.google.com.evil.example/file/d/${ID}/view`,
      `https://example.com/file/d/${ID}/view`,
      `http://drive.google.com/file/d/${ID}/view`,
      `https://drive.google.com/file/d/${ID}"><script>/view`,
      'notes.pdf',
      '',
      null,
      undefined
    ]) {
      expect(parseDriveUrl(link)).toBeNull();
    }
  });
});
