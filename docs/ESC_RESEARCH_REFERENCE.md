# ESC — Enhanced Study Companion: website and research reference

Prepared from the local source tree on 9 September 2026, application revision `a0856f2`.

This is a code-based explanation and a research-paper planning reference. It is not a completed empirical paper, a live deployment audit, or a literature review. “Implemented” means a code path exists; it does not establish that a provider is configured, that every interaction succeeds in production, or that the feature improves learning. Personal motivation below is proposed wording based on the product goals, not a claim about the author's undocumented biography.

## 1. What ESC is

ESC is a student-focused web application that brings conversational assistance, uploaded study material, web research, specialist-generated outputs, diagnostic quizzes, and study planning into one workspace. Its intended learning journey is to help a student move from a question to an explanation, from an explanation to practice, and from practice to a clearer next study session.

The application has three important execution paths:

1. **Conversational assistance:** a streaming chat with optional selected sources and an optional specialist role.
2. **Research and report studio:** a workflow that selects specialists, retrieves evidence when needed, and requests structured reports.
3. **Adaptive learning:** a persistent student profile, server-scored diagnostics, topic mastery estimates, diagnoses, and versioned schedules.

These paths share the product but do not have identical capabilities. Ordinary chat does not currently call the web research tool. Web search is available through the source library and report workflow. A plan written in chat is a draft; the adaptive planner creates saved tasks. A specialist's role is implemented largely through instructions and output schemas, not a separately trained model.

## 2. Why this project exists

### Problem being addressed

The design addresses a common study workflow problem: a learner may keep notes in one place, search for explanations elsewhere, use another service for practice, and maintain a separate timetable. Each transition requires the learner to transfer context and decide what to do next. A generated explanation alone does not tell the learner whether they understood it or which topic deserves their next hour.

ESC attempts to reduce this fragmentation through a shared workspace and a feedback loop. This is the design motivation, not yet a measured conclusion about all students or existing products.

### Proposed first-person motivation

> I created ESC to bring the main parts of independent study into one connected workspace. My goal was to help students ask questions, use their own material, find external resources, practise actively, and decide what to study next. I wanted the system to provide more than isolated answers: it should connect explanations with practice and connect recorded performance with realistic study plans. Specialist roles allow the application to adapt its response format to the task, while source references and explicit limitations help students inspect the information they receive.

Use that paragraph only if it reflects your actual motivation. Add your real observations, interviews, or personal experiences separately.

### Intended users

- School students who need help with syllabus topics and revision.
- College students organising notes and understanding concepts.
- Examination candidates practising questions and allocating limited study time.
- Independent learners who need structure and accessible explanations.

These are target groups. The repository does not establish adoption, sample size, age distribution, or measured benefit for any group. Teachers could review generated resources, but the current product should not be described as a complete teacher administration or classroom management system.

### Main objectives

1. Put questions, sources, explanations, and study activities within one application.
2. Offer specialised responses for different educational tasks.
3. Support both submitted material and external research, with explicit source boundaries.
4. Provide direct feedback through diagnostics and review.
5. Calculate progress indicators reproducibly.
6. Generate schedules that fit declared availability.
7. Make long-running AI requests understandable through visible status and recovery controls.

## 3. Website map

| Location | Purpose | Main implementation |
|---|---|---|
| `/` | Public landing page and entry to authentication | `frontend/src/pages/LandingPage.tsx` |
| Authentication overlay | Email-first sign-up and sign-in | `AuthModal.tsx`, `ui/sign-in-flow-1.tsx` |
| `/dashboard` | Authenticated workspace; chat is the default view | `pages/DashboardLayout.tsx` |
| `view=chat` | Conversational AI companion | `components/AssistantChat.tsx` |
| `view=overview` | Goals, tasks, and learning summary | `components/esc/EscDashboard.tsx` |
| `view=planner` | Calendar, sessions, and saved task completion | `EscDashboard.tsx` |
| `view=analytics` | Quiz results, mastery, and progress | `EscDashboard.tsx` |
| `view=sources` | Source library and web search | `components/SourceLibrary.tsx` |
| `view=specialists` | Specialist catalogue and quick launch | `components/AgentPlayground.tsx` |
| `view=studio` | Multi-specialist report workflow | `components/DynamicOrchestrator.tsx` |
| `mode=student` / `mode=playground` | Workspace context and specialist exploration | `DashboardLayout.tsx`, `lib/modeAgents.ts` |
| `/demo/lunar-gravity` | Separate visual demonstration | Lazy-loaded demo component |

Unknown routes redirect to the landing page. The business-oriented source files that remain in the repository are not proof of an active Business mode in the current navigation.

## 4. Landing page: element-by-element explanation

### Header

| Element | What it does | Why it exists |
|---|---|---|
| ESC logo | Uses the supplied indigo mark for brand recognition | Connects the browser tab, public page, and workspace visually |
| ESC wordmark | Names the product next to its symbol | Makes the unfamiliar symbol understandable |
| Home | Links to the top of the page | Lets visitors return to the main introduction |
| Specialists | Links to the specialist index | Explains the task-specific assistance concept |
| How it works | Links to the four-step explanation | Reduces uncertainty before registration |
| Features | Links to the capabilities section | Helps visitors understand the scope |
| Get Started | Opens sign-up, or opens the dashboard for a signed-in user | Provides a clear entry action |
| Mobile menu | Exposes section navigation on smaller screens | Keeps navigation usable when horizontal space is limited |
| Sticky glass header | Keeps navigation near the top during scrolling | Maintains orientation over the animated background |

The former Explore button was removed because it duplicated Features. Anchor navigation uses smooth scrolling and section offsets. Reduced-motion preferences disable that smooth scrolling.

