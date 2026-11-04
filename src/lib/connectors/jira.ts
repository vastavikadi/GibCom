export interface JiraAuthResult {
  ok: boolean;
  displayName?: string;
  emailAddress?: string;
  accountType?: string;
  active?: boolean;
  error?: string;
}

export function sanitizeJiraDomain(rawDomain: string): string {
  let domain = rawDomain.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!domain.includes('.')) {
    domain = `${domain}.atlassian.net`;
  }
  return domain;
}

export async function testJiraAuth(
  domain: string,
  email: string,
  apiToken: string
): Promise<JiraAuthResult> {
  const host = sanitizeJiraDomain(domain);
  const cleanEmail = email.trim();
  const cleanToken = apiToken.trim();

  if (/[^\x00-\x7F]/.test(cleanEmail) || /[^\x00-\x7F]/.test(cleanToken)) {
    return { ok: false, error: 'Email or API token contains invalid characters. Please re-enter your Atlassian API Token.' };
  }

  const authHeader = `Basic ${Buffer.from(`${cleanEmail}:${cleanToken}`).toString('base64')}`;

  try {
    const res = await fetch(`https://${host}/rest/api/3/myself`, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
    });

    if (res.status === 401) {
      return { ok: false, error: 'Authentication failed. Verify email and Atlassian API Token.' };
    }
    if (res.status === 403) {
      return { ok: false, error: 'Access forbidden. Check Jira Cloud permissions for this user.' };
    }
    if (!res.ok) {
      return { ok: false, error: `Jira returned status ${res.status}` };
    }

    const data = await res.json();
    return {
      ok: true,
      displayName: data.displayName,
      emailAddress: data.emailAddress,
      accountType: data.accountType,
      active: data.active,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to reach Jira Cloud',
    };
  }
}

function parseAdfNode(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.text) return node.text;

  if (Array.isArray(node.content)) {
    const inner = node.content.map(parseAdfNode).join('');
    if (node.type === 'paragraph') return `${inner}\n\n`;
    if (node.type === 'heading') return `### ${inner}\n\n`;
    if (node.type === 'bulletList') return `${inner}\n`;
    if (node.type === 'listItem') return `- ${inner.trim()}\n`;
    if (node.type === 'codeBlock') return `\`\`\`\n${inner}\n\`\`\`\n\n`;
    return inner;
  }
  return '';
}

export async function fetchJiraIssuesAsDocument(
  domain: string,
  email: string,
  apiToken: string,
  jql = 'ORDER BY updated DESC',
  maxResults = 25
): Promise<{ title: string; content: string; issueCount: number }> {
  const host = sanitizeJiraDomain(domain);
  const authHeader = `Basic ${Buffer.from(`${email.trim()}:${apiToken.trim()}`).toString('base64')}`;

  const res = await fetch(`https://${host}/rest/api/3/search`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jql: jql.trim() || 'ORDER BY updated DESC',
      maxResults,
      fields: ['summary', 'description', 'status', 'assignee', 'priority', 'issuetype', 'created', 'updated'],
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMsg =
      errorData.errorMessages?.join('; ') ||
      Object.entries(errorData.errors || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ') ||
      `Jira API error (${res.status})`;
    throw new Error(errorMsg);
  }

  const data = await res.json();
  const issues = data.issues || [];

  const lines: string[] = [
    `# Jira Cloud Stream — Issues & Project Management Context`,
    `Domain: https://${host}`,
    `JQL Query: \`${jql}\``,
    `Synchronized: ${new Date().toISOString()}`,
    `Total Issues Retrieved: ${issues.length}`,
    '',
    '---',
    '',
  ];

  for (const issue of issues) {
    const fields = issue.fields || {};
    const summary = fields.summary || 'Untitled issue';
    const status = fields.status?.name || 'Unknown';
    const type = fields.issuetype?.name || 'Task';
    const priority = fields.priority?.name || 'None';
    const assignee = fields.assignee?.displayName || 'Unassigned';
    const description = parseAdfNode(fields.description) || '_No description provided._';

    lines.push(`## [${issue.key}] ${summary}`);
    lines.push(`- **Type:** ${type} | **Status:** ${status} | **Priority:** ${priority}`);
    lines.push(`- **Assignee:** ${assignee}`);
    lines.push(`- **Created:** ${fields.created} | **Updated:** ${fields.updated}`);
    lines.push(`- **Link:** https://${host}/browse/${issue.key}`);
    lines.push('');
    lines.push('### Description');
    lines.push(description.trim());
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return {
    title: `Jira Cloud Stream (${host}) — ${new Date().toLocaleDateString()}`,
    content: lines.join('\n'),
    issueCount: issues.length,
  };
}

