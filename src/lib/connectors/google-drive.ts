export interface GoogleDriveAuthResult {
  ok: boolean;
  userEmail?: string;
  filesCount?: number;
  files?: Array<{ id: string; name: string; mimeType: string }>;
  folderName?: string;
  error?: string;
}

export async function testGoogleDriveAuth(
  accessTokenOrKey: string,
  folderId = 'root'
): Promise<GoogleDriveAuthResult> {
  const cleanKey = accessTokenOrKey.trim();

  if (!cleanKey) {
    return { ok: false, error: 'Google Drive Access Token or API Key is required' };
  }

  // Guard against non-ASCII ByteString issues
  if (/[^\x00-\x7F]/.test(cleanKey)) {
    return { ok: false, error: 'Token contains invalid characters. Please re-enter your Google API Key or OAuth Bearer Token.' };
  }

  const cleanFolder = folderId.trim() || 'root';
  const isOauth = cleanKey.startsWith('ya29.') || cleanKey.length > 80;

  try {
    // If it's an OAuth Bearer token, we can query drive v3 directly with Authorization header
    const headers: Record<string, string> = {};
    let url = 'https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,mimeType,modifiedTime,size)';

    if (isOauth) {
      headers.Authorization = `Bearer ${cleanKey}`;
      if (cleanFolder !== 'root') {
        url += `&q='${encodeURIComponent(cleanFolder)}'+in+parents+and+trashed=false`;
      } else {
        url += `&q=trashed=false`;
      }
    } else {
      // API Key mode
      url += `&key=${encodeURIComponent(cleanKey)}`;
      if (cleanFolder !== 'root') {
        url += `&q='${encodeURIComponent(cleanFolder)}'+in+parents+and+trashed=false`;
      }
    }

    const res = await fetch(url, { headers });

    if (res.status === 401) {
      return { ok: false, error: 'Google authentication failed (401 Unauthorized). Verify your Google OAuth Token or API Key.' };
    }
    if (res.status === 403) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData.error?.message || 'Access forbidden (403). Check that Google Drive API is enabled in your Google Cloud Console.';
      return { ok: false, error: msg };
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { ok: false, error: errData.error?.message || `Google Drive API error (${res.status})` };
    }

    const data = await res.json();
    const files = (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
    }));

    return {
      ok: true,
      filesCount: files.length,
      files: files.slice(0, 10),
      folderName: cleanFolder === 'root' ? 'My Drive (Root)' : `Folder: ${cleanFolder}`,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to reach Google Drive API',
    };
  }
}

export async function fetchGoogleDriveDocuments(
  accessTokenOrKey: string,
  folderId = 'root',
  limit = 20
): Promise<{ title: string; content: string; fileCount: number }> {
  const cleanKey = accessTokenOrKey.trim();
  const cleanFolder = folderId.trim() || 'root';
  const isOauth = cleanKey.startsWith('ya29.') || cleanKey.length > 80;

  const headers: Record<string, string> = {};
  let listUrl = `https://www.googleapis.com/drive/v3/files?pageSize=${limit}&fields=files(id,name,mimeType,modifiedTime,size,description)`;

  if (isOauth) {
    headers.Authorization = `Bearer ${cleanKey}`;
    if (cleanFolder !== 'root') {
      listUrl += `&q='${encodeURIComponent(cleanFolder)}'+in+parents+and+trashed=false`;
    } else {
      listUrl += `&q=trashed=false`;
    }
  } else {
    listUrl += `&key=${encodeURIComponent(cleanKey)}`;
    if (cleanFolder !== 'root') {
      listUrl += `&q='${encodeURIComponent(cleanFolder)}'+in+parents+and+trashed=false`;
    }
  }

  const res = await fetch(listUrl, { headers });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Failed to list files from Google Drive (${res.status})`);
  }

  const data = await res.json();
  const files = data.files || [];

  if (!files.length) {
    throw new Error(`No files found in Google Drive folder "${cleanFolder}".`);
  }

  const lines: string[] = [
    `# Google Drive Knowledge Stream — Documents & Files`,
    `Folder: ${cleanFolder === 'root' ? 'My Drive' : cleanFolder}`,
    `Synchronized: ${new Date().toISOString()}`,
    `Total Files Discovered: ${files.length}`,
    '',
    '---',
    '',
  ];

  for (const f of files) {
    let extractedText = '';

    // If it's a Google Doc, export plain text
    if (f.mimeType === 'application/vnd.google-apps.document' && isOauth) {
      try {
        const exportRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=text/plain`,
          { headers: { Authorization: `Bearer ${cleanKey}` } }
        );
        if (exportRes.ok) {
          extractedText = await exportRes.text();
        }
      } catch {
        extractedText = '';
      }
    } else if (f.mimeType === 'application/vnd.google-apps.spreadsheet' && isOauth) {
      try {
        const exportRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=text/csv`,
          { headers: { Authorization: `Bearer ${cleanKey}` } }
        );
        if (exportRes.ok) {
          extractedText = await exportRes.text();
        }
      } catch {
        extractedText = '';
      }
    }

    lines.push(`## [Document] ${f.name}`);
    lines.push(`- **Type:** ${f.mimeType}`);
    lines.push(`- **ID:** ${f.id} | **Last Modified:** ${f.modifiedTime || 'Unknown'}`);
    if (f.description) lines.push(`- **Description:** ${f.description}`);
    lines.push('');

    if (extractedText.trim()) {
      lines.push('### Document Content');
      lines.push(extractedText.slice(0, 10000).trim());
    } else {
      lines.push('_Metadata indexed. File content binary or non-exportable._');
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return {
    title: `Google Drive Stream (${cleanFolder === 'root' ? 'Drive Root' : cleanFolder}) — ${new Date().toLocaleDateString()}`,
    content: lines.join('\n'),
    fileCount: files.length,
  };
}

