type ChunkingInput = {
  platform: string;
  eventType: string | null;
  title: string | null;
  content: string;
};

const DEFAULT_MAX_CHUNK_CHARS = 900;
const CHUNK_OVERLAP_CHARS = 140;
const MAX_CHUNKS_PER_EVENT = 4;

const CHUNK_SIZE_BY_EVENT_TYPE: Record<string, number> = {
  email: 1200,
  comment: 900,
  repository: 700,
  calendar_event: 900,
  page: 1000,
  database: 1000,
};

function normalizeWhitespace(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
}

function splitIntoSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function toChunkSize(eventType: string | null) {
  if (!eventType) {
    return DEFAULT_MAX_CHUNK_CHARS;
  }

  return CHUNK_SIZE_BY_EVENT_TYPE[eventType.toLowerCase()] ?? DEFAULT_MAX_CHUNK_CHARS;
}

export function buildDeterministicChunks(input: ChunkingInput) {
  const chunkSize = toChunkSize(input.eventType);
  const preface = [
    `Platform: ${input.platform}`,
    `Type: ${input.eventType || 'unknown'}`,
    `Title: ${input.title || 'Untitled'}`,
  ].join('\n');

  const normalizedContent = normalizeWhitespace(input.content);
  if (!normalizedContent) {
    return [`${preface}\nContent: `];
  }

  const sentences = splitIntoSentences(normalizedContent);
  const chunks: string[] = [];

  let current = `${preface}\nContent: `;
  let startSentenceIndex = 0;

  while (startSentenceIndex < sentences.length && chunks.length < MAX_CHUNKS_PER_EVENT) {
    current = `${preface}\nContent: `;
    let currentLength = current.length;
    let endSentenceIndex = startSentenceIndex;

    while (endSentenceIndex < sentences.length) {
      const sentence = sentences[endSentenceIndex];
      const additional = `${sentence} `;
      if (currentLength + additional.length > chunkSize && endSentenceIndex > startSentenceIndex) {
        break;
      }

      current += additional;
      currentLength += additional.length;
      endSentenceIndex += 1;

      if (currentLength >= chunkSize) {
        break;
      }
    }

    chunks.push(current.trim());

    if (endSentenceIndex >= sentences.length) {
      break;
    }

    // deterministic overlap by rewinding the sentence pointer based on overlap target.
    let rewindLength = 0;
    let overlapSentences = 0;
    for (let i = endSentenceIndex - 1; i >= startSentenceIndex; i -= 1) {
      rewindLength += sentences[i].length + 1;
      overlapSentences += 1;
      if (rewindLength >= CHUNK_OVERLAP_CHARS) {
        break;
      }
    }

    startSentenceIndex = Math.max(startSentenceIndex + 1, endSentenceIndex - overlapSentences);
  }

  return chunks;
}