### Hero

- **“One question.”** is the entry promise: the student can begin with an immediate learning need.
- **“The right specialists.”** introduces task-specific assistance. It should not be interpreted as a guarantee that routing always selects the best expert or that all specialists run on every question.
- **Supporting paragraph** explains the combination of web research, personal sources, explanations, practice, and plans.
- **Open your workspace** is the main action and follows the same authentication-aware launch flow as Get Started.
- **See how it works** scrolls to the explanation of the workflow.
- **Live research** signals that the product contains an external research capability.
- **Specialist agents** signals that responses can be tailored to the task.
- **Your material** signals that uploaded content can provide the evidence boundary.
- **Thin separators** organise these three supporting points without making them look like separate buttons.
- **Gradient text** distinguishes the second headline line while retaining the indigo/lilac/blue palette.
- **Adjusted line height and padding** provide room for letters such as “g” whose shapes extend below the baseline.
- **The main glass surface** improves separation between text and the moving background.

The headline, paragraph, and actions follow a shared left edge. Text sizes and padding adapt to viewport width. Supporting details use three columns on larger displays and stack on narrow screens. The intended benefit is readability and hierarchy; preference for this composition has not been formally measured.

### Continuous animated background

`SonarGrid` draws a field of dots on a canvas. Expanding rings change nearby dots to create a sonar-like response. Pointer events support mouse and touch interaction. The landing instance listens at viewport level so foreground content does not prevent all interaction with the effect.

The implementation observes size and visibility, reacts to theme changes, and cleans up event listeners, timers, and animation frames. The canvas is decorative and hidden from assistive technology. Soft atmospheric gradients and a grain layer add depth. These effects indicate visual identity; they do not represent real agent activity, learning events, or scientific measurements.

### Specialist index

The section titled “The right help for the task.” introduces the specialist team. Its current name list is a separate landing-page array, not the registry used to execute specialists. Rounded name tiles were replaced by a flat list with separators.

**Documentation discrepancy:** the landing array includes Essay Coach, Formula Solver, Citation Builder, Flashcard Forge, Research Scout, Language Tutor, and PlannerBot. Those exact names are not all registered operational specialists. Some approximate existing roles; others are marketing labels without their own registered agent. The operational registry in Section 10 is the appropriate list for the paper.

### Feature section

“Less switching. More understanding.” describes the intended benefit of integrating activities. The six numbered cards are:

1. **Student Companion:** questions, explanations, follow-ups, and notes.
2. **Specialist Playground:** choosing assistance suited to a particular task.
3. **Web research and sources:** finding external information or bringing material into the workspace.
4. **Practice and recall:** quizzes and flashcards.
5. **Concept maps:** visual or structured relationships between ideas.
6. **Study planning:** priorities, availability, and schedules.

Numbers support scanning, icons distinguish categories, and brief descriptions explain the intended benefit. The cards are informational articles, not evidence that clicking every card launches a tool.

### How it works

The four steps are **Start with a question → Route the work → Review the evidence → Turn it into progress**. This is a product-level explanation. It is not an exact description of every request handler: direct chat, research, and saved diagnostics take different technical paths.

### Closing call to action and footer

The final “Start with a question.” section offers another workspace entry point after the visitor has read the page. Its globe is decorative. The footer repeats branding, describes ESC, links to page sections and the dashboard, and provides a back-to-top link and copyright text. The globe and lunar demo do not add research or geographic intelligence to the application.

## 5. Authentication and account interface

The authentication presentation is a full-screen dialog adapted from a sign-in component. `AuthModal` owns the actual credentials and API calls.

| Control or state | Behaviour |
|---|---|
| Sign-up / sign-in choice | Switches between creating an account and returning to one |
| Email step | Collects an email before moving to credentials |
| Full name | Collected for registration and used in personal greetings |
| Password | Required for the backend account; minimum eight characters |
| Confirmation | Prevents mismatched passwords during registration |
| Eye control | Toggles local password visibility |
| Back navigation | Returns to an earlier form stage |
| Submit | Calls register or login, refreshes the authenticated user, and opens the workspace |
| Loading indicator | Communicates that submission is in progress |
| Inline error | Explains validation, authentication, or connection failure |
| Close / Escape | Dismisses the dialog |
| Focus containment | Keeps keyboard focus within the dialog and restores it on close |

The original visual reference contained Google sign-in, but the current authentication flow does not establish a working Google OAuth integration. An email-first form is not email verification; no verification-code delivery should be claimed from that presentation alone.

Before authentication requests, the browser checks `/health` with shared wake-up handling and retries. This helps with delayed backend availability but does not guarantee that every network failure can be recovered automatically.

## 6. Workspace navigation and small controls

- **Sidebar brand:** returns to the AI companion view.
- **New conversation:** creates a fresh conversation identifier. Ctrl/Cmd+K also triggers it.
- **AI companion:** opens the conversational surface.
- **Overview:** opens the learning summary.
- **Study planner:** opens saved schedules.
- **My progress:** opens analytics.
- **My library:** opens sources.
- **Specialists badge:** communicates the registry count of twelve.
- **Recent conversations:** offers shortcuts to the five most recent visible entries; the storage layer retains up to thirty per user/mode.
- **Active navigation highlight:** indicates the selected view.
- **Sidebar companion status and planner link:** offer a route back to the next study step.
- **Header breadcrumb/title:** identifies the current workspace view.
- **Student/Playground selector:** switches workspace mode.
- **Theme toggle:** changes the workspace theme. The public landing page remains styled primarily for a dark presentation.
- **Overview/Updates/Settings/Profile dock:** exposes secondary workspace controls.
- **Updates panel:** derives items from recent conversations; it is not evidence of scheduled reminders, push notifications, or a background notification service.
- **Profile:** shows the signed-in identity and shortcuts.
- **Settings:** provides workspace actions and account-related navigation; it is not a full administration console.
- **Sign out:** invalidates the active session through the backend and clears its browser token.
- **Mobile navigation drawer:** provides the sidebar on smaller displays.
- **Source drawer and backdrop:** allow sources to be managed alongside work; dismissal returns to the current view.
- **Escape, focus trapping, and skip link:** support keyboard navigation and assistive technology.

