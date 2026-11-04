export interface SlackAuthResult {
  ok: boolean;
  team?: string;
  user?: string;
  teamId?: string;
  userId?: string;
  error?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  memberCount?: number;
}

export async function testSlackAuth(token: string): Promise<SlackAuthResult> {
  const cleanToken = token.trim();
  if (/[^\x00-\x7F]/.test(cleanToken)) {
    return { ok: false, error: 'Token contains invalid characters. Please re-enter your Slack Bot Token.' };
  }

  try {
    const res = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await res.json();
    if (!data.ok) {
      return { ok: false, error: data.error || 'Authentication failed' };
    }

    return {
      ok: true,
      team: data.team,
      user: data.user,
      teamId: data.team_id,
      userId: data.user_id,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to reach Slack API',
    };
  }
}

export async function fetchSlackChannels(token: string): Promise<SlackChannel[]> {
  try {
    const res = await fetch(
      'https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();
    if (!data.ok || !Array.isArray(data.channels)) {
      return [];
    }

    return data.channels.map((c: any) => ({
      id: c.id,
      name: c.name,
      isPrivate: Boolean(c.is_private),
      memberCount: c.num_members,
    }));
  } catch {
    return [];
  }
}

export async function fetchSlackUsers(token: string): Promise<Record<string, string>> {
  try {
    const res = await fetch('https://slack.com/api/users.list?limit=200', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const userMap: Record<string, string> = {};
    if (data.ok && Array.isArray(data.members)) {
      for (const m of data.members) {
        userMap[m.id] = m.real_name || m.name || m.id;
      }
    }
    return userMap;
  } catch {
    return {};
  }
}

export async function fetchSlackMessagesAsDocument(
  token: string,
  channelId: string,
  channelName: string,
  limit = 50
): Promise<{ title: string; content: string; messageCount: number }> {
  const users = await fetchSlackUsers(token);

  const res = await fetch(
    `https://slack.com/api/conversations.history?channel=${channelId}&limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await res.json();
  if (!data.ok || !Array.isArray(data.messages)) {
    throw new Error(data.error ? `Slack error: ${data.error}` : 'Unable to retrieve messages');
  }

  const rawMessages = data.messages.reverse();
  const lines: string[] = [
    `# Slack Channel #${channelName} Knowledge Stream`,
    `Channel ID: ${channelId}`,
    `Captured At: ${new Date().toISOString()}`,
    `Total Messages: ${rawMessages.length}`,
    '',
    '---',
    '',
  ];

  for (const m of rawMessages) {
    if (m.subtype && m.subtype !== 'bot_message') continue;
    const author = users[m.user] || m.username || m.user || 'Unknown';
    const time = m.ts ? new Date(Number(m.ts) * 1000).toLocaleString() : 'Recent';
    let text = (m.text || '').replace(/<@([A-Z0-9]+)>/g, (_: string, id: string) => `@${users[id] || id}`);

    lines.push(`**${author}** (${time}):`);
    lines.push(text);
    lines.push('');
  }

  return {
    title: `Slack #${channelName} History (${new Date().toLocaleDateString()})`,
    content: lines.join('\n'),
    messageCount: rawMessages.length,
  };
}

