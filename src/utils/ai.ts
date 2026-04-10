/**
 * AI Brain Core: OpenAI Integration for Embeddings and Chat
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

function createTextStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

/**
 * Generates an OpenAI embedding for a given text string.
 * Uses text-embedding-3-small (1536 dimensions) by default.
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult | null> {
  if (!OPENAI_API_KEY) {
    console.error('[AI] Missing OPENAI_API_KEY. Skipping embedding generation.');
    return null;
  }

  // Clean the text to prevent API errors
  const cleanText = text.replace(/\n/g, ' ').trim();
  if (!cleanText) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: cleanText,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[AI] OpenAI Embedding Error:', err);
      return null;
    }

    const data = await response.json();
    return {
      embedding: data.data[0].embedding,
      tokens: data.usage.total_tokens,
    };
  } catch (err) {
    console.error('[AI] Unexpected error in generateEmbedding:', err);
    return null;
  }
}

/**
 * Calls OpenAI Chat Completion with a given prompt and context.
 */
export async function chatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model = 'gpt-4o'
): Promise<string | null> {
  if (!OPENAI_API_KEY) {
    return 'EYES Brain is offline: Missing OpenAI API Key. Please add it to your environment variables.';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1, // Keep it factual for memory retrieval
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[AI] OpenAI Chat Error:', err);
      return 'I encountered an error while accessing my memory modules. Please try again.';
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (err) {
    console.error('[AI] Unexpected error in chatCompletion:', err);
    return 'My neural link was interrupted. Check your network connection.';
  }
}

export async function chatCompletionStream(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model = 'gpt-4o'
): Promise<ReadableStream<Uint8Array>> {
  if (!OPENAI_API_KEY) {
    return createTextStream('EYES Brain is offline: Missing OpenAI API Key. Please add it to your environment variables.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const err = await response.json().catch(() => null);
      console.error('[AI] OpenAI Chat Stream Error:', err ?? response.statusText);
      return createTextStream('I encountered an error while accessing my memory modules. Please try again.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = '';

        const flushEvent = (eventText: string) => {
          const data = eventText.replace(/^data:\s*/, '').trim();

          if (!data || data === '[DONE]') {
            return false;
          }

          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const token = parsed.choices?.[0]?.delta?.content;

            if (token) {
              controller.enqueue(encoder.encode(token));
            }
          } catch (error) {
            console.error('[AI] Failed to parse streamed token:', error);
          }

          return true;
        };

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split(/\r?\n\r?\n/);
            buffer = events.pop() ?? '';

            for (const eventText of events) {
              const shouldContinue = flushEvent(eventText);
              if (shouldContinue === false) {
                controller.close();
                return;
              }
            }
          }

          const finalBuffer = buffer + decoder.decode();
          if (finalBuffer.trim()) {
            for (const line of finalBuffer.split(/\r?\n/)) {
              if (!line.trim()) continue;
              const shouldContinue = flushEvent(line);
              if (shouldContinue === false) {
                controller.close();
                return;
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error('[AI] Unexpected error in chatCompletionStream:', error);
          controller.enqueue(encoder.encode('My neural link was interrupted. Check your network connection.'));
          controller.close();
        }
      },
    });
  } catch (error) {
    console.error('[AI] Unexpected error creating chatCompletionStream:', error);
    return createTextStream('My neural link was interrupted. Check your network connection.');
  }
}
