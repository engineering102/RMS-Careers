/**
 * @file apps/admin/lib/services/github-validator.ts
 *
 * Lightweight GitHub repository and URL validator for the RMS Careers admin workbench.
 * Validates public accessibility via HEAD fetch and parses repository metadata.
 */

export interface ParsedGithubInfo {
  rawUrl: string;
  isValidGithubUrl: boolean;
  owner: string | null;
  repo: string | null;
  isPullRequest: boolean;
  pullNumber: number | null;
  branch: string | null;
}

export interface GithubValidationResult {
  valid: boolean;
  statusCode?: number;
  reason?: string;
  checkedAt: Date;
  parsedInfo: ParsedGithubInfo;
}

const GITHUB_REPO_REGEX = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/)?$/i;
const GITHUB_PR_REGEX = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)(?:\/)?/i;
const GITHUB_TREE_REGEX = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/tree\/([A-Za-z0-9_.-]+)(?:\/)?/i;

/**
 * Parses a GitHub URL into structured repository metadata.
 */
export function parseGithubUrl(rawUrl: string): ParsedGithubInfo {
  const url = (rawUrl || '').trim();

  // 1. Check Pull Request URL
  const prMatch = url.match(GITHUB_PR_REGEX);
  if (prMatch) {
    return {
      rawUrl: url,
      isValidGithubUrl: true,
      owner: prMatch[1],
      repo: prMatch[2],
      isPullRequest: true,
      pullNumber: parseInt(prMatch[3], 10),
      branch: null
    };
  }

  // 2. Check Branch URL
  const treeMatch = url.match(GITHUB_TREE_REGEX);
  if (treeMatch) {
    return {
      rawUrl: url,
      isValidGithubUrl: true,
      owner: treeMatch[1],
      repo: treeMatch[2],
      isPullRequest: false,
      pullNumber: null,
      branch: treeMatch[3]
    };
  }

  // 3. Check Standard Repo URL
  const repoMatch = url.match(GITHUB_REPO_REGEX);
  if (repoMatch) {
    return {
      rawUrl: url,
      isValidGithubUrl: true,
      owner: repoMatch[1],
      repo: repoMatch[2],
      isPullRequest: false,
      pullNumber: null,
      branch: null
    };
  }

  // 4. Fallback check for any github.com URL
  const isGithubDomain = url.startsWith('https://github.com/');
  return {
    rawUrl: url,
    isValidGithubUrl: isGithubDomain,
    owner: null,
    repo: null,
    isPullRequest: false,
    pullNumber: null,
    branch: null
  };
}

/**
 * Validates public accessibility of a GitHub repository via lightweight HEAD fetch.
 * Follows the canonical RMS Careers validator pattern.
 */
export async function verifyPublicGithubRepo(
  rawUrl: string,
  timeoutMs: number = 6000
): Promise<GithubValidationResult> {
  const checkedAt = new Date();
  const parsedInfo = parseGithubUrl(rawUrl);

  if (!parsedInfo.isValidGithubUrl) {
    return {
      valid: false,
      reason: 'Invalid GitHub URL format. Must start with https://github.com/',
      checkedAt,
      parsedInfo
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(rawUrl.trim(), {
      method: 'HEAD',
      headers: {
        'User-Agent': 'RMS-Careers-Admin-Validator/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return {
        valid: false,
        statusCode: 404,
        reason: 'GitHub repository not found or is private. Ensure the repository is publicly accessible.',
        checkedAt,
        parsedInfo
      };
    }

    if (!response.ok && response.status !== 405) {
      // 5xx upstream from GitHub should not block evaluation
      if (response.status >= 500) {
        return {
          valid: true,
          statusCode: response.status,
          reason: `GitHub returned status ${response.status} (upstream server error), treated as accessible.`,
          checkedAt,
          parsedInfo
        };
      }
      return {
        valid: false,
        statusCode: response.status,
        reason: `GitHub returned HTTP ${response.status}. Repository may be restricted.`,
        checkedAt,
        parsedInfo
      };
    }

    return {
      valid: true,
      statusCode: response.status,
      checkedAt,
      parsedInfo
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return {
        valid: false,
        reason: 'Connection to GitHub timed out (6s limit exceeded).',
        checkedAt,
        parsedInfo
      };
    }
    return {
      valid: false,
      reason: error?.message || 'Could not connect to GitHub repository.',
      checkedAt,
      parsedInfo
    };
  }
}
