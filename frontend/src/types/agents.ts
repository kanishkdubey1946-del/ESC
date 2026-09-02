import type { EvidenceClaim, ResearchEvent, SourceRecord } from './sources';

export type AgentStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed';

export interface AgentResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  provider?: string;
  timestamp: string;
  sources?: SourceRecord[];
  claims?: EvidenceClaim[];
  researchEvents?: ResearchEvent[];
  researchClassification?: string;
  researchFailed?: boolean;
  researchError?: string;
  generatedWithoutLiveResearch?: boolean;
  evidencePack?: string;
  retrievedAt?: string;
}

// Common Sub-types
export interface Deliverable {
  filename: string;
  content: string;
}

export interface AIPrompt {
  tool: string;
  prompt: string;
}

// 1. Citizen Insights Agent (was Research Agent)
export interface RecurringTheme {
  theme: string;
  frequency: string;
  affectedArea: string;
}

export interface CitizenInsightsOutput {
  executiveSummary: string;
  issueSeverity: string;
  urgencyLevel: 'Low' | 'Medium' | 'High';
  citizenSatisfaction: number;
  topThemes: RecurringTheme[];
  complaintCategories?: { label: string; value: number }[];
  recurringIssues?: string[];
  affectedDemographics?: string[];
  keyRisks?: string[];
  detailedReport?: string;
  deliverables?: Deliverable[];
}

// 2. Development Planning Agent (was Strategy Agent)
export interface DevelopmentPlanningOutput {
  districtName: string;
  visionStatement: string;
  keyObjective: string;
  infrastructureGaps: string[];
  proposedProjects: string[];
  implementationChannels: string[];
  budgetAllocation: string[];
  keyMilestones?: string[];
  priorityActions?: string[];
  detailedReport?: string;
  deliverables?: Deliverable[];
}

// 3. Communication Agent (was Content Agent)
export interface CommunicationEntry {
  title: string;
  body: string;
  audience: string;
  language: string;
  urgencyTag?: string;
  tags?: string[];
  charCount?: number;
  score?: number;
  keyMessage?: string;
  actionRequired?: string;
  formalVersion?: string;
  simplifiedVersion?: string;
  hindiTranslation?: string;
  regionalTranslation?: string;
}

export interface ChannelContent {
  channel: string;
  entries: CommunicationEntry[];
}

export interface CommunicationOutput {
  executiveSummary: string;
  channels: ChannelContent[];
  detailedReport?: string;
  deliverables?: Deliverable[];
}

// 4. Public Data Intelligence Agent (was Development Agent)
export interface DataSourceItem {
  name: string;
  description: string;
  url?: string;
}

export interface PublicDataIntelligenceOutput {
  dataOverview: string;
  infrastructureAnalysis: string;
  dataSources: DataSourceItem[];
  demographicBreakdown?: string;
  schoolsAnalysis?: string;
  roadsAnalysis?: string;
  hospitalsAnalysis?: string;
  populationInsights?: string;
  waterSupplyAnalysis?: string;
  electricityAnalysis?: string;
  geoMappingData?: string;
  sanitationAnalysis?: string;
  connectivityAnalysis?: string;
  budgetUtilization?: string;
  governmentSchemes?: string;
  detailedReport?: string;
  deliverables?: Deliverable[];
}

// 5. Recommendation Agent (was Pitch Agent)
export interface Recommendation {
  projectName: string;
  priorityScore: string;
  budgetEstimate?: string;
  budgetEstimateLabel?: string;
  impactSummary: string;
  implementationNotes: string;
  urgencyLabel?: string;
}

export interface RecommendationOutput {
  executiveSummary: string;
  recommendations: Recommendation[];
  detailedReport?: string;
  deliverables?: Deliverable[];
}

// Union Type
export type AgentOutputData = 
  | CitizenInsightsOutput 
  | DevelopmentPlanningOutput 
  | CommunicationOutput 
  | PublicDataIntelligenceOutput 
  | RecommendationOutput;
