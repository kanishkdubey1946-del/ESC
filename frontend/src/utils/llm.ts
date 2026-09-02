import type { AgentResult } from '../types/agents';
import type { SourceRecord } from '../types/sources';
import type { WorkspaceDocument } from '../lib/workspaceMemory';
import { docsToUploads } from './research';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const MAX_RETRIES = 1;

type AgentDefinition = { role: string; instructions: string; requiredFields: string[]; temperature: number };

export const AGENT_DEFINITIONS: Record<string, AgentDefinition> = {
  research: {
    role: 'Research Agent',
    temperature: 0.25,
    requiredFields: [
      'researchObjective', 'executiveSummary', 'keyFindings', 'marketOrDomainAnalysis',
      'currentTrends', 'competitorOrAlternativeAnalysis', 'competitors', 'opportunities', 'risks',
      'dataLimitations', 'detailedReport', 'competitionLevel', 'competitionRationale',
      'opportunityScore', 'opportunityScoreNote', 'opportunityScoreFactors', 'researchConfidence',
      'researchConfidenceNote', 'riskScore', 'riskMethodology', 'riskFactors',
      'tam', 'sam', 'som', 'marketSizeNote', 'geographicScope',
      'evidenceStatus', 'sourcesUsed',
    ],
    instructions:
      'Produce evidence-grounded research ONLY from the EVIDENCE PACK and uploaded sources. '
      + 'Use inline citations [n] for every factual claim. '
      + 'Fields: researchObjective, executiveSummary, keyFindings (string array with [n]), '
      + 'marketOrDomainAnalysis, currentTrends, opportunities, risks, dataLimitations, detailedReport. '
      + 'competitionLevel: Low|Moderate|High|Very High only if evidence supports it; else omit and explain in competitionRationale. '
      + 'competitors: array of {name, location, strength, weakness, position, evidence} using ONLY real entities from evidence. '
      + 'opportunityScore: 0-100 COMET Opportunity Assessment ONLY if you can justify factors; set opportunityScoreNote to "Preliminary estimate" when evidence is thin; '
      + 'opportunityScoreFactors: [{factor, weight, score, evidence}]. Never invent market sizes. '
      + 'riskScore 0-100 (higher = more risk) only with riskMethodology and riskFactors; else omit. '
      + 'tam/sam/som: fill ONLY with values present in evidence (include units and year in string); otherwise leave empty string. '
      + 'marketSizeNote: explain data gaps. researchConfidence: High confidence|Moderate confidence|Limited evidence. '
      + 'geographicScope when known. Never invent statistics, competitors, URLs, or citations.',
  },
  strategy: {
    role: 'Strategy Agent',
    temperature: 0.3,
    requiredFields: [
      'strategicObjective', 'targetAudience', 'valueProposition', 'positioning', 'businessModel',
      'revenueOptions', 'revenueStreams', 'goToMarketStrategy', 'growthStrategy', 'executionRoadmap',
      'pricingStrategy', 'customerSegments', 'customerNeeds', 'keyActivities', 'keyResources',
      'keyPartnerships', 'costStructure', 'distributionChannels', 'risks', 'recommendations',
      'detailedReport', 'dataLimitations', 'evidenceStatus', 'sourcesUsed',
    ],
    instructions:
      'Create a context-specific strategy from the original challenge, prior research, and EVIDENCE PACK. '
      + 'Include strategicObjective, targetAudience/customerSegments, valueProposition, positioning, businessModel, '
      + 'revenueStreams/revenueOptions, goToMarketStrategy, growthStrategy, pricingStrategy, executionRoadmap, '
      + 'keyActivities, keyResources, keyPartnerships, costStructure, customerNeeds, risks, recommendations. '
      + 'Separate Evidence (with [n] citations) from Strategic Recommendations. '
      + 'Do not invent budgets, locations, or market figures. Label estimates as Estimate. Ground strategy in research evidence.',
  },
  content: {
    role: 'Communication Agent',
    temperature: 0.5,
    requiredFields: [
      'executiveSummary', 'channels', 'hooks', 'captions', 'hashtags', 'callsToAction',
      'contentIdeas', 'visualIdeas', 'detailedReport', 'dataLimitations', 'sourcesUsed',
    ],
    instructions:
      'Create platform-specific content grounded in verified business information only. '
      + 'channels: array of {channel: LinkedIn|Instagram|X|Facebook|YouTube|Blog|Newsletter, entries:[{title, body/caption, hook/trendingHook, contentType, tone, audience/targetAudience, cta/callToAction, hashtags[], keywords[], insight/contentInsight/whyItWorks, contentScore 0-100 only if you can justify it, visualIdea}]}. '
      + 'Keep hook, caption, CTA, and hashtags as separate fields — never merge hashtags into the caption body. '
      + 'Adapt tone/length/format per platform. Also provide top-level hooks, captions, hashtags, callsToAction, contentIdeas, visualIdeas arrays. '
      + 'Do not invent product features, testimonials, awards, partnerships, or statistics.',
  },
  development: {
    role: 'Development and Data Agent',
    temperature: 0.25,
    requiredFields: [
      'productRequirements', 'technicalArchitecture', 'recommendedStack', 'mvpFeatures',
      'developmentPhases', 'implementationRoadmap', 'dataOverview', 'infrastructureAnalysis',
      'dataSources', 'landingPageHtml', 'detailedReport', 'dataLimitations', 'sourcesUsed',
    ],
    instructions:
      'Produce productRequirements, technicalArchitecture, recommendedStack, mvpFeatures, developmentPhases, '
      + 'implementationRoadmap using official documentation from the EVIDENCE PACK when possible. '
      + 'Also fill dataOverview, infrastructureAnalysis, dataSources (name, description, optional url). '
      + 'If a simple marketing landing page is appropriate, put real complete HTML in landingPageHtml; otherwise leave empty. '
      + 'Never claim a full production app was generated when only a plan/spec exists. '
      + 'Never fabricate live datasets. Cite factual claims with [n].',
  },
  pitch: {
    role: 'Recommendation and Pitch Agent',
    temperature: 0.35,
    requiredFields: [
      'problem', 'solution', 'marketOpportunity', 'product', 'innovation', 'businessModel',
      'competitiveAdvantage', 'technicalArchitecture', 'impact', 'roadmap', 'ask',
      'executiveSummary', 'recommendations', 'detailedReport', 'dataLimitations', 'sourcesUsed',
    ],
    instructions:
      'Synthesize prior outputs into a pitch-ready recommendation using only evidenced facts. '
      + 'Include problem, solution, marketOpportunity, product, innovation, businessModel, '
      + 'competitiveAdvantage, technicalArchitecture, impact, roadmap, ask, plus recommendations '
      + '(projectName, priorityScore, impactSummary, implementationNotes). '
      + 'Do not add unsupported market statistics. State assumptions. Preserve citations.',
  },
  market: {
    role: 'Market Analyst',
    temperature: 0.25,
    requiredFields: [
      'executiveSummary', 'marketOrDomainAnalysis', 'competitors', 'competitionLevel', 'competitionRationale',
      'opportunityScore', 'opportunityScoreNote', 'tam', 'sam', 'som', 'marketSizeNote',
      'researchConfidence', 'detailedReport', 'dataLimitations', 'evidenceStatus', 'sourcesUsed',
    ],
    instructions:
      'Evaluate market size, competitors, and demand only from EVIDENCE PACK. Cite every factual claim. '
      + 'competitors: real entities only. tam/sam/som only if present in evidence; else empty with marketSizeNote. '
      + 'competitionLevel Low|Moderate|High|Very High only when justified. No invented TAM/SAM/SOM.',
  },
  finance: {
    role: 'Finance Analyst',
    temperature: 0.3,
    requiredFields: [
      'executiveSummary', 'financialOverview', 'revenue', 'expenses', 'grossProfit', 'netProfit',
      'grossMargin', 'burnRate', 'runway', 'cac', 'ltv', 'breakEven', 'roi', 'unitEconomics',
      'financialRiskScore', 'riskMethodology', 'riskFactors', 'recommendations',
      'detailedReport', 'dataLimitations', 'sourcesUsed',
    ],
    instructions:
      'Model costs and revenue ONLY from user inputs and EVIDENCE PACK. Label every figure Actual|Estimate|Projection. '
      + 'Include when possible: initialInvestment, operatingExpenses, revenueModel, monthlyProjections, annualProjections, cashFlow/cashFlowAnalysis, breakEven, assumptions, financialRisks, costBreakdown. '
      + 'metricProvenance map: key=metric name, value=verified|user|estimate|assumption. Never present an estimate as verified. '
      + 'If a metric cannot be calculated, leave it empty and list missing inputs in dataLimitations. '
      + 'Never invent market prices or financial KPIs. financialRiskScore 0-100 only with riskMethodology (higher = more risk). '
      + 'Cite external inputs with [n].',
  },
  marketing: {
    role: 'Marketing Strategist',
    temperature: 0.4,
    requiredFields: ['executiveSummary', 'detailedReport', 'dataLimitations', 'sourcesUsed'],
    instructions:
      'Create positioning and acquisition plans grounded in evidenced audience/market findings. No fake testimonials or stats.',
  },
  studyvault: {
    role: 'Knowledge Organization Agent',
    temperature: 0.25,
    requiredFields: ['executiveSummary', 'keyConcepts', 'definitions', 'importantDates', 'detailedReport', 'sourcesUsed', 'dataLimitations'],
    instructions:
      'Organize knowledge primarily from uploaded educational material. Preserve source identity. Cite uploaded sources as [n]. Do not invent syllabus content.',
  },
  examinsight: {
    role: 'Exam Preparation Agent',
    temperature: 0.3,
    requiredFields: [
      'executiveSummary', 'testTitle', 'subject', 'chapter', 'durationMinutes', 'totalMarks',
      'questions', 'likelyQuestions', 'priorityTopics', 'scoringCriteria', 'examReadinessScore',
      'detailedReport', 'sourcesUsed', 'dataLimitations',
    ],
    instructions:
      'When the user asks for mock test / MCQ / practice test, return questions as array of '
      + '{question, options: string[4], correctIndex: 0-3, explanation, topic, difficulty, verifiedPreviousYear:boolean}. '
      + 'Label verifiedPreviousYear true ONLY when the item is from uploaded/official previous-year sources. '
      + 'Otherwise set verifiedPreviousYear false (original practice in exam style). '
      + 'Only analyze previous-year patterns when papers are in sources. Never invent official weightage or exam dates. '
      + 'examReadinessScore only with justification from materials; else omit.',
  },
  successarchitect: {
    role: 'Study Planning Agent',
    temperature: 0.3,
    requiredFields: [
      'executiveSummary', 'studyPlan', 'studySchedule', 'milestones', 'resourceAllocation',
      'tasks', 'detailedReport', 'dataLimitations',
    ],
    instructions:
      'Use actual deadlines and student-provided constraints only. Do not invent exam dates or availability. '
      + 'studySchedule/tasks: array of actionable items (string or {task, day, duration}).',
  },
  guideminds: {
    role: 'Study Mentor Agent',
    temperature: 0.45,
    requiredFields: ['executiveSummary', 'encouragement', 'studyTips', 'flashcards', 'detailedReport'],
    instructions:
      'Provide mentoring and study techniques. When flashcards help, return flashcards: [{front, back}]. '
      + 'Distinguish educational guidance from verified external information. Cite external facts if used.',
  },
  specialisthub: {
    role: 'Subject Expert Agent',
    temperature: 0.2,
    requiredFields: [
      'executiveSummary', 'problem', 'givenInformation', 'requiredResult', 'relevantConcept',
      'formula', 'stepByStepSolutions', 'finalAnswer', 'alternativeMethod', 'commonMistakes',
      'practiceQuestion', 'questions', 'mindMap', 'detailedReport', 'sourcesUsed', 'dataLimitations',
    ],
    instructions:
      'For academic/problem questions, return SEPARATE fields (never blend into one paragraph): '
      + 'problem, givenInformation, requiredResult, relevantConcept, formula (use $$...$$ for display math), '
      + 'steps/stepByStepSolutions (array), finalAnswer, alternativeMethod, commonMistakes, practiceQuestion. '
      + 'For practice sets return questions:[{question, options, correctIndex, explanation, topic, difficulty}]. '
      + 'For concept maps return mindMap:{topic, branches:[{label, children:[]}]}. '
      + 'Cite external factual research. Never invent official exam papers.',
  },
};

