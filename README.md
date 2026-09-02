<div align="center">

ESC — Enhanced Study Companion

Adaptive learning, specialist AI agents, and multi-agent workflows in one workspace.

Built with React + TypeScript + FastAPI + SQLite, with optional AI routing through Gemini, Groq, OpenAI, or OpenRouter.

</div>

Overview

ESC (Enhanced Study Companion) is an AI-powered workspace designed to do more than answer isolated prompts. It combines a persistent adaptive-learning system with specialist AI agents and structured research/business workflows.

The core student experience closes the learning loop:

Profile & goal
   ↓
Diagnostic quiz
   ↓
Server-side scoring
   ↓
Topic mastery analysis
   ↓
Diagnosis
   ↓
Personalized study plan + resources
   ↓
Task completion / re-test
   ↓
Updated mastery + new plan version

The application also includes a broader multi-agent workspace with Business, Student, and Playground modes, allowing users to launch specialized agents for research, strategy, planning, explanations, quizzes, flashcards, mind maps, resource discovery, development planning, and more.

Key Features

🎓 Adaptive Student Companion

Student profile, goals, deadlines, and daily study availability

Upload or paste learning material

Topic-based diagnostic quizzes

Correct answers remain hidden until submission

Deterministic server-side grading

Topic-level mastery and confidence tracking

Weak / developing / strong topic classification

Trend detection across repeated attempts

Personalized diagnoses

Versioned study plans based on performance and available time

Persistent task completion

Re-tests that update mastery and regenerate priorities

Recommended learning resources linked to weak areas

🧠 Student Specialist Agents

ESC includes a marketplace of learning-focused specialists:

Specialist

Purpose

StudyVault

Analyze notes, PDFs, chapters, and syllabi

ExamInsight

Analyze quiz performance and weak areas

SuccessArchitect

Create personalized study plans

Concept Clarifier

Explain difficult concepts simply

Problem Solver

Solve academic problems step by step

QuizForge

Generate quizzes and practice tests

Revision Coach

Build active-recall revision sessions

Flashcard Studio

Convert material into flashcards

MindMap Maker

Create mind maps and short notes

Resource Scout

Find relevant learning resources

Paper Pattern Analyst

Analyze supplied previous papers

GuideMinds

Help students break goals into practical actions

💼 Business Orchestrator

The workspace also supports business-focused specialists for tasks such as:

Research and market validation

Business strategy

Market analysis

Finance and pricing

Marketing

Development planning

Content strategy

Pitch preparation

🧪 Agent Playground

The Playground exposes a larger specialist library for experimenting with different agent roles, including:

Product management

Frontend architecture

Backend architecture

UI/UX

Legal/compliance analysis

Data analysis

Documentation

Presentation planning

Branding

SEO

Testing

Deployment

Risk analysis

Operations

🔎 Research & Sources

Research execution endpoint

Streaming research events

Website source extraction

File text extraction

Source-aware agent generation

Support for PDF, DOCX, spreadsheet, presentation, and text-based learning material

📤 Export Tools

The frontend includes export utilities for formats such as:

Markdown

PDF

DOCX

PPTX

XLSX

Tech Stack

Frontend

React 19

TypeScript

Vite 8

Tailwind CSS

Framer Motion

React Router

React Markdown + GFM

Lucide React

jsPDF

docx

PptxGenJS

Sheet export utilities

Backend

Python 3.11+

FastAPI

Uvicorn

SQLite

Pydantic

HTTPX

BeautifulSoup

PyPDF

python-docx

openpyxl

python-pptx

Pytest

Optional AI Providers

The backend can route generation through:

Gemini

Groq

OpenAI

OpenRouter

AI keys stay on the backend and should never be exposed through VITE_* environment variables.

Architecture

flowchart LR
    U[User] --> F[React / Vite Frontend]
    F -->|Bearer Auth + REST| B[FastAPI Backend]

    B --> A[Authentication]
    B --> R[Research / Agent Engine]
    B --> S[Student Learning API]

    S --> DB[(SQLite Learning Memory)]
    R --> AI[Optional AI Provider]
    R --> SRC[Uploaded / Website Sources]

    DB --> M[Mastery + Diagnosis]
    M --> P[Versioned Study Plan]
    P --> F

Adaptive Learning Data Flow

Authenticated user
  → profile / learning sources
  → safe quiz payload
  → server-side attempt submission
  → per-topic results
  → mastery calculation
  → diagnosis
  → study plan + matched resources
  → task completion
  → future re-test

The browser never receives the stored answer key before a quiz is submitted.

Project Structure

ESC-main/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── auth.py
│   │   ├── db.py
│   │   ├── openai_client.py
│   │   ├── research_engine.py
│   │   ├── source_extract.py
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── routes/
│   │   └── services/
│   ├── scripts/
│   │   └── seed_esc_demo.py
│   ├── tests/
│   │   └── test_esc_learning.py
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── auth/
│   │   ├── components/
│   │   │   ├── esc/
│   │   │   ├── landing/
│   │   │   ├── report/
│   │   │   ├── research/
│   │   │   └── workspaces/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── types/
│   │   └── utils/
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── ESC_ARCHITECTURE.md
│   ├── ESC_DEMO.md
│   └── ESC_IMPLEMENTATION_STATUS.md
│
├── PRD.md
├── TechnicalArchitecture.md
└── README.md

Getting Started

Prerequisites

Install:

Node.js 20+

Python 3.11+

npm

1. Clone the Repository

git clone <your-repository-url>
cd ESC-main

2. Backend Setup

Windows PowerShell

cd backend
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env

macOS / Linux

cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

You can run ESC without an AI key, although AI-backed question generation and agent capabilities are improved when a provider is configured.

3. Configure Backend Environment Variables

