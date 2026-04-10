import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { upsertSyncStatusSafely } from '@/utils/supabase/upsert';

const SYNC_TIMEOUT_MS = 15000;

type SyncOutcome = {
  platform: string;
  routePlatform: string;
  success: boolean;
  status: number | null;
  durationMs: number;
  data?: unknown;
  error?: string;
};

export function toSyncRoutePlatform(platform: string) {
  if (platform === 'google_calendar') return 'google-calendar';
  return platform.replace(/_/g, '-');
}

function isBackgroundMode(request: Request) {
  const background = new URL(request.url).searchParams.get('background');
  if (!background) return false;
  return ['1', 'true', 'yes'].includes(background.toLowerCase());
}

function cookieHeaderValue(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
}

function resolveBaseUrl(request: Request) {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

function parseResponsePayload(rawBody: string) {
  if (!rawBody) return null;

  try {
    return JSON.parse(rawBody);
  } catch {
    return { message: rawBody.slice(0, 300) };
  }
}

/**
 * Unified entry point to sync all connected platforms for the current user.
 * This can be triggered from the dashboard or a client-side timer.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all connected platforms with valid tokens
    const { data: tokens } = await supabase
      .from('oauth_tokens')
      .select('platform')
      .eq('user_id', user.id);

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: 'No connected platforms found.', results: [] });
    }

    const appBaseUrl = resolveBaseUrl(request);
    const cookieStore = await cookies();
    const cookieHeader = cookieHeaderValue(cookieStore);

    const runPlatformSync = async (platform: string): Promise<SyncOutcome> => {
      const routePlatform = toSyncRoutePlatform(platform);
      const startedAt = Date.now();

      await upsertSyncStatusSafely(supabase, {
        user_id: user.id,
        platform,
        status: 'syncing',
        sync_progress: 1,
        error_message: null,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

      try {
        const response = await fetch(`${appBaseUrl}/api/sync/${routePlatform}`, {
          method: 'POST',
          headers: {
            Cookie: cookieHeader,
          },
          cache: 'no-store',
          signal: controller.signal,
        });

        const rawBody = await response.text();
        const data = parseResponsePayload(rawBody);

        if (!response.ok) {
          const message = `Provider sync failed (${response.status})`;
          await upsertSyncStatusSafely(supabase, {
            user_id: user.id,
            platform,
            status: 'error',
            sync_progress: 0,
            error_message: message,
          });

          return {
            platform,
            routePlatform,
            success: false,
            status: response.status,
            durationMs: Date.now() - startedAt,
            data,
            error: message,
          };
        }

        return {
          platform,
          routePlatform,
          success: true,
          status: response.status,
          durationMs: Date.now() - startedAt,
          data,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await upsertSyncStatusSafely(supabase, {
          user_id: user.id,
          platform,
          status: 'error',
          sync_progress: 0,
          error_message: message.slice(0, 250),
        });

        return {
          platform,
          routePlatform,
          success: false,
          status: null,
          durationMs: Date.now() - startedAt,
          error: message,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const backgroundMode = isBackgroundMode(request);

    if (backgroundMode) {
      void Promise.allSettled(tokens.map((token) => runPlatformSync(token.platform))).then((settled) => {
        const fulfilled = settled.filter((item): item is PromiseFulfilledResult<SyncOutcome> => item.status === 'fulfilled');
        const successCount = fulfilled.filter((item) => item.value.success).length;
        const failedCount = fulfilled.length - successCount + (settled.length - fulfilled.length);
        console.log(
          `[Sync All] Background sync complete. user=${user.id} success=${successCount} failed=${failedCount}`
        );
      });

      return NextResponse.json(
        {
          accepted: true,
          mode: 'background',
          message: `Background sync launched for ${tokens.length} platforms.`,
          platforms: tokens.map((token) => token.platform),
        },
        { status: 202 }
      );
    }

    const results = await Promise.all(tokens.map((token) => runPlatformSync(token.platform)));
    const successCount = results.filter((result) => result.success).length;

    return NextResponse.json({
      accepted: true,
      mode: 'blocking',
      message: `Sync completed for ${results.length} platforms.`,
      successCount,
      failedCount: results.length - successCount,
      results,
    });
  } catch (err) {
    console.error('Unified Sync error:', err);
    return NextResponse.json({ error: 'Failed to initiate global sync.' }, { status: 500 });
  }
}

