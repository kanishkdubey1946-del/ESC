# ESC: AI-first workspace

## Product structure

The existing React/Vite application is retained; no Next.js migration is required.
`DashboardLayout` owns navigation, responsive panels, recent conversations,
settings, and the source drawer. The latest Earth-based homepage is independent
of the assistant workspace and remains intact.

| View | Implementation | Data and behavior |
| --- | --- | --- |
| AI companion | `AssistantChat` | Real streamed answers, stop/retry, Markdown, copy, source selection, voice input |
| Overview | `EscDashboard` | Account profile, actual study tasks and progress; prompts open in chat for review |
| Study planner | `EscDashboard`, `LearningSetup` | Date filters, task completion, preferences, server-generated schedule |
| My progress | `EscDashboard`, `LearningDiagnostic` | Recorded attempts/mastery, charts and diagnostic results |
| My library | `SourceLibrary` | Browser-local source upload, text, and web-source workflows |
| Specialists | `AgentPlayground` | Select a specialist and prefill its question in chat |
| Specialist studio | `DynamicOrchestrator` | Existing multi-agent reports and exports remain available |

The saved planner uses the existing scheduling service. Conversational AI can
propose a plan, but chat text does not silently overwrite saved tasks. Learning
materials saved through `LearningMaterials` use the account API; they are separate
from the browser-local chat library. Add a document to My library to select it as
chat evidence. Empty progress screens show setup guidance, not invented scores.

## Reusable component contract

| Component | Main props | Use |
| --- | --- | --- |
| `ThinkingOrb` | `state`, `size` (20 or 64), `theme` | Canvas identity from `thinking-orbs`, with reduced-motion fallback |
| `AIStatus` | `state`, `label?`, `size?`, `compact?`, `className?` | Orb plus readable, politely announced status |
| `OrbLoader` | `state?`, `className?` | Compact orb for existing loading affordances; strips legacy spin classes |
| `ChatBubble` | `role`, `text`, `name?`, `streaming?`, `children?` | Markdown messages, entry motion, copy feedback |
| `DashboardCard` | `title?`, `eyebrow?`, `action?`, `children`, `className?` | Consistent data-card structure |
| `Sidebar` | `view`, navigation/new-chat/settings callbacks, recent chats | Main workspace navigation |
| `ProgressBar` | `value`, `max?`, `label?`, `detail?` | Clamped progress with accessible numeric state |
| `AnalyticsChart` | `data: {label, value}[]`, `label?`, `color?` | SVG chart with a meaningful empty state |

Shared primitives live in `frontend/src/components/ui`. Workspace styles live in
`frontend/src/styles/workspace.css`; study screens also use Tailwind utilities.
The visual baseline is charcoal `#101114`, panel `#19191f`, lavender `#b7a1f8`,
primary text `#f2f0f7`, muted text `#96949f`, and translucent borders. Preserve
semantic error/success colors rather than expressing every state in lavender.

## Orb state mapping

| State | Meaning | Examples |
| --- | --- | --- |
| `searching` | Finding resources or thinking | Preparing selected source context |
| `working` | Processing data | Upload processing and saving task changes |
| `solving` | Generating an answer | Waiting for the first provider content |
| `listening` | Waiting for input | Welcome orb, idle companion, microphone input |
| `composing` | Writing the response | Incoming text deltas and streaming messages |
| `shaping` | Building plans or insights | Plan generation and planner specialist requests |

Use real operation state, not a timer that pretends an operation completed.
Keep text alongside the orb for errors and progress; an animation alone is not
an accessible status. `AIStatus` uses `role="status"`, polite live announcements,
and a decorative canvas. Framer Motion respects reduced-motion preferences;
the orb wrapper renders a static gradient sphere when motion is reduced.

```tsx
import { AIStatus } from './components/ui/AIStatus';

<AIStatus
  state={saving ? 'working' : 'listening'}
  label={saving ? 'Saving your progress' : 'Ready for your next step'}
  compact
/>
```

## Streaming and grounding

`streamAssistantChat` sends authenticated requests to `/api/v1/chat/stream`.
The FastAPI endpoint emits newline-delimited JSON events: `status`, `sources`,
`delta`, and a terminal `complete` or `error`. Text is streamed from the provider,
not replayed with an artificial typing timer. The browser buffers partial JSON
lines, validates events, and cancels the reader when stopped or unmounted.

The server supports configured provider fallback before the first content token.
It does not append a second provider's answer to a partially written response.
Interrupted answers remain identified as incomplete and can be retried.
Provider secrets remain server-side and must not enter frontend code or commits.

Selected sources are passed as evidence with citation numbers. The system
instructs the model to answer from those sources only and acknowledge missing
information. History supplies conversational context, not additional evidence.
Large source sets are bounded and excerpted; this is not a vector-search index
or a guarantee that model output can never hallucinate. Users should verify
important claims against the displayed source references.

Conversations are saved in browser storage, partitioned by account and mode.
Study profile and progress use the existing authenticated backend. Voice input
reconstructs the current recognition result rather than repeatedly appending
interim transcripts. Microphone support depends on the browser.

## Interaction and verification

- Enter sends; Shift+Enter inserts a newline. Composition input is respected.
- Ctrl/Cmd+K starts a conversation; Escape dismisses workspace overlays.
- Navigation becomes a drawer on smaller screens; the optional context rail hides.
- Chat follows incoming text only while the reader is near the bottom.
- Stop cancels streaming; Retry regenerates an interrupted answer.
- Chat source selection is explicit, with at most 20 sources per request.

Run `npm run build` from `frontend` and
`.venv/Scripts/python.exe -m pytest tests/test_assistant_chat.py -q` from `backend`.
The 26 streaming tests cover provider event parsing, authentication, bounded
inputs, source context, cancellation, and fallback boundaries. Browser checks
should additionally cover login, real streaming, sources, and responsive views.

The frontend reads `VITE_API_BASE_URL`. Start the backend on that configured
port: this checkout currently uses 8001, although `.env.example` defaults to 8000.
The local frontend preview is `http://127.0.0.1:5173/`.
