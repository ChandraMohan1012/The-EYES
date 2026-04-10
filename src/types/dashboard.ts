
export interface FlaggedItem {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  platform: string;
  date: string;
  content: string;
  snippet?: string; // Support for short previews
  reason?: string;  // Support for audit reasons
}

export interface ComparisonRow {
  eyes: string;
  recruiter: string;
}

export interface AuditSummary {
  totalMemories: number;
  overallRisk: "HIGH" | "MEDIUM" | "LOW";
  riskCounts: {
    high: number;
    med: number;
    low: number;
  };
  flaggedItems: FlaggedItem[];
  comparisonData: ComparisonRow[];
}

export interface PlatformStatus {
  id: string;
  name: string;
  connected: boolean;
  status: 'idle' | 'connecting' | 'authenticating' | 'syncing' | 'connected' | 'error';
}

export interface FeedItem {
  id: string;
  platform: string;
  title: string | null;
  content: string | null;
  timestamp: string | null;
  author: string | null;
}


export interface ChatRequest {
  prompt: string;
}

export interface ChatResponse {
  reply: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
}
