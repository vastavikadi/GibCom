export interface ConfluenceAuthResult {
  ok: boolean;
  displayName?: string;
  emailAddress?: string;
  spacesCount?: number;
  spaces?: Array<{ key: string; name: string }>;
  error?: string;
}

export function sanitizeConfluenceDomain(rawDomain: string): string {
  let domain = rawDomain.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!domain.includes('.')) {
    domain = `${domain}.atlassian.net`;
  }
  return domain;
}

export async function testConfluenceAuth(
  domain: string,
  email: string,
  apiToken: string,
  spaceKey?: string
): Promise<ConfluenceAuthResult> {
  const host = sanitizeConfluenceDomain(domain);
  const cleanEmail = email.trim();
  const cleanToken = apiToken.trim();

  // Guard against non-ASCII characters causing ByteString errors
  if (/[^\x00-\x7F]/.test(cleanEmail) || /[^\x00-\x7F]/.test(cleanToken)) {
    return { ok: false, error: 'Email or API token contains invalid non-ASCII characters. Please re-enter your Atlassian API Token.' };
  }

  const authHeader = `Basic ${Buffer.from(`${cleanEmail}:${cleanToken}`).toString('base64')}`;

  try {
    // 1. Check user profile
    const userRes = await fetch(`https://${host}/wiki/rest/api/user/current`, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
    });

    if (userRes.status === 401) {
      return { ok: false, error: 'Authentication failed. Check your Atlassian account email and API Token.' };
    }
    if (userRes.status === 403) {
      return { ok: false, error: 'Access forbidden. Your Atlassian account lacks Confluence permissions on this site.' };
    }
    if (!userRes.ok) {
      return { ok: false, error: `Confluence returned status ${userRes.status}` };
    }

    const userData = await userRes.json();

    // 2. Query spaces
    const spacesRes = await fetch(`https://${host}/wiki/rest/api/space?limit=25`, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
    });

    let spaces: Array<{ key: string; name: string }> = [];
    if (spacesRes.ok) {
      const spacesData = await spacesRes.json();
      if (Array.isArray(spacesData.results)) {
        spaces = spacesData.results.map((s: any) => ({ key: s.key, name: s.name }));
      }
    }

    if (spaceKey?.trim()) {
      const cleanSpaceKey = spaceKey.trim().toUpperCase();
      const targetSpace = spaces.find((s) => s.key.toUpperCase() === cleanSpaceKey);
      if (!targetSpace && spaces.length > 0) {
        return {
          ok: true,
          displayName: userData.displayName || userData.username,
          emailAddress: userData.email || cleanEmail,
          spacesCount: spaces.length,
          spaces: spaces.slice(0, 10),
          error: `Connected as ${userData.displayName}, but space "${cleanSpaceKey}" was not found. Available spaces: ${spaces.map((s) => s.key).join(', ')}`,
        };
      }
    }

    return {
      ok: true,
      displayName: userData.displayName || userData.username || cleanEmail,
      emailAddress: userData.email || cleanEmail,
      spacesCount: spaces.length,
      spaces: spaces.slice(0, 10),
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to reach Confluence Cloud',
    };
  }
}

function htmlToMarkdown(html: string): string {
  if (!html) return '';
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<ac:[^>]*>[\s\S]*?<\/ac:[^>]*>/gi, '') // Strip internal Confluence XML macros
    .replace(/<[^>]+>/g, '') // Strip remaining HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function fetchConfluencePagesAsDocument(
  domain: string,
  email: string,
  apiToken: string,
  spaceKey?: string,
  limit = 20
): Promise<{ title: string; content: string; pageCount: number }> {
  const host = sanitizeConfluenceDomain(domain);
  const cleanEmail = email.trim();
  const cleanToken = apiToken.trim();
  const authHeader = `Basic ${Buffer.from(`${cleanEmail}:${cleanToken}`).toString('base64')}`;

  const spaceQuery = spaceKey?.trim() ? `&spaceKey=${encodeURIComponent(spaceKey.trim().toUpperCase())}` : '';
  const url = `https://${host}/wiki/rest/api/content?type=page${spaceQuery}&expand=body.storage,version,history&limit=${limit}`;

  const res = await fetch(url, {
    headers: {
      Authorization: authHeader,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Confluence error (${res.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await res.json();
  const pages = data.results || [];

  if (!pages.length) {
    throw new Error(`No pages found in Confluence${spaceKey ? ` space "${spaceKey}"` : ''}.`);
  }

  const lines: string[] = [
    `# Confluence Knowledge Stream — Spaces & Documentation`,
    `Domain: https://${host}`,
    `Space: ${spaceKey || 'All Accessible Spaces'}`,
    `Synchronized: ${new Date().toISOString()}`,
    `Total Pages Retrieved: ${pages.length}`,
    '',
    '---',
    '',
  ];

  for (const page of pages) {
    const title = page.title || 'Untitled Page';
    const author = page.history?.createdBy?.displayName || 'Unknown Author';
    const version = page.version?.number || 1;
    const updated = page.version?.when || '';
    const rawStorage = page.body?.storage?.value || '';
    const bodyMarkdown = htmlToMarkdown(rawStorage);
    const pageUrl = `https://${host}/wiki${page._links?.webui || ''}`;

    lines.push(`## ${title}`);
    lines.push(`- **Author:** ${author} | **Version:** ${version} | **Updated:** ${updated}`);
    lines.push(`- **URL:** ${pageUrl}`);
    lines.push('');
    lines.push('### Content');
    lines.push(bodyMarkdown || '_No text content._');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return {
    title: `Confluence Stream (${spaceKey ? `Space ${spaceKey}` : host}) — ${new Date().toLocaleDateString()}`,
    content: lines.join('\n'),
    pageCount: pages.length,
  };
}