const ARRAY_FIELDS = new Set([
  'topThemes', 'complaintCategories', 'recurringIssues', 'affectedDemographics', 'keyRisks',
  'infrastructureGaps', 'proposedProjects', 'implementationChannels', 'budgetAllocation',
  'keyMilestones', 'priorityActions', 'channels', 'dataSources', 'recommendations',
  'keyConcepts', 'definitions', 'importantDates', 'likelyQuestions', 'priorityTopics',
  'scoringCriteria', 'studySchedule', 'milestones', 'resourceAllocation', 'encouragement',
  'studyTips', 'stepByStepSolutions', 'formulas', 'keyFindings', 'sourcesUsed', 'claims',
  'questions', 'mcqs', 'quizQuestions', 'flashcards', 'cards', 'tasks', 'riskFactors',
  'opportunityScoreFactors', 'competitors', 'slides',
]);

function normalizeOutput(agent: AgentDefinition, response: Record<string, unknown>) {
  const nested = response.result || response.output || response.data;
  const data = nested && typeof nested === 'object' && !Array.isArray(nested)
    ? { ...(nested as Record<string, unknown>) }
    : { ...response };
  const aliases: Record<string, string[]> = {
    executiveSummary: ['summary', 'overview', 'analysis'],
    detailedReport: ['report', 'details', 'analysis', 'summary'],
    keyObjective: ['objective', 'goal'],
    visionStatement: ['vision'],
    dataOverview: ['overview', 'summary'],
    infrastructureAnalysis: ['analysis', 'technicalAnalysis'],
    researchObjective: ['objective', 'goal'],
    keyFindings: ['findings'],
    dataLimitations: ['limitations', 'gaps'],
  };
  for (const field of agent.requiredFields) {
    if (data[field] !== undefined && data[field] !== null) continue;
    const alias = aliases[field]?.find(key => data[key] !== undefined && data[key] !== null);
    if (alias) data[field] = data[alias];
    else if (ARRAY_FIELDS.has(field)) data[field] = [];
    else if (field === 'citizenSatisfaction') data[field] = 0;
    else data[field] = '';
  }
  return data;
}