Some small visual marks, such as decorative arrows or static status dots, are not independent actions. Describe controls according to their event handlers, not merely their appearance.

## 7. Conversational AI companion

### Empty state

The assistant begins with an orb, a greeting using the student's first name, and starter actions. “Make it click” prepares a concept-help prompt; “Make a plan” prepares a planning prompt; “Put me to the test” prepares a practice prompt; “Connect the dots” prepares a source-summary prompt. Clicking a starter fills the composer so the student can inspect or edit the request.

### Composer

The text field accepts the student's question. Its placeholder changes when sources are selected. The plus button opens source management. The source selector lists available documents with checkboxes, giving the student control over the evidence sent with the question. Send begins a request; Stop aborts the active stream. Busy state prevents overlapping submissions.

The microphone uses the browser's SpeechRecognition or webkitSpeechRecognition implementation. Interim recognition updates are rebuilt from the current results against a fixed existing-text prefix, which avoids repeatedly appending the same partial transcript. Recognition is set to `en-US`. Availability depends on browser support and microphone permissions. This is voice-to-text input, not a demonstrated full-duplex voice assistant or uploaded-audio transcription service.

### Answer area

User and assistant messages have distinct presentation. Markdown supports readable paragraphs and structured content. Status messages are displayed while content is pending. Server-Sent Events carry status, source records, text deltas, completion, and errors. The frontend adds text as it arrives.

Source details expand beneath source-grounded answers. Citation numbers connect text to the supplied evidence. A jump-to-latest control appears when the user has moved away from the bottom. Automatic scrolling respects the user's reading position. Interrupted answers remain visibly interrupted, and retry controls permit a fresh attempt. An error dismissal button clears the visible error message.

### Capabilities and boundaries

With selected documents, the system instructs the model to use only those excerpts for factual claims. With no selected documents, it can provide model-based explanations. The direct chat system instructions explicitly state that it cannot search the web, open arbitrary URLs, execute tools, schedule reminders, or modify a saved study plan.

Selecting a specialist from the catalogue can launch a conversation with that specialist's role. It does not automatically execute all twelve specialists or the report studio's orchestration pipeline.

## 8. Sources, research, and grounding

### Source library

The library displays saved workspace documents and external search results. Add-source flows offer file input, pasted text, website references, and other source categories. File icons and names identify documents; dates help orientation; delete controls remove the corresponding saved document or current result entry. Web cards can show title, domain, category, snippets, and date/provenance information.

The library's search input calls the real research endpoint with external research explicitly enabled. Search states distinguish searching, evaluating, completion, and error. Results are shared with the report workflow through browser events. They are not automatically equivalent to documents selected in direct chat.

### Text extraction

The shared extraction service supports text-like formats, PDF, DOCX, XLSX/XLSM, and PPTX through their respective parsers. Maximum uploaded file size is 10 MiB; extracted text is clipped to 45,000 characters. PDF extraction uses a text parser, DOCX extraction reads paragraphs, spreadsheets provide worksheet values, and presentations provide slide text.

This does not preserve every possible table, equation, image, or document layout. Image-only PDFs require OCR, which is not configured in this extractor. Image input may be stored as a reference with a note rather than interpreted. Audio transcription and legacy DOC/PPT/XLS parsing are not implemented here. The YouTube flow stores a URL reference and explicitly states that transcript retrieval is not configured. The Google Drive screen explicitly states that its integration is not configured. Neither should be reported as a working video-understanding or authenticated cloud-drive integration.

### Chat source selection

Chat allocates up to 90,000 source-text characters. When submitted sources exceed the available context, it divides text into 2,400-character chunks, ranks chunks by occurrences of question terms, and restores selected chunks in document order. Metadata records truncation and supplied character counts. Chat history is separately bounded, with the frontend sending recent turns and the backend enforcing a 20,000-character history budget.

This is a lightweight lexical retrieval approach. No embedding index or vector database was found in the inspected active path. It should not be described as trained semantic retrieval or full-document comprehension for arbitrarily long uploads.

The prompt requires an absence response when evidence is missing and a qualified response when only partial excerpts were available. Prompt rules reduce risk but do not mathematically guarantee grounded answers or correct citations.

### External research pipeline

The research service classifies a request as general reasoning, uploaded sources, live research, or combined evidence. Uploaded sources normally suppress automatic outside search unless external research is explicitly forced.

The service plans search queries, calls available providers, scores results, fetches pages, extracts snippets and dates, packages evidence, and emits activity events. Available search adapters are Tavily, Brave Search, Serper, Google News, Bing, and DuckDuckGo. Actual use depends on keys, provider availability, and network responses. These adapters are search infrastructure, not dedicated student specialists.

The initial result score is:

`overall = 0.40 × relevance + 0.30 × authority + 0.20 × evidence + 0.10 × freshness`

Relevance is based on query terms in titles/snippets. Authority comes from domain heuristics. Evidence uses proxies such as snippet length and term matches. Initial freshness is a neutral 0.55 when metadata is not incorporated at that stage. Acceptance requires relevance at least 0.55, overall score at least 0.50, and valid title/domain information. Further fetching and ranking can affect the final source record.

