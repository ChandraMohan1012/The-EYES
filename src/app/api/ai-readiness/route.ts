import { NextResponse } from 'next/server';

type ReadinessStatus = 'online' | 'degraded' | 'offline';

type CheckStatus = 'pass' | 'fail' | 'skip';

type ReadinessCheck = {
  status: CheckStatus;
  latencyMs: number;
  error?: string;
};

type ReadinessPayload = {
  status: ReadinessStatus;
  provider: string;
  model: string;
  reason: string;
  checks: {
    openaiEmbeddings: ReadinessCheck;
    openaiChat: ReadinessCheck;
    supabase: ReadinessCheck;
  };
  lastCheckedAt: string;
};

const HEALTH_CACHE_TTL_MS = 45_000;
let cachedResult: { expiresAt: number; payload: ReadinessPayload } | null = null;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

async function runOpenAiProbe(apiKey: string | undefined): Promise<ReadinessCheck> {
  if (!apiKey) {
    return { status: 'skip', latencyMs: 0, error: 'Missing OPENAI_API_KEY.' };
  }

  const started = Date.now();
  try {
    const response = await withTimeout(
      fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: 'health-check',
        }),
      }),
      3500
    );

    if (!response.ok) {
      const body = await response.text();
      return {
        status: 'fail',
        latencyMs: Date.now() - started,
        error: `OpenAI probe failed (${response.status}): ${body.slice(0, 160)}`,
      };
    }

    return { status: 'pass', latencyMs: Date.now() - started };
  } catch (error) {
    return {
      status: 'fail',
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runOpenAiChatProbe(apiKey: string | undefined): Promise<ReadinessCheck> {
  if (!apiKey) {
    return { status: 'skip', latencyMs: 0, error: 'Missing OPENAI_API_KEY.' };
  }

  const started = Date.now();
  try {
    const response = await withTimeout(
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'health-check' }],
          max_tokens: 4,
          temperature: 0,
        }),
      }),
      3500
    );

    if (!response.ok) {
      const body = await response.text();
      return {
        status: 'fail',
        latencyMs: Date.now() - started,
        error: `OpenAI chat probe failed (${response.status}): ${body.slice(0, 160)}`,
      };
    }

    return { status: 'pass', latencyMs: Date.now() - started };
  } catch (error) {
    return {
      status: 'fail',
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runSupabaseProbe(url: string | undefined, anonKey: string | undefined): Promise<ReadinessCheck> {
  if (!url || !anonKey) {
    return { status: 'skip', latencyMs: 0, error: 'Missing Supabase configuration.' };
  }

  const started = Date.now();
  try {
    const response = await withTimeout(
      fetch(`${url}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }),
      2500
    );

    // 200/401/404 all indicate the service is reachable over network.
    if ([200, 401, 404].includes(response.status)) {
      return { status: 'pass', latencyMs: Date.now() - started };
    }

    return {
      status: 'fail',
      latencyMs: Date.now() - started,
      error: `Supabase probe failed with status ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'fail',
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET() {
  const now = Date.now();
  if (cachedResult && cachedResult.expiresAt > now) {
    return NextResponse.json(cachedResult.payload, { status: 200 });
  }

  const openAiEmbeddingCheck = await runOpenAiProbe(process.env.OPENAI_API_KEY);
  const openAiChatCheck = await runOpenAiChatProbe(process.env.OPENAI_API_KEY);
  const supabaseCheck = await runSupabaseProbe(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let status: ReadinessStatus = 'online';
  let reason = 'AI memory assistant is ready.';

  if (
    openAiEmbeddingCheck.status === 'skip' ||
    openAiEmbeddingCheck.status === 'fail' ||
    openAiChatCheck.status === 'skip' ||
    openAiChatCheck.status === 'fail'
  ) {
    status = 'offline';
    reason =
      openAiEmbeddingCheck.error ||
      openAiChatCheck.error ||
      'OpenAI provider is unavailable.';
  } else if (supabaseCheck.status === 'skip' || supabaseCheck.status === 'fail') {
    status = 'degraded';
    reason = supabaseCheck.error || 'Supabase is unavailable.';
  }

  const payload: ReadinessPayload = {
    status,
    provider: 'OpenAI',
    model: 'gpt-4o',
    reason,
    checks: {
      openaiEmbeddings: openAiEmbeddingCheck,
      openaiChat: openAiChatCheck,
      supabase: supabaseCheck,
    },
    lastCheckedAt: new Date().toISOString(),
  };

  cachedResult = {
    payload,
    expiresAt: now + HEALTH_CACHE_TTL_MS,
  };

  return NextResponse.json(payload, { status: 200 });
}