export type GenerateAgentOptions = {
  documents?: WorkspaceDocument[];
  enableResearch?: boolean;
  skipResearch?: boolean;
  forceResearch?: boolean | null;
  evidencePack?: string;
  sources?: SourceRecord[];
  dynamicDefinition?: { name: string; responsibility: string; systemPrompt: string };
};

async function callBackendProxy(
  agentId: string,
  prompt: string,
  context: string,
  systemPrompt: string,
  temperature: number,
  options: GenerateAgentOptions,
): Promise<{
  data: Record<string, unknown>;
  sources?: SourceRecord[];
  researchEvents?: AgentResult<unknown>['researchEvents'];
  researchClassification?: string;
  researchFailed?: boolean;
  researchError?: string;
  generatedWithoutLiveResearch?: boolean;
  evidencePack?: string;
  retrievedAt?: string;
  provider?: string;
  model?: string;
}> {
  const response = await fetch(`${BACKEND_URL}/api/v1/agents/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      prompt,
      context,
      systemPrompt,
      temperature,
      enableResearch: options.enableResearch !== false,
      skipResearch: options.skipResearch === true || Boolean(options.evidencePack),
      forceResearch: options.forceResearch ?? null,
      uploads: docsToUploads(options.documents || []),
      evidencePack: options.evidencePack || '',
      sources: options.sources || [],
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}: ${await response.text()}`);
  }

  const result = await response.json();
  if (!result.success) {
    const error = new Error(result.error || 'AI generation failed.') as Error & {
      sources?: SourceRecord[];
      researchEvents?: unknown;
      researchFailed?: boolean;
      researchError?: string;
      generatedWithoutLiveResearch?: boolean;
    };
    error.sources = result.sources;
    error.researchEvents = result.researchEvents;
    error.researchFailed = result.researchFailed;
    error.researchError = result.researchError;
    error.generatedWithoutLiveResearch = result.generatedWithoutLiveResearch;
    throw error;
  }

  return {
    data: result.data as Record<string, unknown>,
    sources: result.sources,
    researchEvents: result.researchEvents,
    researchClassification: result.researchClassification,
    researchFailed: result.researchFailed,
    researchError: result.researchError,
    generatedWithoutLiveResearch: result.generatedWithoutLiveResearch,
    evidencePack: result.evidencePack,
    retrievedAt: result.retrievedAt,
    provider: result.provider,
    model: result.model,
  };
}

