'use client';

import React from 'react';
import styles from '../MainContent.module.css';
import type { AuditSummary } from '@/types/dashboard';
import { ShieldIcon } from '../icons/PlatformIcons';

interface AuditViewProps {
  onBack: () => void;
  summary: AuditSummary;
}

export function AuditView({ onBack, summary }: AuditViewProps) {
  return (
    <div className={styles.soloView}>
       <button className={styles.backBtn} onClick={onBack}>← Back</button>
       <h1 className={styles.soloTitle}>REPUTATION AUDIT</h1>
       
       <div className={styles.auditGrid}>
          <div className={styles.auditStatsRow}>
             <div className={styles.auditHeroCard}>
                <div className={styles.heroBg} />
                <div className={styles.heroContent}>
                   <div className={styles.heroLabel}>OVERALL RISK</div>
                   <div className={`${styles.heroValue} ${summary.overallRisk === 'HIGH' ? styles.valueHigh : styles.valueLow}`}>
                      {summary.overallRisk}
                   </div>
                   <div className={styles.heroSubText}>Based on {summary.totalMemories.toLocaleString()} scanned memories</div>
                </div>
             </div>
             
             <div className={styles.auditMeterGroup}>
                <div className={styles.meterItem}>
                   <div className={styles.meterInfo}><span>HIGH RISK</span><span>{summary.riskCounts.high}</span></div>
                   <div className={styles.meterBar}><div className={styles.meterFillRed} style={{ width: `${(summary.riskCounts.high / (summary.totalMemories || 1)) * 100}%` }} /></div>
                </div>
                <div className={styles.meterItem}>
                   <div className={styles.meterInfo}><span>MEDIUM RISK</span><span>{summary.riskCounts.med}</span></div>
                   <div className={styles.meterBar}><div className={styles.meterFillYellow} style={{ width: `${(summary.riskCounts.med / (summary.totalMemories || 1)) * 100}%` }} /></div>
                </div>
                <div className={styles.meterItem}>
                   <div className={styles.meterInfo}><span>LOW RISK</span><span>{summary.riskCounts.low}</span></div>
                   <div className={styles.meterBar}><div className={styles.meterFillGreen} style={{ width: `${(summary.riskCounts.low / (summary.totalMemories || 1)) * 100}%` }} /></div>
                </div>
             </div>
          </div>

          <div className={styles.flaggedSection}>
             <h2 className={styles.sectionHeader}>FLAGGED ITEMS REQUIRING ATTENTION</h2>
             <div className={styles.flaggedList}>
                {summary.flaggedItems.map((item, idx) => (
                   <div key={idx} className={styles.flaggedCard}>
                      <div className={styles.flaggedIndicator} />
                      <div className={styles.flaggedMain}>
                         <div className={styles.flaggedHeader}>
                            <span className={styles.flaggedPlatform}>{item.platform.toUpperCase()}</span>
                            <span className={styles.flaggedDate}>{new Date(item.date).toLocaleDateString()}</span>
                         </div>
                         <p className={styles.flaggedContent}>&quot;{item.snippet}&quot;</p>
                         <div className={styles.flaggedReason}>Reason: {item.reason}</div>
                      </div>
                      <div className={styles.flaggedAction}>
                         <button className={styles.remediateBtn}>REMEDIATE</button>
                      </div>
                   </div>
                ))}
                {summary.flaggedItems.length === 0 && (
                   <div className={styles.auditCleanState}>
                      <ShieldIcon />
                      <span>No critical risks identified in current neural index.</span>
                   </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
}