These are heuristic quality indicators, not calibrated probabilities of truth. The inspected “cross-check” stage emits progress text, and some counters derive from snippets. It is not an independently demonstrated claim-by-claim fact-checking engine. A paper must avoid interpreting a “verified” badge as scientific verification.

If external research fails, report generation can continue with explicit lack-of-verification metadata and instructions against invented citations or statistics. This is graceful degradation, not successful research.

## 9. ThinkingOrb and visual feedback

ThinkingOrb is the assistant's animated visual identity. `AIStatus` combines it with text in an accessible status region; `OrbLoader` provides compact loading use. Its visual state communicates the activity assigned by application code.

| State | Intended interpretation |
|---|---|
| searching | Finding resources or preparing evidence |
| working | Processing sources, saving, or completing an operation |
| solving | Preparing an explanation or solution |
| listening | Ready for input, or microphone input when explicitly labelled |
| composing | Writing streamed answer text |
| shaping | Building a draft plan or related structured output |
| connecting | Connecting ideas; available in the wrapper |
| weaving | Bringing information together; available in the wrapper |
| breathing | Idle readiness; available in the wrapper |

The latter three are supported labels; their presence does not mean every screen uses them. The orb is not a display of hidden model reasoning, and “listening” alone does not prove the microphone is active. Text labels supply the context. Some instances explicitly pin the dark palette even though the underlying component supports theme options.

## 10. The twelve registered specialists

Each definition includes an ID, display name, role, responsibility, example prompt, system instructions, tags, dependencies, icon, and output type. The current registry gives all twelve empty dependency lists. The orchestrator supports dependencies, but a four-stage dependency chain is not configured by these definitions.

| Specialist | Responsibility | Typical output and constraint |
|---|---|---|
| StudyVault | Organise notes, chapters, and syllabi | Summaries, concepts, definitions, dates where present; preserve source identity |
| ExamInsight | Interpret supplied performance evidence | Weak areas, priorities, recommendations; no invented marks or official exam trends |
| SuccessArchitect | Develop a personal study plan | Tasks, schedules, milestones; use stated constraints |
| Concept Clarifier | Explain difficult concepts | Explanation, examples, misconceptions, recall question |
| Problem Solver | Work through academic problems | Given information, method, formulas, working, final answer, common mistakes |
| QuizForge | Generate original practice questions | MCQs with four options and explanations; do not label invented questions as official papers |
| Revision Coach | Guide revision and recall sessions | Time-boxed recall activities and revision checklists |
| Flashcard Studio | Convert concepts to short question-answer pairs | Atomic front/back cards from relevant material |
| MindMap Maker | Organise relationships and short notes | Central topic, branches, child concepts, relevant formulas |
| Resource Scout | Curate relevant learning resources | Resource reasons and provenance; direct chat cannot independently verify new URLs |
| Paper Pattern Analyst | Examine supplied past papers | Recurring topics and coverage; distinguish observed evidence from recommendations |
| GuideMinds | Support focus and realistic routines | Small actionable steps; no mental-health diagnosis |

The defensible description is **role-specialised LLM agents within an application workflow**. They are not twelve independently trained AI models. Different roles can use the same provider/model. A role-specific API key for every specialist is not implemented merely by storing several provider keys.

## 11. Report studio and orchestration

The studio has an input area, source context, an activity stream, automatic/manual selection, agent status cards, and report viewing controls.

In automatic mode, `selectDynamicAgents` uses keywords and document presence to select IDs. Examples include “explain” for Concept Clarifier, “quiz” for QuizForge, and “plan” for SuccessArchitect. If no rule matches, Concept Clarifier and GuideMinds are fallback selections. This is rule-based routing, not a trained intent classifier.

In manual mode, the user chooses the specialists. The workflow gathers shared research evidence and runs eligible specialists, with support for dependency-aware batches and concurrent requests. Shared context can include upstream results. The request to `/api/v1/agents/run` carries the prompt, role instructions, source records, and evidence pack. The backend returns JSON plus provenance, model/provider information, and failure metadata.

Status cards separate waiting/readiness, generation, success, and failure. “Ready” before execution means available to run; it does not mean an answer exists. It is normal for automatic routing to finish with fewer than twelve outputs.

The report modal provides a title, status, update information, available source metadata, formatted content, refinement/comment actions where wired, copy, export, regeneration, and close controls. Errors and empty outputs provide retry paths. Views depend on output type and content availability rather than displaying the same report shell for every agent.

## 12. Interactive study outputs and exports

- **Mock tests:** question navigation, answer choices, submission, solution review, and performance presentation. Do not assume studio-local scoring is identical to the persistent diagnostic backend.
- **Flashcards:** flip, previous/next, shuffle, Know, Review again, and session progress. These session controls are not evidence of a persistent spaced-repetition algorithm.
- **Study-plan reports:** tasks, completion checkboxes, milestones, resources, and full-plan text where present. This report component explicitly stores completion for the session only; the dedicated planner persists task changes through the API.
- **Mind maps:** central topic, branches, expansion controls, zoom/full-screen state, and applicable downloads.
- **Readable fallback:** when structured data is unavailable, render usable text/notes instead of implying an interactive object was generated.
- **Exports:** report PDF/DOCX; applicable notes and calendar CSV; flashcard PDF/CSV; mind-map SVG/PNG/PDF; question papers, keys, solutions, and performance PDFs.

Export options depend on agent and result shape. Generic export utilities also contain legacy content, development, financial, and presentation formats; that does not establish corresponding active student features. Saving a file does not validate its educational correctness.

## 13. Student profile and onboarding

Before using persistent learning views, students supply:

| Field | Purpose |
|---|---|
| Class/grade | Educational level and personal context |
| Curriculum | Context such as CBSE or another programme |
| Subjects | Topics of study and diagnostic choices |
| Goal | What the student is working toward |
| Target date | Planning horizon and displayed milestone |
| Preferred session length | Duration used when allocating sessions |
| Weekly study hours | Fallback availability estimate |
| Daily study minutes | More specific daily scheduling limit |
| Priority/weak topics | Starting priorities before measured diagnostics |

Required fields are validated. Subject/topic entries are normalised from comma-separated input, and counts are bounded. Editing preferences saves through the learning API. A label such as curriculum does not mean the app contains a complete official syllabus database.

## 14. Overview dashboard

The overview greets the learner and combines:

1. **Assistant card:** connects the stated goal with the next action.
2. **Build a plan with ESC:** opens a conversational planning request using profile context; it produces a draft.
3. **Find my focus:** sends recorded performance evidence to chat for explanation.
4. **Today's focus:** scheduled minutes and session count, not automatically measured time on task.
5. **Plan completed:** completed task count divided by total saved tasks.
6. **Recent quiz average:** arithmetic average of recorded recent diagnostic percentages.
7. **Next milestone:** days to the target date, or an unset-date state.
8. **Today's task rows:** topic, activity, duration, completion control, and a Study with ESC action.
9. **Topic mastery:** bars, categories, confidence heuristic, and trends.
10. **Diagnostic entry:** starts the short assessment flow.
11. **Empty states:** explain that a profile, diagnosis, or schedule is needed rather than manufacturing progress.
12. **Error/retry states:** recover failed memory or task operations.

## 15. Diagnostics and assessment

The current quick-diagnostic interface asks for a subject and topic and requests five medium-difficulty questions with ten-minute duration metadata. It records elapsed submission time; this interface should not be described as a proctored examination.

Question generation asks a configured provider for JSON. Validation checks a question prompt, exactly four distinct nonempty options, a valid answer index, explanation, and topic. Invalid output receives limited retry/repair handling. Persisted quiz responses omit answer keys until review/submission.

The backend compares submitted answer indices against stored keys and calculates correct, incorrect, attempted, unattempted, and total counts. Unattempted items remain in the denominator. It then updates per-topic results, mastery, diagnosis, and a new plan when a profile exists.

**Critical limitation:** if AI question generation fails or is unavailable, fallback questions concern generic study skills with the topic inserted into the wording. Those questions do not establish subject knowledge. They can still enter the current scoring flow, so a paper must not treat fallback-derived topic mastery as a valid subject assessment. Generation provenance and question quality need explicit handling in an evaluation.

Chat quizzes and report-studio practice are separate experiences; only the persisted diagnostic submission path inspected here demonstrably performs this complete backend update loop.

## 16. Exact mastery calculations

For a topic:

`accuracy = 100 × correct answers / graded questions`

First recorded mastery equals first accuracy. Subsequent mastery is:

`new mastery = 0.40 × previous mastery + 0.60 × latest accuracy`

Example: previous mastery 50 and latest accuracy 80 produce new mastery 68. This is a recency-weighted performance estimate, not a probability of knowing the topic.

Evidence confidence is:

`confidence = min(1, cumulative graded questions / 10)`

Topic labels are:

- Fewer than three graded questions: insufficient evidence.
- Mastery below 65: weak.
- Mastery from 65 to below 80: developing.
- Mastery at least 80: strong.

Trend compares latest accuracy with previous accuracy. A rise of at least ten percentage points is improving; a fall of at least ten is declining; otherwise it is stable. The first observation has insufficient trend evidence.

Confidence is an evidence-count heuristic, not a confidence interval or calibrated uncertainty model. Repeated or poor-quality items can inflate apparent confidence. Thresholds and weights are engineering choices that require empirical justification before being described as optimal.

## 17. Diagnosis and planning

Diagnosis groups strong, weak, and insufficient-evidence topics and generates rule-based explanations of priority. It does not clinically diagnose the learner.

Planning uses this priority score:

`priority = (100 − mastery) + 20 × (1 − confidence) + trend penalty + urgency`

The decline penalty is 15 for a declining topic and otherwise zero. Urgency is `2 × max(0, 14 − days remaining)`, where the current plan horizon is constrained to one through seven days. Urgency is shared across topics for a single plan and therefore does not, by itself, change their relative ordering.

Availability is chosen from a day-specific value, then a default daily value, then weekly hours divided across seven days. Tasks are allocated while at least fifteen minutes remain, with at most three tasks per day. The preferred session length is capped by the remaining daily availability. Topics are sorted by priority and cycled through; this is not a global optimisation algorithm.

If no measured mastery exists, the planner can use declared weak topics with placeholder priority values. These are scheduling defaults, not measured student performance. Plans record versions, reason, time horizon, tasks, and changes from the previous plan. The code notes incomplete old tasks but does not implement an exact carry-forward optimisation of every unfinished activity.

The planner interface provides week navigation, date selection, all/open/done filters, task checkboxes, durations, and chat assistance for a session. Task updates are persisted through the backend and only reflected as saved when the request succeeds.

Resource recommendations in this learning loop first reuse saved recommendations, then match uploaded learning sources to a topic. If necessary, they provide deterministic textbook-review and retrieval-practice guidance. This service does not perform a fresh external search for every scheduled task. Its fixed relevance values are ranking defaults, not independently measured resource quality.

## 18. Analytics

Analytics visualises recorded quiz percentages and mastery states. Labels and colour distinguish weak, developing, strong, and insufficient-evidence topics. Graph points reflect recorded attempts; a line joining them is not a continuous measurement of learning.