async function retry<T>(operation: () => Promise<T>) {
  let error: Error | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (reason) {
      error = reason instanceof Error ? reason : new Error(String(reason));
      if (attempt < MAX_RETRIES) await new Promise(resolve => window.setTimeout(resolve, 900 * (attempt + 1)));
    }
  }
  throw error || new Error('AI request failed.');
}

export async function generateAgentResponse(
  agentId: string,
  prompt: string,
  previousOutputs?: string,
  options?: GenerateAgentOptions | { name: string; responsibility: string; systemPrompt: string },
): Promise<AgentResult<unknown>> {
  // Back-compat: DynamicOrchestrator previously passed dynamicDefinition as 4th arg
  const normalized: GenerateAgentOptions =
    options && 'systemPrompt' in options && !('documents' in options) && !('enableResearch' in options)
      ? { dynamicDefinition: options as { name: string; responsibility: string; systemPrompt: string } }
      : (options as GenerateAgentOptions | undefined) || {};

  const agent =
    AGENT_DEFINITIONS[agentId] ||
    (normalized.dynamicDefinition
      ? {
          role: normalized.dynamicDefinition.name,
          instructions: `${normalized.dynamicDefinition.responsibility} ${normalized.dynamicDefinition.systemPrompt} Return a detailed JSON object. Never invent sources or statistics. Cite EVIDENCE PACK with [n]. Include executiveSummary, detailedReport, dataLimitations, sourcesUsed.`,
          requiredFields: ['executiveSummary', 'detailedReport'] as string[],
          temperature: 0.35,
        }
      : undefined);

  if (!agent) return { success: false, error: `Unknown agent: ${agentId}`, timestamp: new Date().toISOString() };

  const context = previousOutputs
    ? previousOutputs.slice(-28_000)
    : 'No prior agent output is available; reason only from the original challenge and evidence pack.';
  const systemPrompt =
    `You are COMET's ${agent.role}. Your job is distinct from the other agents. ${agent.instructions} ` +
    'Respond with valid JSON only. Do not use markdown fences. Do not copy generic templates. ' +
    'Make every factual conclusion traceable to the EVIDENCE PACK, uploaded sources, or original request.';

  try {
    const raw = await retry(() =>
      callBackendProxy(agentId, prompt, context, systemPrompt, agent.temperature, normalized),
    );
    const data = normalizeOutput(agent, raw.data);
    const claims = Array.isArray((data as { claims?: unknown }).claims)
      ? ((data as { claims: AgentResult<unknown>['claims'] }).claims)
      : undefined;

    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      provider: (raw as { provider?: string }).provider,
      sources: raw.sources,
      claims,
      researchEvents: raw.researchEvents,
      researchClassification: raw.researchClassification,
      researchFailed: raw.researchFailed,
      researchError: raw.researchError,
      generatedWithoutLiveResearch: raw.generatedWithoutLiveResearch,
      evidencePack: raw.evidencePack,
      retrievedAt: raw.retrievedAt,
    };
  } catch (reason) {
    const err = reason as Error & {
      sources?: SourceRecord[];
      researchEvents?: AgentResult<unknown>['researchEvents'];
      researchFailed?: boolean;
      researchError?: string;
      generatedWithoutLiveResearch?: boolean;
    };
    const errorMessage = err instanceof Error ? err.message : 'Unknown provider error';
    return {
      success: false,
      error: errorMessage.startsWith('Unable to generate')
        ? errorMessage
        : `Unable to generate AI response: ${errorMessage}`,
      timestamp: new Date().toISOString(),
      sources: err.sources,
      researchEvents: err.researchEvents,
      researchFailed: err.researchFailed,
      researchError: err.researchError,
      generatedWithoutLiveResearch: err.generatedWithoutLiveResearch,
    };
  }
}
