import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';
import { encryptToken } from '@/services/auth/tokens';

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/connect/reddit?oauth=error&reason=missing_reddit_env', appBaseUrl()));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/connect/reddit?oauth=error&reason=missing_code_or_state', appBaseUrl()));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get('reddit_oauth_state')?.value;

  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(new URL('/connect/reddit?oauth=error&reason=invalid_state', appBaseUrl()));
  }

  cookieStore.delete('reddit_oauth_state');

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.redirect(new URL('/login', appBaseUrl()));
  }

  const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'the-monitor/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: new URL('/api/connect/reddit/callback', appBaseUrl()).toString(),
    }),
    cache: 'no-store',
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL('/connect/reddit?oauth=error&reason=token_exchange_failed', appBaseUrl()));
  }

  const tokenBody = (await tokenResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    expires_in?: number;
    error?: string;
  };

  if (!tokenBody.access_token) {
    return NextResponse.redirect(
      new URL(`/connect/reddit?oauth=error&reason=${encodeURIComponent(tokenBody.error || 'no_access_token')}`, appBaseUrl())
    );
  }

  const now = new Date().toISOString();
  const expiresAt = tokenBody.expires_in
    ? new Date(Date.now() + tokenBody.expires_in * 1000).toISOString()
    : null;

  const [{ error: tokenSaveError }, { error: syncSaveError }] = await Promise.all([
    supabase.from('oauth_tokens').upsert({
      user_id: authData.user.id,
      platform: 'reddit',
      access_token: encryptToken(tokenBody.access_token),
      refresh_token: tokenBody.refresh_token ? encryptToken(tokenBody.refresh_token) : null,
      scope: tokenBody.scope || 'identity history read mysubreddits',
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
    }, { onConflict: 'user_id,platform' }),
    supabase.from('sync_status').upsert({
      user_id: authData.user.id,
      platform: 'reddit',
      status: 'authenticating',
      sync_progress: 5,
      total_items: 0,
      last_sync_at: null,
      next_sync_at: null,
      error_message: null,
    }, { onConflict: 'user_id,platform' }),
  ]);

  if (tokenSaveError || syncSaveError) {
    return NextResponse.redirect(new URL('/connect/reddit?oauth=error&reason=token_persist_failed', appBaseUrl()));
  }

  return NextResponse.redirect(new URL('/connect/reddit?oauth=success', appBaseUrl()));
}