Distinguish three separate indicators in the paper: **quiz score** measures performance on a specific item set; **mastery estimate** smooths topic scores over time; **plan completion** measures checked-off activities. None alone proves long-term retention, conceptual transfer, or exam success.

## 19. Frontend and backend architecture

The current frontend is React and TypeScript built with Vite, not a Next.js application. React Router handles routes, Tailwind and dedicated CSS files handle styles, Framer Motion handles transitions, Lucide provides icons, and next-themes provides theme state. React Markdown and remark-gfm render conversational content. ThinkingOrb and SonarGrid supply status and decoration. Export libraries support document downloads. Three.js-related dependencies support the visual/demo components; they are not part of the learning algorithm.

The backend is Python/FastAPI with Pydantic request models. Routers expose operations, services implement learning rules, repositories execute data access, and a shared provider layer handles model calls. Source extraction and research are separate modules. HTTP streaming uses Server-Sent Events through the backend.

Conceptual flow:

```text
React interface
  ├─ Chat → authenticated chat stream → selected AI provider → text deltas
  ├─ Library / report studio → research → evidence → specialist JSON → report
  └─ Diagnostics → server scoring → mastery → diagnosis → versioned study plan
                                                ↕
                                           SQLite records
```

Structured objects connect stages. A shared evidence pack lets multiple report agents reuse retrieved material, but it does not guarantee independence between their conclusions.

## 20. API surface

| Endpoint group | Responsibility |
|---|---|
| `/health` | Process/configuration readiness information; not a successful provider-generation test |
| `/` | API identity/status; includes a development frontend reference |
| `/docs` | FastAPI API documentation |
| `/api/auth/register`, `/login`, `/me`, `/logout` | Accounts and sessions, all under `/api/auth` |
| `/api/v1/chat/stream` | Streaming conversational responses |
| `/api/v1/research/run`, `/stream` | Research results and progress events |
| `/api/v1/agents/run` | Structured specialist output |
| `/api/v1/sources/extract`, `/website` | File text extraction and website acquisition |
| Student profile and memory routes | Save preferences and aggregate learner state |
| Student source routes | Persist learning sources |
| Student quiz and attempt routes | Generate, retrieve, score, and review diagnostics |
| Student diagnosis routes | Generate/retrieve performance diagnosis |
| Student study-plan/task routes | Generate schedules, inspect history, persist completion |
| Student resource routes | Save and retrieve recommendations |

Student routes use `/api/v1/me`. Their paths include `GET/PUT /profile`, `GET /memory`, `GET/POST /sources`, `POST /sources/upload`, `POST /quizzes/generate`, `GET /quizzes/{quiz_id}`, `GET/POST /quiz-attempts`, `GET /quiz-attempts/{attempt_id}`, `POST /diagnoses`, `GET /diagnoses/latest`, `POST /study-plans`, `GET /study-plans/current`, `GET /study-plans/history`, `PATCH /plan-tasks/{task_id}`, and `GET/POST /resources`. These suffixes are relative to that prefix. Source: `backend/app/routes/student.py`.

## 21. AI providers and fallback

The provider adapter supports Gemini, Groq, OpenAI, and OpenRouter. Environment configuration determines the active provider and model. OpenAI model selection also has complexity-related rules. “openai/gpt-oss-120b” used via Groq is a model choice served through Groq, not proof that it uses the OpenAI API service.

The implemented cross-provider fallback explicitly includes Gemini-to-Groq and Groq-to-Gemini when both are configured. Do not describe this as an arbitrary four-provider failover chain or independent backup keys for every specialist. In streaming chat, fallback occurs only before content has been emitted; a mid-answer failure is reported as an interruption so unrelated model continuations are not spliced together.

Retries and fallbacks improve resilience but cannot remove quotas, guarantee uninterrupted service, or establish output quality. A configured key is not proof that it is valid, funded, or usable for the chosen model.

The proposed Perplexity Research → Analysis → Decision/Scoring → Output pipeline is future work. No active Perplexity integration was found in the inspected application code.

## 22. Data storage and authentication security

The inspected runtime uses SQLite through `backend/app/db.py`. `ESC_DATABASE_PATH` can override the default `backend/esc.db`. Tables include users, sessions, student profiles, learning sources, quizzes, quiz questions, quiz attempts, topic results, mastery states, diagnoses, study plans, learning resources, plan tasks, and schema migrations. Foreign keys connect owned records and plans; repository queries enforce ownership in the learning path.

Passwords are not stored as recoverable plaintext. Authentication derives PBKDF2-HMAC-SHA256 hashes using a random 16-byte salt and 600,000 iterations. Comparisons use `hmac.compare_digest`. Server sessions store a SHA-256 token hash, user identity, creation time, and expiration. The browser receives the raw session token and stores it in sessionStorage. Session duration is eight hours.

AI service keys are read by backend code from environment configuration. They should never appear in research-paper examples, screenshots, or committed client code.

Browser storage has separate responsibilities:

| Store | Current purpose | Qualification |
|---|---|---|
| sessionStorage | Active bearer session token | Accessible to JavaScript in the origin |
| localStorage, user/mode key | Up to thirty chat conversations | Browser-local persistence, not automatic cross-device sync |
| `esc.workspace.v1` localStorage | Up to eight documents and twelve output versions | This key is not account-scoped in the inspected module |
| SQLite | Accounts and persisted adaptive learning records | Durability depends on deployment storage |

The shared browser workspace key means source documents are not isolated by account in the same way as server-owned learning records. Clearing site data can remove browser-local history and documents. Token access by JavaScript makes XSS prevention important. No full security audit or compliance certification is established by this review.

