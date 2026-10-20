// Turns a pasted Google Drive / Docs share link into the iframe URL the resource viewer embeds, so admins keep pasting
// ordinary "Anyone with the link" share links and students read the file in-page instead of in a new Drive tab.

export type DriveFileKind = 'file' | 'document' | 'presentation' | 'spreadsheet';

export interface ParsedDriveLink {
  kind: DriveFileKind;
  fileId: string;
  /** Google's own preview page for the file; the only Drive URL that may be framed. */
  embedUrl: string;
}

const FILE_ID = /^[A-Za-z0-9_-]{10,}$/;
const DOCS_KINDS: Record<string, DriveFileKind> = {
  document: 'document',
  presentation: 'presentation',
  spreadsheets: 'spreadsheet'
};

/** Returns null for anything that is not a Google Drive / Docs file link (folders included). */
export function parseDriveUrl(raw: string | null | undefined): ParsedDriveLink | null {
  if (!raw || !raw.trim()) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);
  // Files shared before Drive's 2021 security update need their resource key to open for link holders.
  const resourceKey = url.searchParams.get('resourcekey');

  let kind: DriveFileKind | null = null;
  let fileId = '';

  if (host === 'drive.google.com') {
    // /file/d/<id>/view, also under a Workspace account prefix such as /u/0/file/d/<id>
    const fileIndex = segments.indexOf('file');
    if (fileIndex !== -1 && segments[fileIndex + 1] === 'd') {
      kind = 'file';
      fileId = segments[fileIndex + 2] ?? '';
    } else if (segments.at(-1) === 'open' || segments.at(-1) === 'uc') {
      kind = 'file';
      fileId = url.searchParams.get('id') ?? '';
    }
  } else if (host === 'docs.google.com') {
    // /document/d/<id>/edit, /presentation/d/<id>/edit, /spreadsheets/d/<id>/edit (optionally with /u/<n>/ after the kind)
    const kindIndex = segments.findIndex((s) => Object.hasOwn(DOCS_KINDS, s));
    if (kindIndex !== -1) {
      const rest = segments.slice(kindIndex + 1);
      if (rest[0] === 'u') rest.splice(0, 2);
      if (rest[0] === 'd') {
        kind = DOCS_KINDS[segments[kindIndex]!]!;
        fileId = rest[1] ?? '';
      }
    }
  }

  if (!kind || !FILE_ID.test(fileId)) return null;

  const base =
    kind === 'file'
      ? `https://drive.google.com/file/d/${fileId}/preview`
      : `https://docs.google.com/${kind === 'spreadsheet' ? 'spreadsheets' : kind}/d/${fileId}/preview`;
  const embedUrl = resourceKey ? `${base}?resourcekey=${encodeURIComponent(resourceKey)}` : base;

  return { kind, fileId, embedUrl };
}
