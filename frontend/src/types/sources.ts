export type ResearchClassification =
  | 'live_research'
  | 'uploaded_sources'
  | 'live_and_uploaded'
  | 'general_reasoning'
  | 'provided_evidence'
  | string;

export type ResearchEventStatus = 'pending' | 'active' | 'completed' | 'failed';

export interface ResearchEvent {
  id: string;
  stage: string;
  status: ResearchEventStatus | string;
  message: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

export interface SourceRecord {
  sourceId: string;
  citationNumber: number;
  title: string;
  publisher: string;
  domain: string;
  url: string;
  sourceType: string;
  publicationDate?: string | null;
  lastUpdatedDate?: string | null;
  retrievedAt: string;
  author?: string | null;
  reliabilityLevel: string;
  relevanceScore: number;
  verificationStatus: string;
  purpose: string;
  evidenceSnippets: string[];
  agentIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface EvidenceClaim {
  claim: string;
  sourceIds: string[];
  confidence?: number | string;
  evidenceType?: string;
  retrievedAt?: string;
}

export interface ResearchResult {
  success: boolean;
  classification: {
    classification: ResearchClassification;
    liveResearchRequired?: boolean;
    uploadedSourcesRequired?: boolean;
    generalReasoning?: boolean;
    reason?: string;
  };
  events: ResearchEvent[];
  sources: SourceRecord[];
  evidencePack: string;
  researchFailed: boolean;
  researchError?: string | null;
  provider?: string | null;
  generatedWithoutLiveResearch?: boolean;
  retrievedAt?: string;
}
