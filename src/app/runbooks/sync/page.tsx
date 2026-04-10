import styles from './page.module.css';

export const metadata = {
  title: 'Sync Reliability Runbook',
};

export default function SyncRunbookPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Sync Reliability Runbook</h1>
      <p className={styles.subtitle}>
        Operational checklist for scheduler degradation, retry queue growth, and dead-letter remediation.
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Verify Current Health</h2>
        <ol>
          <li>Open Audit tab and review Sync Reliability metrics (runs, failures, retries, dead letters).</li>
          <li>Download 30-day CSV from the dashboard for deeper analysis.</li>
          <li>Confirm if degradation is global or isolated to one provider.</li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Retry Queue Triage</h2>
        <ol>
          <li>Check pending retry count and next attempt timestamp.</li>
          <li>If pending count is climbing, inspect provider API availability and OAuth refresh failures.</li>
          <li>Run retry remediation endpoint during low-traffic windows after upstream recovery.</li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Dead-Letter Handling</h2>
        <ol>
          <li>Review dead-letter spikes in analytics and identify repeated platform failures.</li>
          <li>Confirm credentials/scopes for impacted connector(s).</li>
          <li>Backfill affected time windows after remediation is complete.</li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. Escalation Playbook</h2>
        <ol>
          <li>Open escalation events in Audit and verify owner routing.</li>
          <li>For critical alerts, notify on-call and post status update with ETA.</li>
          <li>After recovery, document root cause and adjust thresholds/retry policy if needed.</li>
        </ol>
      </section>
    </main>
  );
}
