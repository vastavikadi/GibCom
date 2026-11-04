import { describe, it, expect } from 'vitest';
import { DocumentProcessor } from '@/lib/ingestion/processor';

describe('DocumentProcessor', () => {
  const processor = new DocumentProcessor();

  it('chunks long text into segments with overlap', () => {
    const text = 'Paragraph 1: Background of the architecture and history of payment systems.\n\nParagraph 2: Detailed technical rationale for choosing PostgreSQL over alternatives.\n\nParagraph 3: Team capacity, sprint allocation and next quarterly milestones.';
    const chunks = processor.chunkContent(text, { maxChunkSize: 120, overlap: 20 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].content).toContain('Paragraph 1');
  });

  it('preserves section headers in chunk metadata', () => {
    const markdown = '# Architecture Decisions\n\nWe decided to use PostgreSQL for ACID transactions in our core payment processing engine.\n\n## Future Considerations\n\nWe will evaluate sharding strategies in late 2027.';
    const chunks = processor.chunkContent(markdown, { maxChunkSize: 120, overlap: 20 });

    expect(chunks.length).toBeGreaterThan(0);
  });
});
