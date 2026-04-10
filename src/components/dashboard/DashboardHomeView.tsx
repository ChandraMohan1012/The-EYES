'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from '../MainContent.module.css';
import { ALL_POSSIBLE_PLATFORMS } from '@/config/platforms';
import type { PlatformStatus } from '@/types/dashboard';

interface DashboardHomeViewProps {
  platforms: PlatformStatus[];
}

export function DashboardHomeView({ platforms }: DashboardHomeViewProps) {
  const router = useRouter();

  const connectedCount = platforms.filter(p => p.connected).length;
  const remainingPlatforms = ALL_POSSIBLE_PLATFORMS.filter(p => !platforms.find(ap => ap.id === p.id)?.connected);

  return (
    <div className={styles.readinessContainer}>
      <div className={styles.readinessSection}>
        <h2 className={styles.subHeader}>● ACTIVE NEURAL LINKS ({connectedCount})</h2>
        <div className={styles.readinessGrid}>
          {platforms.filter(p => p.connected && p.status === 'syncing').map(p => (
            <div key={p.id} className={styles.readinessCard} onClick={() => router.push(`/connect/${p.id}`)}>
              <div className={styles.readinessIcon}>{ALL_POSSIBLE_PLATFORMS.find(ap => ap.id === p.id)?.icon}</div>
              <div className={styles.readinessInfo}>
                <strong>{p.name}</strong>
                <span className={styles.syncStatusText}>Synchronizing Neural Path...</span>
              </div>
              <div className={styles.syncPulse} />
            </div>
          ))}
          
          {platforms.filter(p => p.connected && p.status === 'connected').map(p => (
            <div key={p.id} className={styles.readinessCard} onClick={() => router.push(`/connect/${p.id}`)}>
              <div className={styles.readinessIcon}>{ALL_POSSIBLE_PLATFORMS.find(ap => ap.id === p.id)?.icon}</div>
              <div className={styles.readinessInfo}>
                <strong>{p.name}</strong>
                <span className={styles.readyStatusText}>Neural Matrix Optimized</span>
              </div>
            </div>
          ))}
          
          {connectedCount === 0 && (
            <div className={styles.emptyState}>No platforms are currently connected.</div>
          )}
        </div>
      </div>

      <div className={styles.readinessSection}>
        <h2 className={styles.subHeader}>● AVAILABLE FOR INTAKE</h2>
        <div className={styles.readinessGrid}>
          {remainingPlatforms.map(p => (
            <div key={p.id} className={styles.readinessCard} onClick={() => router.push(`/connect/${p.id}`)}>
              <div className={styles.readinessIcon}>{p.icon}</div>
              <div className={styles.readinessInfo}>
                <strong>{p.name}</strong>
                <span className={styles.availStatusText}>Ready for Discovery</span>
              </div>
              <span className={styles.addIndicator}>+</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
