import { readFile } from 'node:fs/promises';
export interface ContentChunk { content: string; chunkIndex: number; startOffset: number; endOffset: number; section?: string; pageNumber?: number }
export interface ExtractionResult { content: string; metadata: { pageCount?: number; sections?: string[]; title?: string; author?: string }; pages?: string[] }
export class DocumentProcessor {
  async extractContent(filePath: string, mimeType: string): Promise<ExtractionResult> {
    const buffer = await readFile(filePath);
    if (mimeType === 'application/pdf') {
      if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Invalid PDF signature');
      const pdf = (await import('pdf-parse/lib/pdf-parse.js')).default;
      const pages: string[] = [];
      const data = await pdf(buffer, { pagerender: async (page: any) => { const text = await page.getTextContent(); const content = text.items.map((item: { str: string }) => item.str).join(' '); pages[page.pageNumber - 1] = content; return content; } });
      if (!data.text.trim()) throw new Error('This PDF has no extractable text. OCR is not configured.');
      return { content: pages.join('\n\n'), pages, metadata: { pageCount: data.numpages, title: data.info?.Title } };
    }
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) throw new Error('Invalid DOCX signature');
      const mammoth = await import('mammoth'); const result = await mammoth.extractRawText({ buffer });
      return { content: result.value, metadata: {} };
    }
    const content = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    if (content.includes('\0')) throw new Error('Binary content is not supported as text');
    if (mimeType === 'text/csv') { const { parse } = await import('csv-parse/sync'); parse(content, { skip_empty_lines: true, relax_column_count: false }); }
    if (!['text/plain', 'text/markdown', 'text/csv'].includes(mimeType)) throw new Error('Unsupported file format');
    return { content, metadata: {} };
  }
  chunkContent(content: string, options: { maxChunkSize?: number; overlap?: number; preserveSections?: boolean } = {}): ContentChunk[] {
    const max = options.maxChunkSize ?? 6000, overlap = options.overlap ?? 250;
    if (max < 100 || overlap < 0 || overlap >= max) throw new Error('Invalid chunk boundaries');
    const chunks: ContentChunk[] = []; let start = 0;
    while (start < content.length) {
      let end = Math.min(start + max, content.length);
      if (end < content.length) { const boundary = content.lastIndexOf('\n', end); if (boundary > start + max / 2) end = boundary; }
      const text = content.slice(start, end);
      if (text.trim()) chunks.push({ content: text, chunkIndex: chunks.length, startOffset: start, endOffset: end, section: content.slice(0, end).match(/^#{1,6}\s+.+$/gm)?.pop()?.replace(/^#+\s*/, '') });
      if (end === content.length) break; start = end - overlap;
    }
    return chunks;
  }
}
