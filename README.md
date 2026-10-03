# Voxa

Voxa is a multilingual audio transcription and AI summarization platform. It enables users to upload audio files in various formats, transcribe spoken speech using Gnani AI's Prisma v2.5 Batch Speech-to-Text engine, and generate grounded summaries using Groq Cloud LLM inference.

---

## Live Demo

**[Voxa — Live Application](https://voxa-audio-notes-platform.vercel.app/)**

The frontend is deployed on Vercel and the backend is deployed on Render.

---

## Features

- **Audio Upload**: Drag-and-drop workspace supporting MP3, WAV, M4A, AAC, OGG, WEBM, FLAC, OPUS, and MP4 up to 100MB.
- **Gnani-Powered Transcription**: Production speech-to-text powered by Gnani AI's Prisma v2.5 Batch API.
- **Multilingual Transcription**: Supports Indian languages including English (India), Hindi, Bengali, Kannada, Malayalam, Marathi, Tamil, and Telugu.
- **AI-Generated Summaries**: Grounded AI summaries generated with Groq LLM inference, with summary length adapted to the transcript and generated in the transcript's language.
- **Background Processing**: Asynchronous processing using FastAPI BackgroundTasks, allowing uploads to return without waiting for transcription and summarization.
- **Upload History**: Sidebar list displaying recent audio recordings, language tags, timestamps, and status indicators.
- **Private Audio Playback**: In-browser audio streaming using secure, time-limited signed URLs from private object storage.
- **Transcript Viewing**: Complete text container with line-height readability and 1-click clipboard copy.
- **Summary Viewing**: Highlighted synthesis card with 1-click clipboard copy.
- **Light/Dark Mode**: First-class theme support with Light mode as default and persistent localStorage theme toggle.

---

## Architecture

```text
User
 |
 v
Next.js Frontend (Vercel)
 |
 | multipart/form-data
 v
FastAPI REST API (Render)
 |
 +--> Supabase Storage
 |
 +--> Supabase PostgreSQL
 |
 v
Background Processing
(FastAPI BackgroundTasks)
 |
 +--> Gnani Batch STT
 |
 +--> Groq LLM
 |
 v
Supabase PostgreSQL
 |
 v
Frontend Detail View
```

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Language**: TypeScript
- **Styling**: Vanilla CSS & Tailwind CSS
- **Typography**: DM Serif Display (headings), DM Sans (UI & body)
- **Deployment**: Vercel

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.9+
- **ASGI Server**: Uvicorn
- **Task Runner**: FastAPI BackgroundTasks
- **Deployment**: Render / Container

### Database & Storage
- **Database**: Supabase PostgreSQL (`public.audio_notes`)
- **Storage**: Supabase Storage (Private `audio` bucket with signed URLs)

### AI Services
- **Speech-to-Text**: Gnani AI Prisma v2.5 Batch STT API
- **Summarization**: Groq Cloud LLM Inference (`openai/gpt-oss-20b`)

---

## Processing Flow

1. **Client Upload**: The user drops an audio file onto the Voxa dropzone and selects a language (or auto-detect).
2. **Storage Ingestion**: FastAPI receives the file, uploads the raw binary to private Supabase Storage, and creates a metadata record in PostgreSQL with `status="uploaded"` and `progress=0`.
3. **Immediate Response**: After validating the file, storing it in Supabase Storage, and creating the note record, FastAPI schedules background processing and returns the note record without waiting for transcription or summarization.
4. **Gnani Batch Job**: The background task sends the audio bytes to Gnani AI, creates a batch transcription job with the specified language, and triggers the job start.
5. **Asynchronous Polling**: The background task polls Gnani until completion, updating database progress monotonically (`progress: 25% -> 70%`).
6. **Transcript Extraction**: Upon completion, the background task downloads and extracts the raw transcript text.
7. **Groq Summarization**: The transcript is submitted to Groq's OpenAI-compatible inference API with a language-aware prompt to generate a grounded summary adapted to the transcript (`progress: 85%`).
8. **Final Persistence**: The database record is marked as `completed` with `progress: 100`, committing the final transcript and summary.
9. **Client Presentation**: The frontend poll resolves, rendering the private audio player, AI summary card, and readable transcript.

---

## Local Development

### Prerequisites
- Node.js 18.18+ or 20+
- Python 3.9+
- Supabase account (Database & Storage bucket `audio`)
- Gnani AI API key
- Groq API key

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Edit `backend/.env` with your actual service credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GNANI_API_KEY=your-gnani-api-key
GROQ_API_KEY=your-groq-api-key
FRONTEND_URL=http://localhost:3000
```

Start the backend:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment

### Frontend (Vercel)
- Connect repository to Vercel with Root Directory set to `frontend`.
- Environment Variable: `NEXT_PUBLIC_API_URL=https://voxa-backend-fbdy.onrender.com`).
- Build Command: `npm run build`.

### Backend (Render)
- Deploy as a Web Service on Render with Root Directory set to `backend`.
- Build Command: `pip install -r requirements.txt`.
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- Environment Variables:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GNANI_API_KEY`
  - `GROQ_API_KEY`
  - `FRONTEND_URL=https://voxa-audio-notes-platform.vercel.app`

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health check |
| `POST` | `/api/audio/upload` | Multipart audio file upload (`file`, `language_code`) |
| `GET` | `/api/audio/notes` | Summary list of notes ordered by `created_at DESC` |
| `GET` | `/api/audio/notes/{note_id}` | Detailed note status, progress, transcript, summary, and signed audio URL |
| `GET` | `/docs` | Interactive OpenAPI / Swagger UI documentation |

---

## Design Decisions

- **Why Background Processing**: Speech transcription and LLM inference can take longer than a normal HTTP request, so processing is moved into FastAPI BackgroundTasks rather than keeping the upload request open.
- **Why Polling**: Lightweight interval polling (`GET /api/audio/notes/{id}` every 3 seconds) offers resilience across network switches and stateless container instances without the operational complexity or connection management of WebSockets.
- **Why Supabase Storage**: Dedicated object storage keeps large binary audio files outside PostgreSQL and allows the backend to generate time-limited signed URLs for private audio playback.
- **Why Gnani Batch STT**: Gnani's Batch STT API provides an asynchronous job workflow suited to longer audio files, allowing the backend to create, start, and poll transcription jobs.
- **Why Groq**: Groq Cloud LLM inference is used to generate grounded summaries after transcription completes.

---

## Limitations

- **Single-Worker Execution**: Current background tasks run in-process using FastAPI `BackgroundTasks`. While lightweight and dependency-free, task execution does not survive backend container restarts.
- **Client Polling**: The frontend uses short polling instead of push notifications (SSE or WebSockets).
- **No User Authentication**: All uploaded notes in this deployment are shared in a unified workspace without multi-tenant user authentication.

---

## Future Improvements

- **Distributed Task Queue**: Migrate in-process worker to Celery + Redis or BullMQ for horizontal worker auto-scaling and persistent job queues.
- **Real-Time Push Notifications**: Implement Server-Sent Events (SSE) or WebSockets to replace client polling.
- **Pre-Computed Waveform Peaks**: Compute audio amplitude peaks during ingestion for interactive scrubbable waveform players.
- **Multi-Tenant Authentication**: Add Supabase Auth with Row-Level Security (RLS) policies for user data isolation.
- **Automated Retry Policies**: Implement exponential backoff for transient third-party provider rate limits.