Project instructions identify an InsForge backend project, and `@insforge/sdk` is installed. However, no active InsForge SDK use was found under the inspected frontend source/backend modules. The running architecture supported by those modules is FastAPI/SQLite. Treat the InsForge declaration as a configuration/intention discrepancy until a concrete integration is demonstrated; do not describe the current learner database as Postgres solely because the SDK is installed.

## 23. Deployment and reliability

The project has been pushed to two GitHub repositories, including the repository connected to Render. Frontend configuration uses an API base URL; the backend serves API endpoints and has configured allowed origins. Git pushes and successful deployment are different events. This reference does not confirm current deployment health, provider quota, uptime, or auto-deploy settings.

For a deployment paper, record the actual frontend URL, backend URL, build commands, database location, storage persistence, environment-variable names without values, release revision, and deployment date. Verify persistence across restart/redeployment before claiming durable hosted account storage. A production response linking to localhost is development metadata and does not itself locate the public frontend.

Reliability mechanisms visible in code include health-check warm-up, limited retries, provider error mapping, source parsing errors, request cancellation, interrupted-stream handling, and explicit insufficient-evidence states. They need runtime testing under realistic failure conditions.

## 24. Design rationale and accessibility

The visual direction uses dark surfaces, indigo/lilac accents, restrained gradients, glass blur, clear typography, thin separators, and task-specific icons. This aims to establish hierarchy while keeping the assistant central. The logo is static product identity; the orb is activity identity; the sonar field is decoration.

Reusable components include AIStatus, ChatBubble, DashboardCard, Sidebar, ProgressBar, AnalyticsChart, BrandMark, the chat input, source dialogs, and report renderers. Reuse reduces duplicated presentation logic and can improve consistency, although existing legacy report surfaces differ from the new workspace design.

Accessibility measures include labels, semantic controls, status/alert roles, keyboard focus handling, Escape dismissal, a skip link, and reduced-motion handling in several paths. Do not claim full WCAG conformance without a dedicated audit. Tiny supporting text, gradient text contrast, legacy screens, mobile overflow, and animation behaviour still require measured checks.

## 25. What can responsibly be claimed in a paper

| Defensible implementation statement | Statement requiring more evidence |
|---|---|
| ESC combines several study workflows | ESC improves all students' learning outcomes |
| Twelve role definitions exist | Twelve independently trained expert models exist |
| Report workflows retrieve and rank sources | Every answer is fact-checked and verified |
| Selected-source chat uses grounding instructions | Hallucination is impossible |
| Quiz scoring is deterministic against stored keys | Generated questions and keys are always correct |
| Plans respond to recorded performance and availability | The scheduling algorithm is optimal |
| Chat and learning data have implemented persistence paths | All data is cloud-synchronised and account-isolated |
| Gemini/Groq fallback paths exist | Multiple keys guarantee uptime or unlimited usage |
| Interface components support accessibility mechanisms | The site is certified accessible |
| Backend tests exist | Those tests passed on the current deployment |

## 26. Proposed research contribution

A reasonable contribution is the design and implementation of a unified learning workspace that combines source-aware assistance, rule-routed specialist reports, and a transparent adaptive assessment/planning loop. The distinctive engineering emphasis is linking these activities and making their states visible.

This is a system-building contribution. Novelty relative to published work requires a separate literature review. React, API integration, a dark interface, and an agent label are not independently sufficient research novelty.

Possible title:

**ESC: A Source-Aware Study Companion Integrating Specialist Assistance and Adaptive Learning Plans**

Proposed research questions:

1. Does the integrated workflow reduce time and context switching for a defined study task?
2. Does source-constrained assistance improve citation support and reduce unsupported claims compared with an unconstrained baseline?
3. How accurately does keyword routing select useful specialists for labelled student requests?
4. Do performance-based plans produce feasible and useful schedules compared with a fixed schedule?
5. How do students interpret orb status messages, source labels, and failure messages?

These are questions to investigate, not findings already obtained.

## 27. Suggested research-paper structure

1. **Abstract:** problem, implemented system, evaluation method, actual results when available, limitations.
2. **Introduction:** student workflow problem, motivation, target group, research questions.
3. **Related work:** intelligent tutoring, retrieval-grounded generation, formative assessment, self-regulated learning, agent orchestration, adaptive planning. Obtain and cite original research; this reference supplies no fabricated bibliography.
4. **Requirements and design:** student journeys, functional boundaries, interface rationale, architecture.
5. **Implementation:** routing, evidence handling, streaming, provider selection, persistence, formulas.
6. **Experimental method:** participants/data, tasks, baselines, conditions, metrics, consent, analysis plan.
7. **Results:** only measured values with uncertainty and failure cases.
8. **Discussion:** what the results support, trade-offs, alternative explanations.
9. **Limitations:** heuristic ranking, uncalibrated mastery, generic fallback items, split storage, provider dependence, unfinished integrations.
10. **Future work:** stronger retrieval, explicit verification, unified storage, improved routing and assessment.
11. **Conclusion:** contribution supported by the study.
12. **References and appendices:** source versions, representative schemas/prompts without secrets, screenshots, evaluation rubric.

## 28. Evaluation plan

| Area | Example measurement | Necessary caution |
|---|---|---|
| Usability | Task completion, time, clicks, user feedback | Define identical tasks and participant context |
| Learning | Pre-test, post-test, delayed retention, transfer questions | Use equivalent independent items and control topic difficulty |
| Grounding | Supported factual claims / assessed factual claims | Human reviewers must inspect cited passages |
| Citation quality | Correctly supporting citations / checked citations | A retrieved URL is not itself support for a claim |
| Missing-answer handling | Correct abstentions on deliberately unanswerable source questions | Include truncated documents and distractors |
| Routing | Agreement with an expert-labelled specialist set | Many prompts legitimately need multiple roles |
| Assessment | Expert ratings of question quality and answer correctness | Separate generic fallback items from subject assessment |
| Planning | Availability violations, completion, usefulness, priority agreement | Completion alone does not establish learning |
| Reliability | Success rate, fallback rate, time to first text, completion latency | Record provider/model and failure causes |
| Resource use | Tokens, API cost per task, request counts | Prices and model behaviour require contemporaneous recording |
| Accessibility | Keyboard completion and audited contrast/touch behaviour | Test real responsive layouts and assistive technology |

