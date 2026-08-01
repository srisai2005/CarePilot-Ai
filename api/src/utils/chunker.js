/**
 * Splits long extracted text into overlapping chunks suitable for indexing
 * into Azure AI Search, so the RAG chat can retrieve focused, relevant
 * passages instead of one giant blob per record.
 */
function chunkText(text, { maxChars = 1200, overlap = 150 } = {}) {
  const clean = (text || '').replace(/\r\n/g, '\n').trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + maxChars, clean.length);
    let sliceEnd = end;

    // Prefer to break on a sentence/paragraph boundary near the end.
    if (end < clean.length) {
      const boundary = clean.lastIndexOf('\n', end);
      const period = clean.lastIndexOf('. ', end);
      const best = Math.max(boundary, period);
      if (best > start + maxChars * 0.5) sliceEnd = best + 1;
    }

    chunks.push(clean.slice(start, sliceEnd).trim());
    if (sliceEnd >= clean.length) break;
    start = Math.max(sliceEnd - overlap, start + 1);
  }
  return chunks.filter(Boolean);
}

module.exports = { chunkText };
