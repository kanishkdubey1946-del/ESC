export type DynamicAgent = { id: string; name: string; role: string; responsibility: string; selectedBecause: string; dependencies: string[]; systemPrompt: string };

const library: Record<string, Omit<DynamicAgent, 'selectedBecause'>> = {
  research: { id: 'research', name: 'Research Analyst', role: 'Research', responsibility: 'Validate the problem, audience, market and evidence.', dependencies: [], systemPrompt: 'Produce evidence-led research, assumptions, risks, opportunities, competitor context and sources.' },
  product: { id: 'product', name: 'Product Manager', role: 'Product', responsibility: 'Define the user problem, scope, requirements and roadmap.', dependencies: ['research'], systemPrompt: 'Create a clear product brief, personas, jobs to be done, requirements, priorities and roadmap.' },
  strategy: { id: 'strategy', name: 'Business Strategist', role: 'Strategy', responsibility: 'Create the business model and go-to-market plan.', dependencies: ['research'], systemPrompt: 'Develop a tailored strategy with business model, pricing, GTM, risks, milestones and action plan.' },
  finance: { id: 'finance', name: 'Finance Analyst', role: 'Finance', responsibility: 'Model costs, pricing, revenue and financial risks.', dependencies: ['strategy'], systemPrompt: 'Provide assumptions, costs, pricing, revenue scenarios, break-even logic and financial risks.' },
  frontend: { id: 'frontend', name: 'Frontend Engineer', role: 'Frontend development', responsibility: 'Design the client architecture and implementation plan.', dependencies: ['product'], systemPrompt: 'Specify UI architecture, component plan, accessibility, performance, testing and implementation steps.' },
  backend: { id: 'backend', name: 'Backend Architect', role: 'Backend development', responsibility: 'Design APIs, data flow, services and security.', dependencies: ['product'], systemPrompt: 'Specify architecture, APIs, data model, security, scalability, observability and implementation steps.' },
  ux: { id: 'ux', name: 'UI/UX Designer', role: 'UX', responsibility: 'Design user journeys and interface requirements.', dependencies: ['product'], systemPrompt: 'Create user flows, information architecture, key screens, accessibility requirements and design rationale.' },
  marketing: { id: 'marketing', name: 'Marketing Strategist', role: 'Marketing', responsibility: 'Create positioning, launch and acquisition plans.', dependencies: ['research'], systemPrompt: 'Develop positioning, channel strategy, campaign concepts, messaging, KPIs and a launch plan.' },
  legal: { id: 'legal', name: 'Compliance Advisor', role: 'Compliance', responsibility: 'Identify legal, privacy and regulatory considerations.', dependencies: ['research'], systemPrompt: 'Identify relevant compliance, privacy, legal and risk items. State jurisdiction assumptions and advise professional review.' },
  data: { id: 'data', name: 'Data Analyst', role: 'Data analysis', responsibility: 'Extract insights and evaluate data quality.', dependencies: ['research'], systemPrompt: 'Analyze supplied data or documents, identify facts, gaps, trends, quality concerns and actionable insights.' },
  docs: { id: 'docs', name: 'Technical Writer', role: 'Documentation', responsibility: 'Turn the plan into clear implementation documentation.', dependencies: ['product', 'backend'], systemPrompt: 'Produce structured, implementation-ready documentation with headings, steps, examples, tables and acceptance criteria.' },
  presentation: { id: 'presentation', name: 'Presentation Designer', role: 'Presentation', responsibility: 'Create a slide-by-slide executive narrative.', dependencies: ['strategy'], systemPrompt: 'Create presentation-ready JSON with title, agenda, slides array (title, bullets, speakerNotes), financials, timeline and conclusion.' },
  market: { id: 'market', name: 'Market Analyst', role: 'Market analysis', responsibility: 'Evaluate market size, competitors and demand signals.', dependencies: ['research'], systemPrompt: 'Produce a market landscape, competitor comparison, demand signals, customer segments and opportunities.' },
  brand: { id: 'brand', name: 'Brand Designer', role: 'Branding', responsibility: 'Define positioning, identity and messaging.', dependencies: ['research'], systemPrompt: 'Create a brand positioning, voice, naming direction, messaging pillars and visual direction.' },
  seo: { id: 'seo', name: 'SEO Specialist', role: 'SEO', responsibility: 'Plan discoverability and organic acquisition.', dependencies: ['marketing'], systemPrompt: 'Create keyword clusters, content opportunities, technical SEO priorities and measurement plan.' },
  testing: { id: 'testing', name: 'Testing Engineer', role: 'Quality assurance', responsibility: 'Plan quality, testing and release criteria.', dependencies: ['frontend', 'backend'], systemPrompt: 'Create a practical test strategy, test cases, quality gates, risks and release checklist.' },
  deployment: { id: 'deployment', name: 'Deployment Engineer', role: 'Deployment', responsibility: 'Plan secure delivery and operations.', dependencies: ['backend'], systemPrompt: 'Create a deployment architecture, CI/CD plan, environments, monitoring, rollback and cost considerations.' },
  risk: { id: 'risk', name: 'Risk Analyst', role: 'Risk', responsibility: 'Identify strategic, operational and delivery risks.', dependencies: ['strategy'], systemPrompt: 'Create a risk register with likelihood, impact, mitigations, owners and early warning signs.' },
  operations: { id: 'operations', name: 'Operations Planner', role: 'Operations', responsibility: 'Design operating processes and ownership.', dependencies: ['strategy'], systemPrompt: 'Create operating model, workflows, roles, KPIs, dependencies and phased implementation plan.' },
};

export function getAgentLibrary() { return Object.values(library); }

const has = (text: string, terms: string[]) => terms.some(term => text.includes(term));
export function selectDynamicAgents(prompt: string, hasDocuments = false): DynamicAgent[] {
  const text = prompt.toLowerCase(); const ids = new Set<string>(['research']);
  const add = (...items: string[]) => items.forEach(item => ids.add(item));
  if (has(text, ['startup', 'saas', 'business', 'company', 'revenue', 'pricing'])) add('strategy', 'finance', 'market', 'brand', 'marketing', 'presentation', 'docs');
  if (has(text, ['app', 'website', 'software', 'platform', 'api', 'mobile'])) add('product', 'ux', 'frontend', 'backend', 'testing', 'deployment', 'docs');
  if (has(text, ['campaign', 'brand', 'seo', 'social', 'copy', 'marketing'])) add('marketing', 'brand', 'seo', 'market', 'presentation');
  if (has(text, ['budget', 'finance', 'cost', 'investment'])) add('finance');
  if (has(text, ['legal', 'privacy', 'compliance', 'health', 'medical', 'security'])) add('legal');
  if (has(text, ['risk', 'operation', 'process', 'scale'])) add('risk', 'operations');
  if (hasDocuments || has(text, ['pdf', 'document', 'dataset', 'data', 'report'])) add('data', 'presentation');
  if (ids.size === 1) add('strategy', 'presentation');
  return [...ids].map(id => ({ ...library[id], selectedBecause: id === 'research' ? 'Every request begins with evidence and problem discovery.' : `Selected because your request indicates ${library[id].role.toLowerCase()} expertise.` }));
}
