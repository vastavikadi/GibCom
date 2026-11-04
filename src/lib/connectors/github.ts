export interface GitHubAuthResult {
  ok: boolean;
  user?: string;
  fullName?: string;
  description?: string;
  defaultBranch?: string;
  isPrivate?: boolean;
  stars?: number;
  error?: string;
}

export async function testGitHubAuth(token: string, repo: string): Promise<GitHubAuthResult> {
  const cleanToken = token.trim();
  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');

  // Guard against non-ASCII ByteString issues (e.g. bullet characters •)
  if (/[^\x00-\x7F]/.test(cleanToken)) {
    return {
      ok: false,
      error: 'Token contains invalid characters. Please re-enter your GitHub Personal Access Token.',
    };
  }

  // Pre-validate repository format if provided
  if (cleanRepo && !cleanRepo.includes('/')) {
    return {
      ok: false,
      error: 'Repository must be in "owner/repo" format (e.g. facebook/react).',
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${cleanToken}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'CompanysBrain-Intelligence-Engine/1.0',
  };

  try {
    // 1. Verify token by calling /user
    const userRes = await fetch('https://api.github.com/user', { headers });

    if (userRes.status === 401) {
      return { ok: false, error: 'Bad credentials. The provided GitHub token is invalid or expired.' };
    }

    let githubUsername = '';
    if (userRes.ok) {
      const userData = await userRes.json().catch(() => ({}));
      githubUsername = userData.login || '';
    }

    // 2. Validate repository format
    if (!cleanRepo || !cleanRepo.includes('/')) {
      if (githubUsername) {
        return {
          ok: false,
          user: githubUsername,
          error: `Token verified for @${githubUsername}, but repository must be in "owner/repo" format (e.g. facebook/react).`,
        };
      }
      return { ok: false, error: 'Repository must be in "owner/repo" format (e.g. facebook/react)' };
    }

    // 3. Verify repository access
    const repoRes = await fetch(`https://api.github.com/repos/${cleanRepo}`, { headers });

    if (repoRes.status === 401) {
      return { ok: false, error: 'Invalid GitHub Personal Access Token.' };
    }
    if (repoRes.status === 404) {
      return {
        ok: false,
        user: githubUsername,
        error: githubUsername
          ? `Token verified for @${githubUsername}, but repository "${cleanRepo}" was not found or your token lacks permissions.`
          : `Repository "${cleanRepo}" not found or token lacks access.`,
      };
    }

    const data = await repoRes.json();
    if (!repoRes.ok) {
      return { ok: false, error: data.message || `GitHub error (${repoRes.status})` };
    }

    return {
      ok: true,
      user: githubUsername || data.owner?.login,
      fullName: data.full_name,
      description: data.description,
      defaultBranch: data.default_branch,
      isPrivate: data.private,
      stars: data.stargazers_count,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to reach GitHub API',
    };
  }
}

export async function fetchGitHubPullRequestsAsDocument(
  token: string,
  repo: string,
  limit = 15
): Promise<{ title: string; content: string; prCount: number }> {
  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');

  const res = await fetch(
    `https://api.github.com/repos/${cleanRepo}/pulls?state=all&sort=updated&direction=desc&per_page=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'GibCom-Intelligence-Engine/1.0',
      },
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch GitHub PRs (${res.status})`);
  }

  const prs = await res.json();
  if (!Array.isArray(prs)) {
    throw new Error('Unexpected GitHub API response structure');
  }

  const lines: string[] = [
    `# GitHub Repository ${cleanRepo} — Pull Requests & Architectural Rationale`,
    `Repository: https://github.com/${cleanRepo}`,
    `Synchronized: ${new Date().toISOString()}`,
    `Total Pull Requests Retrieved: ${prs.length}`,
    '',
    '---',
    '',
  ];

  for (const pr of prs) {
    lines.push(`## PR #${pr.number}: ${pr.title}`);
    lines.push(`- **Author:** @${pr.user?.login || 'unknown'}`);
    lines.push(`- **State:** ${pr.state}${pr.merged_at ? ' (Merged)' : ''}`);
    lines.push(`- **Created:** ${pr.created_at} | **Updated:** ${pr.updated_at}`);
    lines.push(`- **URL:** ${pr.html_url}`);
    lines.push('');
    lines.push('### Summary & Context');
    lines.push(pr.body ? pr.body.trim() : '_No description provided._');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return {
    title: `GitHub ${cleanRepo} PR Knowledge Stream (${new Date().toLocaleDateString()})`,
    content: lines.join('\n'),
    prCount: prs.length,
  };
}

export async function fetchGitHubCommitsAsDocument(
  token: string,
  repo: string,
  limit = 25
): Promise<{ title: string; content: string; commitCount: number }> {
  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');

  const res = await fetch(
    `https://api.github.com/repos/${cleanRepo}/commits?per_page=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'GibCom-Intelligence-Engine/1.0',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch GitHub commits (${res.status})`);
  }

  const commits = await res.json();
  if (!Array.isArray(commits)) {
    throw new Error('Unexpected GitHub API response');
  }

  const lines: string[] = [
    `# GitHub Repository ${cleanRepo} — Recent Commits & Changes`,
    `Repository: https://github.com/${cleanRepo}`,
    `Synchronized: ${new Date().toISOString()}`,
    '',
  ];

  for (const c of commits) {
    const sha = c.sha?.slice(0, 7) || 'unknown';
    const author = c.commit?.author?.name || c.author?.login || 'unknown';
    const date = c.commit?.author?.date || '';
    const message = c.commit?.message?.trim() || '';

    lines.push(`- **[\`${sha}\`]** ${message.split('\n')[0]} (by ${author} on ${date})`);
  }

  return {
    title: `GitHub ${cleanRepo} Recent Commits (${new Date().toLocaleDateString()})`,
    content: lines.join('\n'),
    commitCount: commits.length,
  };
}
