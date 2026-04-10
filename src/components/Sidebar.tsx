'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

interface Platform {
  id: 'reddit' | 'gmail' | 'github' | 'notion' | 'google-calendar';
  name: string;
  icon: React.ReactNode;
  items: number;
  timeAgo: string;
  connectionType: 'OAuth';
  requiredScopes: string[];
  optional: boolean;
  deferred: boolean;
  configured: boolean;
  missingEnv: string[];
  connected: boolean;
  status: 'idle' | 'connecting' | 'authenticating' | 'syncing' | 'connected' | 'error';
}

type PlatformReadinessApi = Omit<Platform, 'icon' | 'items' | 'timeAgo'> & {
  totalItems?: number;
  lastSyncAt?: string | null;
};

type PlatformReadinessPayload = {
  platforms?: PlatformReadinessApi[];
};

const formatRelativeTime = (iso: string | null | undefined) => {
  if (!iso) return 'Not connected';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'just now';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const isTransientFetchInterruption = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();

  return (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('the user aborted a request')
  );
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const connectedPlatforms = useMemo(() => {
    return platforms.filter(p => p.connected);
  }, [platforms]);

  const coverageScore = useMemo(() => {
    if (connectedPlatforms.length === 0) return 0;
    const readyCount = platforms.filter(p => p.connected && p.status === 'connected').length;
    return Math.round((readyCount / connectedPlatforms.length) * 100);
  }, [platforms, connectedPlatforms.length]);

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (coverageScore / 100) * circumference;

  useEffect(() => {
    let active = true;
    let transientWarned = false;

    const loadReadiness = async () => {
      try {
        const response = await fetch('/api/platform-readiness', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = (await response.json()) as PlatformReadinessPayload;
        if (!active) return;

        const uiPlatforms: Platform[] = (payload.platforms ?? []).map((p) => ({
          ...p,
          icon: p.id === 'reddit' ? <RedditIconOfficial /> : 
                p.id === 'github' ? <GitHubIconOfficial /> : 
                p.id === 'gmail' ? <GmailIconOfficial /> : 
                p.id === 'notion' ? <NotionIconOfficial /> :
                p.id === 'google-calendar' ? <CalendarIconOfficial /> : <GenericIcon />,
          items: p.totalItems || 0,
          timeAgo: p.connected ? formatRelativeTime(p.lastSyncAt) : 'Not connected'
        }));
        setPlatforms(uiPlatforms);
        transientWarned = false;
      } catch (err) {
        if (!active) return;
        if (isTransientFetchInterruption(err)) {
          if (!transientWarned) {
            console.warn('Readiness request was temporarily interrupted. Retrying automatically.');
            transientWarned = true;
          }
          return;
        }
        console.error('Failed to load readiness:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadReadiness();
    const intervalId = setInterval(loadReadiness, 10000);
    return () => { active = false; clearInterval(intervalId); };
  }, []);

  return (
    <aside className={styles.sidebar}>
      <button className={styles.newSearchBtn} onClick={() => router.push('/?view=connectors')}>
        <PlusIcon />
        <span>New Search</span>
      </button>

      <div className={styles.scrollArea}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>CONNECTED</h3>
          <div className={styles.itemList}>
            {isLoading ? (
               <div className={styles.sidebarLoadingPlaceholder}>
                  <div className={styles.pulseBar} />
                  <div className={styles.pulseBar} style={{ width: '80%' }} />
                  <div className={styles.pulseBar} style={{ width: '60%' }} />
               </div>
            ) : connectedPlatforms.length > 0 ? (
              connectedPlatforms.map((platform) => (
                <div key={platform.id} className={`${styles.item} ${pathname?.includes(platform.id) ? styles.itemActive : ''}`} onClick={() => router.push(`/connect/${platform.id}`)}>
                  <div className={styles.itemIcon}>{platform.icon}</div>
                  <div className={styles.itemMain}>
                    <span className={styles.itemLabel}>{platform.name}</span>
                    <span className={styles.itemCount}>{platform.items > 0 ? (platform.items > 999 ? `${(platform.items/1000).toFixed(1)}k` : platform.items) : '0'}</span>
                  </div>
                  <div className={`${styles.statusDot} ${styles.statusOnline}`} />
                </div>
              ))
            ) : (
              <div className={styles.emptySidebar}>
                 <span>No platforms active.</span>
                 <p onClick={() => router.push('/?view=connectors')}>Connect now →</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={`${styles.gaugeSection} ${styles.gaugeSectionClickable}`} onClick={() => router.push('/?view=readiness')}>
          <div className={styles.gaugeHeader}>
             <span className={styles.gaugeIcon}><EyeIconSmall /></span>
             <span className={styles.gaugeTitle}>CONNECTOR READINESS</span>
          </div>
          <div className={styles.gaugeWrapper}>
            <div className={styles.gaugeMini}>
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent-purple)" strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 50 50)" />
                <text x="50" y="58" textAnchor="middle" className={styles.scoreText}>{coverageScore}%</text>
              </svg>
            </div>
            <div className={styles.gaugeInfo}>
               <div className={styles.gaugeActiveCount}>
                 {connectedPlatforms.length > 0 
                   ? `${platforms.filter(p => p.connected && p.status === 'connected').length}/${connectedPlatforms.length} Platforms`
                   : '0/0 Platforms'
                 }
               </div>
               <div className={styles.gaugeReliability}>Reliability: <span className={styles.highText}>High</span></div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// OFFICIAL BRAND ICONS
function RedditIconOfficial() { return <svg width="20" height="20" viewBox="0 0 256 256"><circle cx="128" cy="128" r="128" fill="#ff4500"/><path fill="#fff" d="M213.15 129.22c0-10.376-8.391-18.617-18.617-18.617a18.74 18.74 0 0 0-12.97 5.189c-12.818-9.157-30.368-15.107-49.9-15.87l8.544-39.981l27.773 5.95c.307 7.02 6.104 12.667 13.278 12.667c7.324 0 13.275-5.95 13.275-13.278c0-7.324-5.95-13.275-13.275-13.275c-5.188 0-9.768 3.052-11.904 7.478l-30.976-6.562c-.916-.154-1.832 0-2.443.458c-.763.458-1.22 1.22-1.371 2.136l-9.464 44.558c-19.837.612-37.692 6.562-50.662 15.872a18.74 18.74 0 0 0-12.971-5.188c-10.377 0-18.617 8.391-18.617 18.617c0 7.629 4.577 14.037 10.988 16.939a33.6 33.6 0 0 0-.458 5.646c0 28.686 33.42 52.036 74.621 52.036c41.202 0 74.622-23.196 74.622-52.036a35 35 0 0 0-.458-5.646c6.408-2.902 10.985-9.464 10.985-17.093M85.272 142.495c0-7.324 5.95-13.275 13.278-13.275c7.324 0 13.275 5.95 13.275 13.275s-5.95 13.278-13.275 13.278c-7.327.15-13.278-5.953-13.278-13.278m74.317 35.251c-9.156 9.157-26.553 9.768-31.588 9.768c-5.188 0-22.584-.765-31.59-9.768c-1.371-1.373-1.371-3.51 0-4.883c1.374-1.371 3.51-1.371 4.884 0c5.8 5.8 18.008 7.782 26.706 7.782s21.058-1.983 26.704-7.782c1.374-1.371 3.51-1.371 4.884 0c1.22 1.373 1.22 3.51 0 4.883m-2.443-21.822c-7.325 0-13.275-5.95-13.275-13.275s5.95-13.275 13.275-13.275c7.327 0 13.277 5.95 13.277 13.275c0 7.17-5.95 13.275-13.277 13.275"/></svg>; }
function GitHubIconOfficial() { return <svg width="20" height="20" viewBox="0 0 256 250"><path fill="#fff" d="M128.001 0C57.317 0 0 57.307 0 128.001c0 56.554 36.676 104.535 87.535 121.46c6.397 1.185 8.746-2.777 8.746-6.158c0-3.052-.12-13.135-.174-23.83c-35.61 7.742-43.124-15.103-43.124-15.103c-5.823-14.795-14.213-18.73-14.213-18.73c-11.613-7.944.876-7.78.876-7.78c12.853.902 19.621 13.19 19.621 13.19c11.417 19.568 29.945 13.911 37.249 10.64c1.149-8.272 4.466-13.92 8.127-17.116c-28.431-3.236-58.318-14.212-58.318-63.258c0-13.975 5-25.394 13.188-34.358c-1.329-3.224-5.71-16.242 1.24-33.874c0 0 10.749-3.44 35.21 13.121c10.21-2.836 21.16-4.258 32.038-4.307c10.878.049 21.837 1.47 32.066 4.307c24.431-16.56 35.165-13.12 35.165-13.12c6.967 17.63 2.584 30.65 1.255 33.873c8.207 8.964 13.173 20.383 13.173 34.358c0 49.163-29.944 59.988-58.447 63.157c4.591 3.972 8.682 11.762 8.682 23.704c0 17.126-.148 30.91-.148 35.126c0 3.407 2.304 7.398 8.792 6.14C219.37 232.5 256 184.537 256 128.002C256 57.307 198.691 0 128.001 0c.93.418 1.46 1.293 1.139 1.931"/></svg>; }
function GmailIconOfficial() { return <svg width="20" height="20" viewBox="0 0 256 193"><path fill="#4285f4" d="M58.182 192.05V93.14L27.507 65.077L0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455z"/><path fill="#34a853" d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455V49.505l-31.156 17.837l-27.026 25.798z"/><path fill="#ea4335" d="m58.182 93.14l-4.174-38.647l4.174-36.989L128 69.868l69.818-52.364l4.669 34.992l-4.669 40.644L128 145.504z"/><path fill="#fbbc04" d="M197.818 17.504V93.14L256 49.504V26.231c0-21.585-24.64-33.89-41.89-20.945z"/><path fill="#c5221f" d="m0 49.504l26.759 20.07L58.182 93.14V17.504L41.89 5.286C24.61-7.66 0 4.646 0 26.23z"/></svg>; }
function CalendarIconOfficial() { return <svg width="20" height="20" viewBox="0 0 256 256"><path fill="#fff" d="M195.368 60.632H60.632v134.736h134.736z"/><path fill="#ea4335" d="M195.368 256L256 195.368l-30.316-5.172l-30.316 5.172v65.659"/><path fill="#188038" d="M0 195.368v40.421C0 246.956 9.044 256 20.211 256h40.422v-60.632z"/><path fill="#1967d2" d="M256 60.632V20.21C256 9.044 246.956 0 235.789 0h-40.421v60.632z"/><path fill="#fbbc04" d="M60.632 0H20.21C9.044 0 0 9.044 0 20.211v40.421h60.632z"/><path fill="#4285f4" d="M195.368 60.632V195.368H60.632V60.632z"/><path d="M156.417 101.436c0-1.898-.441-3.324-1.325-4.275c-.883-1.026-2.14-1.539-3.77-1.539s-2.887.513-3.771 1.539c-.883.951-1.325 2.377-1.325 4.275v34.542c0 1.898.442 3.324 1.325 4.276c.884 1.026 2.14 1.538 3.771 1.538s2.887-.512 3.77-1.538c.884-.951 1.325-2.378 1.325-4.276zM114.673 135.084c0 1.258.261 2.214.783 2.87c.523.655 1.257.983 2.204.983s1.681-.328 2.204-.983s.783-1.612.783-2.87V102.32c0-1.258-.261-2.214-.783-2.87c-.523-.656-1.257-.984-2.204-.984s-1.681.328-2.204.984s-.783 1.612-.783 2.87z" fill="#fff"/></svg>; }
function NotionIconOfficial() { return <svg width="20" height="20" viewBox="0 0 256 268"><path fill="#fff" d="M16.092 11.538L164.09.608c18.179-1.56 22.85-.508 34.28 7.801l47.243 33.282C253.406 47.414 256 48.975 256 55.207v182.527c0 11.439-4.155 18.205-18.696 19.24L65.44 267.378c-10.913.517-16.11-1.043-21.825-8.327L8.826 213.814C2.586 205.487 0 199.254 0 191.97V29.726c0-9.352 4.155-17.153 16.092-18.188"/><path d="M47.794 24.363l135.297-9.528c4.675-.312 6.223.738 8.309 3.125l45.69 54.102c2.076 2.083 3.114 4.678 3.114 8.323v146.439c0 4.157-1.558 7.282-5.713 7.803l-132.68 8.847c-5.722.52-8.319-1.041-10.916-4.162L41.564 186.1c-2.076-3.123-3.114-5.204-3.114-10.404V32.167c0-4.682 2.076-7.287 9.344-7.804m21.815 152.05h3.114V72.937l-15.06 9.363V155.15c0 7.28 5.713 14.564 11.946 21.263m118.675 6.764c4.156-3.12 7.272-8.843 7.272-13.003V65.13l-13.504-9.363l-45.185 71.01l-24.928-40.046l-41.028 10.404v93.376c0 6.241-3.636 10.404-9.344 14.044s-8.828 2.597-8.828 6.76c0 2.08.519 4.161 2.077 5.723l8.828 6.763c3.635 3.12 7.272-2.599 15.06 2.08l109.58-7.803"/><path d="M129.278 143.666l44.664-71.012l6.233 4.161v112.357h-3.114l-4.155.52v-91.037L152.128 131.7z"/></svg>; }
function GenericIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>; }
function PlusIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>; }
function EyeIconSmall() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
