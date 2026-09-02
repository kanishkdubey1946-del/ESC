# Implementation Plan: Massive Additive Content Expansion

In accordance with your STRICT MASTER PROMPT, I will execute a massive expansion of the AI content capabilities **strictly through additive changes**. No existing logic, UI layouts, or features will be removed or altered.

## 1. Schema Expansion (`types/agents.ts`)
I will **add** new optional fields to the existing interfaces. Existing fields will remain untouched.
- **All Agents**: Add a `detailedReport: string` field to hold the requested 1000+ word deep-dive content (Introductions, Best Practices, FAQs, etc.).
- **ContentIdea**: Add new fields for: `emojiVersion`, `professionalVersion`, `casualVersion`, `longCaption`, `shortCaption`, `carouselContent`, `storyContent`, `reelScript`, `videoDescription`, `seoTitle`, `seoDescription`, `keywords`, `altText`, `thumbnailIdea`, `trendingAngle`, `postingTimeSuggestion`, `audienceType`, `contentCalendarSuggestion`, `repurposeSuggestions`.
- **DevelopmentOutput**: Add fields for: `folderStructure`, `howToRun`, `installation`, `dependencies`, `technologyStack`, `frontendExplanation`, `backendExplanation`, `databaseExplanation`, `deploymentGuide`, `githubSetup`, `hostingOptions`, `performanceTips`, `optimizationTips`, `securitySuggestions`, `alternativeManualDevelopmentGuide`, `usefulDocumentationLinks`, `officialResources`, `learningResources`.

## 2. Prompt Engineering (`utils/llm.ts`)
I will **append** massive new instructions to the existing system prompts:
- Enforce a 1000+ word minimum for the `detailedReport`.
- **Content Agent**: Require generation for all 20+ specified platforms and populate all the new specific caption/SEO variations.
- **Development Agent**: Enforce the generation of a production-grade, highly stylized SaaS landing page (Tailwind, responsive, animations) and populate all technical guides.
- **Pitch Agent**: Enforce exactly 15 slides covering the exact structure you requested (Cover, Problem, ... Thank You).

## 3. UI Expansion (Workspaces)
I will **append** new UI components to the bottom of the existing workspaces to render the massive new data, preserving all current UI alignments and styles.
- **Bug Fix in DevelopmentWorkspace**: I will add a `.replace(/\\n/g, '\n')` to the iframe's `srcDoc` to fix the escaped newline rendering issue, leaving all other code intact.
- **Markdown Viewer**: I will add a `react-markdown` viewer at the bottom of each workspace to beautifully render the 1000+ word `detailedReport`.
- **ContentWorkspace**: I will append expander/accordion sections to the existing content cards to display the new SEO, script, and caption variations without cluttering the main view.
- **DevelopmentWorkspace**: I will append new styled sections to render the extensive technical documentation and guides.

## User Review Required
> [!IMPORTANT]
> To render the 1000+ word `detailedReport` beautifully with formatting (bold, lists, headers), I will need to install `react-markdown` via `npm install react-markdown`. 
> Do you approve this additive installation and the plan to append all new UI elements below the existing ones?