Edit backend/.env.

Gemini

GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash

OpenAI

OPENAI_API_KEY=your_key_here
OPENAI_DEFAULT_MODEL=gpt-4o-mini
OPENAI_FAST_MODEL=gpt-4o-mini
OPENAI_REASONING_MODEL=gpt-4o
OPENAI_FALLBACK_MODEL=gpt-4o-mini

Optional Providers

GROQ_API_KEY=your_key_here
GROQ_MODEL=openai/gpt-oss-120b

OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini

Optional Search Providers

TAVILY_API_KEY=your_key_here
BRAVE_API_KEY=your_key_here
SERPER_API_KEY=your_key_here

Other Configuration

COMET_DATABASE_PATH=./comet.db
CORS_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

Never put private provider keys in frontend VITE_* variables.

4. Start the Backend

From the backend directory:

Windows

py -3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

macOS / Linux

python3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Backend:

http://127.0.0.1:8000

Swagger API docs:

http://127.0.0.1:8000/docs

Health check:

http://127.0.0.1:8000/health

5. Frontend Setup

Open another terminal:

cd frontend
npm install

Copy the frontend environment file.

Windows PowerShell

Copy-Item .env.example .env.local

macOS / Linux

cp .env.example .env.local

Default configuration:

VITE_API_BASE_URL=http://localhost:8000

Start the frontend:

npm run dev

Open:

http://127.0.0.1:5173

API Overview

Authentication

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout

Research & Agents

POST /api/v1/research/run
POST /api/v1/research/stream
POST /api/v1/agents/run
POST /api/v1/sources/extract
POST /api/v1/sources/website

Student Learning API

Authenticated student endpoints live under /api/v1/me and include:

GET   /profile
PUT   /profile
GET   /memory
POST  /sources
GET   /sources
POST  /sources/upload
POST  /quizzes/generate
GET   /quizzes/{quiz_id}
POST  /quiz-attempts
GET   /quiz-attempts
GET   /quiz-attempts/{attempt_id}
POST  /diagnoses
GET   /diagnoses/latest
POST  /study-plans
GET   /study-plans/current
GET   /study-plans/history
PATCH /plan-tasks/{task_id}
GET   /resources
POST  /resources

Adaptive Mastery Logic

ESC uses deterministic scoring for objective quiz results.

Topic Accuracy

accuracy = correct answers / graded answers × 100

Mastery Update

For a learner's first result:

mastery = latest topic accuracy

For later attempts:

new mastery = 0.40 × previous mastery + 0.60 × latest topic accuracy

Confidence

confidence = min(1.0, cumulative graded questions / 10)

Topic Status

Condition

Status

Fewer than 3 graded questions

insufficient_evidence

Mastery < 65

weak

Mastery < 80

developing

Mastery ≥ 80

strong

A trend change of approximately ±10 percentage points is used to identify meaningful improvement or decline.

Demo Flow

A simple way to demonstrate ESC:

Register a user.

Complete the student profile.

Add a deadline and daily available study time.

Upload notes or add learning material.

Generate a diagnostic quiz for a topic.

Submit weak or incomplete answers.

Review mastery, diagnosis, resources, and generated study plan.

Complete one or more plan tasks.

Re-test the same topic with improved answers.

Compare the updated mastery and new study-plan version.

Sign out and back in to confirm that learning memory persists.

Seeded Demo Accounts

From backend/, run:

python scripts/seed_esc_demo.py

On Windows you can use:

py -3 scripts/seed_esc_demo.py

The script creates contrasting learner histories for demonstration purposes.

See docs/ESC_DEMO.md for the guided demo script.

Development Commands

Backend Tests

cd backend
pytest -q

Windows:

cd backend
py -3 -m pytest -q

Frontend Build

cd frontend
npm run build

Frontend Lint

npm run lint

Frontend Preview

npm run preview

Security Design

ESC keeps several important boundaries on the backend:

Learning data is scoped to the authenticated owner.

/api/v1/me endpoints derive student identity from authentication rather than trusting a client-supplied student ID.

Quiz answer keys are stored server-side and are not serialized in the pre-submission quiz payload.

Objective answers are graded server-side.

Database access uses owner-scoped persistence logic.

Provider API keys remain backend-only.

Uploaded source extraction is restricted by supported types and backend validation.

CORS origins can be explicitly configured for deployment.

Current Limitations

AI quality depends on the configured provider and model.

Without an AI provider, ESC can use clearly labeled fallback practice content instead of pretending generated questions are official previous-year questions.

External resources are not fetched on every learning interaction.

Some root-level COMET planning documents describe earlier architecture ideas and may not exactly match the current SQLite-based implementation. For implementation details, prefer the files under docs/ESC_* and the current source code.

Documentation

Useful project documents:

docs/ESC_ARCHITECTURE.md — implemented ESC architecture

docs/ESC_IMPLEMENTATION_STATUS.md — implementation status and verification commands

docs/ESC_DEMO.md — guided demonstration flow

PRD.md — original product requirements / COMET concept

TechnicalArchitecture.md — original architecture design document

FrontendSpecification.md — frontend specification

Future Improvements

Possible next steps for the project include:

Cloud-hosted persistent database

OAuth / social authentication

Teacher dashboards and classroom analytics

Richer spaced-repetition scheduling

More advanced learner knowledge graphs

Real-time collaborative sessions

Automated deployment pipeline

Broader source connectors

Production observability and analytics

Mobile/PWA experience

Contributing

Contributions are welcome.

A typical contribution workflow:

git checkout -b feature/your-feature
git add .
git commit -m "Add your feature"
git push origin feature/your-feature

Then open a pull request with a clear description of the change and how it was tested.

<div align="center">

ESC — turning AI assistance into a persistent learning and execution system.

</div>