Suggested comparisons include a generic assistant, source-aware chat without specialist routing, and the integrated ESC workflow. These must be evaluated on equivalent tasks and clearly defined model conditions. A small formative study can support usability observations but cannot justify claims about millions of users or universal learning gains.

The repository contains tests for streaming, pre-content fallback, interruption handling, source budgets, specialist boundaries, authentication, ownership, mastery thresholds, and the adaptive flow. Their presence is useful evidence of intended invariants. This documentation task did not run them or establish a new pass count.

## 29. Future work and priority gaps

1. Align landing-page specialist names with the operational registry.
2. Connect live research to conversational chat with explicit source-mode controls.
3. Implement the proposed Perplexity research, analysis, decision, and output stages with validated handoffs.
4. Add claim-to-passage verification and honest uncertainty displays.
5. Evaluate semantic retrieval against the current lexical selection baseline.
6. Replace generic fallback diagnostics for subject assessment, or exclude them from subject-mastery updates.
7. Calibrate mastery/confidence against expert-labelled and longitudinal learning evidence.
8. Unify source and conversation persistence with consistent per-account ownership and cross-device behaviour.
9. Confirm durable hosted database storage and reconcile the declared InsForge project with the runtime architecture.
10. Add OCR, transcription, OAuth, or cloud connectors only with real implementations and clear privacy/data-flow descriptions.
11. Add persistent spaced-repetition scheduling if it becomes a product objective.
12. Measure accessibility, usability, performance, costs, and learning outcomes before making effectiveness claims.

## 30. Abstract draft without invented results

> Students using digital study tools often need to coordinate questions, learning resources, practice activities, and schedules across separate interfaces. This project presents ESC, an Enhanced Study Companion that integrates conversational assistance, source-constrained responses, specialist report generation, and an adaptive learning workflow. The system uses a React/TypeScript frontend and a FastAPI backend, with role-specific language-model instructions, external research adapters, structured output handling, and persistent learning records. Diagnostic responses are scored on the server and used to calculate topic-level performance estimates and generate availability-constrained study plans. The interface exposes source context, request progress, and recovery states through reusable components and an animated assistant indicator. This work describes the system design, implementation boundaries, and an evaluation framework for grounding quality, usability, routing, and learning support. Empirical learning benefits and comparative accuracy remain to be established through controlled evaluation.

## 31. Code evidence index

Paths below are relative to the repository root. They identify evidence for this reference, not external academic sources.

| Topic | Primary files |
|---|---|
| Routes and protection | `frontend/src/App.tsx`, `auth/RequireAuth.tsx` |
| Landing and styling | `frontend/src/pages/LandingPage.tsx`, `components/landing/HomeSections.tsx`, `components/landing/HomeFooter.tsx`, `styles/homepage.css` |
| Authentication | `frontend/src/components/AuthModal.tsx`, `components/ui/sign-in-flow-1.tsx`, `lib/localAuth.ts`, `backend/app/auth.py` |
| Navigation | `frontend/src/pages/DashboardLayout.tsx`, `components/Sidebar.tsx` |
| Conversational flow | `frontend/src/components/AssistantChat.tsx`, `utils/assistantChat.ts`, `backend/app/assistant_chat.py` |
| Roles and routing | `frontend/src/lib/studentSpecialists.ts`, `lib/dynamicAgents.ts`, `lib/modeAgents.ts` |
| Studio | `frontend/src/components/DynamicOrchestrator.tsx`, `components/AgentOutputModal.tsx` |
| Sources | `frontend/src/components/SourceLibrary.tsx`, `components/SourceSelectionModal.tsx`, `backend/app/source_extract.py` |
| Research and providers | `backend/app/research_engine.py`, `backend/app/openai_client.py`, `backend/app/main.py` |
| Learning interface | `frontend/src/components/esc/EscDashboard.tsx`, `LearningSetup.tsx`, `LearningDiagnostic.tsx`, `LearningMaterials.tsx` |
| Assessment and plans | `backend/app/services/quiz_service.py`, `mastery_service.py`, `diagnosis_service.py`, `plan_service.py`, `resource_service.py` |
| Persistent data | `backend/app/db.py`, `repositories/student_repository.py`, `routes/student.py` |
| Browser memory | `frontend/src/lib/assistantMemory.ts`, `lib/workspaceMemory.ts` |
| Interactive output | `frontend/src/components/report/StudentInteractive.tsx` and related report renderers |
| Exports | `frontend/src/utils/smartExport.ts`, `studentExport.ts`, `workspaceExport.ts` |
| Orb and background | `frontend/src/components/ui/AIStatus.tsx`, `thinking-orbs.tsx`, `OrbLoader.tsx`, `sonar-grid.tsx` |
| Dependency declarations | `frontend/package.json`, `backend/requirements.txt` |
| Existing tests | `backend/tests/test_assistant_chat.py`, `backend/tests/test_esc_learning.py` |

This reference documents behaviour supported by inspected code and flags uncertainties explicitly. Before submission, attach the actual evaluation results and a verified bibliography, reconcile advertised versus implemented capabilities, and review all first-person motivation statements for accuracy.
