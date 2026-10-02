import logging
import os
import re
import uuid
from pathlib import Path
from typing import Optional
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel
from services.supabase import create_signed_audio_url, get_supabase_client, is_supabase_configured
from services.audio_notes import (
    create_audio_note,
    delete_audio_note,
    get_audio_note,
    list_audio_notes_summary,
    update_audio_note,
)
from services.gnani import process_audio_note_task

logger = logging.getLogger("voxa.api")

app = FastAPI(
    title="Voxa API",
    description="End-to-end audio transcription and AI summarization platform API.",
    version="1.0.0",
)

# Configure CORS: Allow deployed frontend origin via FRONTEND_URL and local dev
frontend_url_env = os.getenv("FRONTEND_URL", "").strip()
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if frontend_url_env:
    for origin in frontend_url_env.split(","):
        cleaned = origin.strip().rstrip("/")
        if cleaned and cleaned not in allowed_origins:
            allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_AUDIO_EXTENSIONS = {
    ".mp3",
    ".wav",
    ".m4a",
    ".aac",
    ".ogg",
    ".flac",
    ".webm",
    ".wma",
    ".opus",
    ".mp4",
}
STORAGE_BUCKET_NAME = "audio"


@app.get("/health")
def get_health():
    """Health check endpoint for container and deployment monitors."""
    return {"status": "ok", "service": "voxa-api"}


@app.post("/api/audio/upload")
async def upload_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language_code: Optional[str] = Form("en-IN"),
):
    """
    Uploads an audio file via multipart/form-data.

    1. Validates the incoming file (type, extension, non-empty).
    2. Streams audio to private Supabase Storage bucket 'audio'.
    3. Inserts an audio_notes metadata record into PostgreSQL (status='uploaded', progress=0).
    4. Dispatches background processing for transcription and summarization.
    5. Returns the created record immediately.
    """
    if not is_supabase_configured():
        logger.error("Supabase credentials not configured in environment.")
        raise HTTPException(
            status_code=503,
            detail="Storage service is currently unavailable. Please check system configuration.",
        )

    # Validate file presence and filename
    if not file or not file.filename or not file.filename.strip():
        raise HTTPException(
            status_code=400,
            detail="No audio file was uploaded or file name is missing.",
        )

    original_filename = Path(file.filename).name
    extension = Path(original_filename).suffix.lower()

    is_audio_mime = bool(file.content_type and file.content_type.startswith("audio/"))
    is_allowed_ext = extension in ALLOWED_AUDIO_EXTENSIONS

    if not (is_audio_mime or is_allowed_ext):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported audio format '{extension or 'unknown'}'. "
                "Please upload a valid audio file (e.g., MP3, WAV, M4A, AAC, OGG, WEBM, FLAC)."
            ),
        )

    try:
        file_bytes = await file.read()
    except Exception as exc:
        logger.error("Failed to read uploaded file stream: %s", exc)
        raise HTTPException(
            status_code=400,
            detail="Unable to read the uploaded audio file. Please try again.",
        )
    finally:
        await file.close()

    file_size = len(file_bytes)
    if file_size == 0:
        raise HTTPException(
            status_code=400,
            detail="The uploaded audio file is empty (0 bytes).",
        )

    # Generate isolated storage path: {uuid}/{safe_filename}
    file_uuid = str(uuid.uuid4())
    safe_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", original_filename).strip("_") or f"audio{extension or '.mp3'}"
    bucket_path = f"{file_uuid}/{safe_filename}"
    storage_path = f"{STORAGE_BUCKET_NAME}/{bucket_path}"

    client = get_supabase_client()
    mime_type = file.content_type if is_audio_mime else "application/octet-stream"

    # Step 1: Upload to private Supabase Storage
    try:
        client.storage.from_(STORAGE_BUCKET_NAME).upload(
            path=bucket_path,
            file=file_bytes,
            file_options={"content-type": mime_type},
        )
    except Exception as exc:
        logger.error("Storage upload to Supabase bucket '%s' failed: %s", STORAGE_BUCKET_NAME, exc)
        raise HTTPException(
            status_code=500,
            detail="Unable to upload the audio file to storage. Please try again.",
        )

    # Step 2: Create audio_notes record in PostgreSQL
    resolved_lang = (language_code or "en-IN").strip()
    try:
        created_note = create_audio_note(
            file_name=original_filename,
            storage_path=storage_path,
            file_size=file_size,
            status="uploaded",
            progress=0,
            language_code=resolved_lang,
        )
    except Exception as exc:
        logger.error("Database record creation in 'audio_notes' failed: %s", exc)
        # Rollback: Clean up orphaned uploaded storage file if DB insertion fails
        try:
            client.storage.from_(STORAGE_BUCKET_NAME).remove([bucket_path])
        except Exception as cleanup_exc:
            logger.warning("Failed to clean up storage file after DB failure: %s", cleanup_exc)

        raise HTTPException(
            status_code=500,
            detail="Unable to record audio metadata. Please try uploading again.",
        )

    # Step 3: Dispatch asynchronous background transcription with Gnani Batch STT
    background_tasks.add_task(process_audio_note_task, created_note["id"])

    return created_note


