import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const cookieStore = await cookies();
  const savedState = cookieStore.get('slack_oauth_state')?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL('/connect/slack?oauth=error&reason=invalid_state', siteUrl));
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/connect/slack?oauth=error&reason=missing_config', siteUrl));
  }

  try {
    const callbackUrl = new URL('/api/connect/slack/callback', siteUrl);
    
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl.toString(),
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error('Slack Token Error:', data);
      return NextResponse.redirect(new URL('/connect/slack?oauth=error&reason=token_exchange_failed', siteUrl));
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', siteUrl));
    }

    // Note: Slack returns user tokens in authed_user block
    const userToken = data.authed_user.access_token;
    const refreshToken = data.authed_user.refresh_token || null;
    const expiresAt = data.authed_user.expires_in 
      ? new Date(Date.now() + data.authed_user.expires_in * 1000).toISOString()
      : null;

    const { error: tokenError } = await supabase
      .from('oauth_tokens')
      .upsert({
        user_id: user.id,
        platform: 'slack',
        access_token: userToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        scope: data.authed_user.scope,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,platform' });

    if (tokenError) {
      console.error('Database Error:', tokenError);
      return NextResponse.redirect(new URL('/connect/slack?oauth=error&reason=db_save_failed', siteUrl));
    }

    // Initialize sync status
    await supabase
      .from('sync_status')
      .upsert({
        user_id: user.id,
        platform: 'slack',
        status: 'idle',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,platform' });

    return NextResponse.redirect(new URL('/connect/slack?oauth=success', siteUrl));
  } catch (err) {
    console.error('Slack Auth Error:', err);
    return NextResponse.redirect(new URL('/connect/slack?oauth=error&reason=server_error', siteUrl));
  }
}
