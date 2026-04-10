import crypto from 'node:crypto';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

export async function GET() {
  const clientId = process.env.REDDIT_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(new URL('/connect/reddit?oauth=error&reason=missing_reddit_client_id', appBaseUrl()));
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.redirect(new URL('/login', appBaseUrl()));
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set('reddit_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });

  const callbackUrl = new URL('/api/connect/reddit/callback', appBaseUrl());
  const authUrl = new URL('https://www.reddit.com/api/v1/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('redirect_uri', callbackUrl.toString());
  authUrl.searchParams.set('duration', 'permanent');
  authUrl.searchParams.set('scope', 'identity history read mysubreddits');

  return NextResponse.redirect(authUrl);
}