class UpdateNotePayload(BaseModel):
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None


@app.get("/api/audio/notes")
def get_all_audio_notes(archived: Optional[bool] = False):
    """
    Returns audio notes ordered by is_pinned DESC, created_at DESC (newest first).
    Excludes archived notes by default. Pass archived=True to list archived notes.
    """
    if not is_supabase_configured():
        logger.error("Supabase credentials not configured in environment.")
        raise HTTPException(
            status_code=503,
            detail="Database service is currently unavailable.",
        )
    try:
        return list_audio_notes_summary(archived=bool(archived))
    except Exception as exc:
        logger.error("Failed to retrieve audio notes: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve audio notes at this time.",
        )


@app.patch("/api/audio/notes/{note_id}")
def patch_audio_note(note_id: str, payload: UpdateNotePayload):
    """
    Updates the pinned or archived state of an audio note.
    """
    if not is_supabase_configured():
        logger.error("Supabase credentials not configured in environment.")
        raise HTTPException(
            status_code=503,
            detail="Database service is currently unavailable.",
        )

    updates = {}
    if payload.is_pinned is not None:
        updates["is_pinned"] = payload.is_pinned
    if payload.is_archived is not None:
        updates["is_archived"] = payload.is_archived

    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields provided for update.")

    try:
        updated = update_audio_note(note_id, updates)
    except Exception as exc:
        logger.error("Failed to update note %s: %s", note_id, exc)
        raise HTTPException(status_code=500, detail="Unable to update note.")

    if not updated:
        raise HTTPException(status_code=404, detail="Audio note was not found.")

    return updated


@app.delete("/api/audio/notes/{note_id}")
def delete_single_audio_note(note_id: str):
    """
    Deletes an audio note and its underlying file in Supabase Storage.
    Returns 404 if not found.
    Handles partial failure carefully.
    """
    if not is_supabase_configured():
        logger.error("Supabase credentials not configured in environment.")
        raise HTTPException(
            status_code=503,
            detail="Database service is currently unavailable.",
        )

    # 1. Verify existence
    try:
        existing = get_audio_note(note_id)
    except Exception as exc:
        logger.error("Failed to check note before deletion: %s", exc)
        raise HTTPException(status_code=500, detail="Unable to process deletion request.")

    if not existing:
        raise HTTPException(status_code=404, detail="Audio note was not found.")

    # 2. Perform deletion
    try:
        res = delete_audio_note(note_id)
        if not res:
            raise HTTPException(status_code=404, detail="Audio note was not found.")
        return {
            "status": "deleted",
            "id": note_id,
            "message": "Audio recording and note deleted successfully.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error deleting note %s: %s", note_id, exc)
        raise HTTPException(
            status_code=500,
            detail="Storage deletion succeeded or verified, but database deletion failed.",
        )


@app.get("/api/audio/notes/{note_id}")
def get_single_audio_note(note_id: str):
    """
    Retrieves the current status, progress, transcript, summary, and temporary signed audio_url.
    Allows clients to poll transcription progress and stream private audio playback.
    """
    if not is_supabase_configured():
        logger.error("Supabase credentials not configured in environment.")
        raise HTTPException(
            status_code=503,
            detail="Database service is currently unavailable.",
        )

    try:
        note = get_audio_note(note_id)
    except Exception as exc:
        logger.error("Database query failed for note %s: %s", note_id, exc)
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve audio note details.",
        )

    if not note:
        raise HTTPException(
            status_code=404,
            detail="Audio note was not found.",
        )

    # Generate temporary signed URL (valid for 1 hour) for private storage
    audio_url = None
    if note.get("storage_path"):
        try:
            audio_url = create_signed_audio_url(note["storage_path"], expires_in=3600)
        except Exception as sign_exc:
            logger.warning("Failed to create signed audio URL for note %s: %s", note_id, sign_exc)

    response_data = dict(note)
    response_data["audio_url"] = audio_url

    return response_data
