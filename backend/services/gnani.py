"""
Gnani Batch STT Service & Background Task Orchestration.
Integrates the verified Gnani Batch STT pipeline with Supabase Storage and PostgreSQL.
"""

import json
import logging
import mimetypes
import os
import time
from typing import Any, Dict
import requests

from services.audio_notes import get_audio_note, update_audio_note
from services.supabase import get_supabase_client
from services.summarizer import generate_summary

logger = logging.getLogger(__name__)

BASE_URL = "https://api.vachana.ai/stt/v3/batch"
STEP_DELAY_SECONDS = 10
POLL_INTERVAL_SECONDS = 10
TERMINAL_STATUSES = {"COMPLETED", "PARTIAL_FAILURE", "FAILED", "START_FAILED", "CANCELLED"}


def _get_gnani_api_key() -> str:
    """Retrieve GNANI_API_KEY from environment without exposing it."""
    api_key = os.getenv("GNANI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("GNANI_API_KEY is not configured in backend/.env")
    return api_key


def _create_batch_job(api_key: str, file_name: str, audio_bytes: bytes, language_code: str = "en-IN") -> str:
    """Step 1: Create a batch transcription job with Gnani API using audio bytes and language_code."""
    url = f"{BASE_URL}/jobs"
    headers = {"X-API-Key-ID": api_key}

    config = {
        "model": "gnani-prisma-v2.5",
        "language_code": language_code or "en-IN",
        "mode": "transcribe",
        "with_diarization": False,
        "is_multi_channel": False,
    }

    mime_type, _ = mimetypes.guess_type(file_name)
    if not mime_type:
        mime_type = "audio/wav"

    files = [
        ("config", (None, json.dumps(config), "application/json")),
        ("files", (file_name, audio_bytes, mime_type)),
    ]

    try:
        response = requests.post(url, headers=headers, files=files, timeout=60)
    except requests.exceptions.RequestException as exc:
        raise RuntimeError(f"Network error while creating Gnani batch job: {exc}") from exc

    if response.status_code == 429:
        raise RuntimeError("Gnani API rate limit reached (HTTP 429) during job creation.")

    try:
        data = response.json()
    except ValueError:
        raise RuntimeError(f"Gnani create job returned non-JSON response (HTTP {response.status_code}).")

    if response.status_code not in (200, 201):
        err_detail = data.get("message") or data.get("error") or str(data)
        raise RuntimeError(f"Gnani create job failed (HTTP {response.status_code}): {err_detail}")

    job_id = data.get("job_id")
    if not job_id:
        raise RuntimeError(f"Gnani create job response missing 'job_id': {data}")

    return job_id


def _start_batch_job(api_key: str, job_id: str) -> None:
    """Step 2: Start the created batch transcription job."""
    url = f"{BASE_URL}/jobs/{job_id}/start"
    headers = {"X-API-Key-ID": api_key}

    try:
        response = requests.post(url, headers=headers, timeout=30)
    except requests.exceptions.RequestException as exc:
        raise RuntimeError(f"Network error while starting Gnani job: {exc}") from exc

    if response.status_code == 429:
        raise RuntimeError("Gnani API rate limit reached (HTTP 429) during job start.")

    try:
        data = response.json()
    except ValueError:
        data = {"raw_text": response.text[:300]}

    if response.status_code not in (200, 202):
        err_detail = data.get("message") or data.get("error") or str(data)
        raise RuntimeError(f"Gnani start job failed (HTTP {response.status_code}): {err_detail}")


def _poll_batch_job(api_key: str, job_id: str) -> str:
    """Step 3: Poll the batch job status every 10 seconds until terminal status."""
    url = f"{BASE_URL}/jobs/{job_id}"
    headers = {"X-API-Key-ID": api_key}

    while True:
        try:
            response = requests.get(url, headers=headers, timeout=30)
        except requests.exceptions.RequestException as exc:
            logger.warning("Network issue during polling: %s. Retrying in %ss...", exc, POLL_INTERVAL_SECONDS)
            time.sleep(POLL_INTERVAL_SECONDS)
            continue

        if response.status_code == 429:
            logger.warning("Rate limit hit during polling (HTTP 429). Retrying in %ss...", POLL_INTERVAL_SECONDS)
            time.sleep(POLL_INTERVAL_SECONDS)
            continue

        if response.status_code != 200:
            raise RuntimeError(f"Unexpected HTTP {response.status_code} while polling job status.")

        try:
            data = response.json()
        except ValueError:
            raise RuntimeError("Non-JSON response received while polling Gnani job status.")

        status = data.get("status")
        logger.info("Gnani job %s status: %s", job_id, status)

        if status in TERMINAL_STATUSES:
            if status != "COMPLETED":
                error_msg = data.get("message") or data.get("error") or f"Job ended with status: {status}"
                raise RuntimeError(f"Gnani job {job_id} failed with status '{status}': {error_msg}")
            return status

        time.sleep(POLL_INTERVAL_SECONDS)


def _retrieve_transcript_url(api_key: str, job_id: str) -> str:
    """Step 4: Retrieve the transcript URL from completed job files."""
    url = f"{BASE_URL}/jobs/{job_id}/files?status=COMPLETED"
    headers = {"X-API-Key-ID": api_key}

    try:
        response = requests.get(url, headers=headers, timeout=30)
    except requests.exceptions.RequestException as exc:
        raise RuntimeError(f"Network error while retrieving completed files: {exc}") from exc

    if response.status_code == 429:
        raise RuntimeError("Gnani API rate limit reached (HTTP 429) during files retrieval.")

    if response.status_code != 200:
        raise RuntimeError(f"Files request failed with HTTP {response.status_code}: {response.text[:300]}")

    try:
        data = response.json()
    except ValueError:
        raise RuntimeError("Non-JSON response received from Gnani files endpoint.")

    transcript_url = None
    if isinstance(data, dict):
        if "transcript_url" in data:
            transcript_url = data["transcript_url"]
        elif "files" in data and isinstance(data["files"], list) and len(data["files"]) > 0:
            first_file = data["files"][0]
            if isinstance(first_file, dict):
                transcript_url = first_file.get("transcript_url")
        elif "data" in data and isinstance(data["data"], list) and len(data["data"]) > 0:
            first_item = data["data"][0]
            if isinstance(first_item, dict):
                transcript_url = first_item.get("transcript_url")
    elif isinstance(data, list) and len(data) > 0:
        if isinstance(data[0], dict):
            transcript_url = data[0].get("transcript_url")

    if not transcript_url:
        raise RuntimeError(f"Could not extract 'transcript_url' from files response: {data}")

    return transcript_url


def _download_transcript(api_key: str, transcript_url: str) -> Dict[str, Any]:
    """Step 5: Download transcript JSON payload."""
    headers = {"X-API-Key-ID": api_key} if "api.vachana.ai" in transcript_url else {}

    try:
        response = requests.get(transcript_url, headers=headers, timeout=30)
        if response.status_code in (401, 403) and headers:
            response = requests.get(transcript_url, timeout=30)
    except requests.exceptions.RequestException as exc:
        raise RuntimeError(f"Network error while downloading transcript: {exc}") from exc

    if response.status_code != 200:
        raise RuntimeError(f"Failed to download transcript (HTTP {response.status_code}): {response.text[:300]}")

    try:
        return response.json()
    except ValueError:
        raise RuntimeError("Downloaded transcript is not valid JSON.")


def process_audio_note_task(note_id: str) -> None:
    """
    FastAPI BackgroundTasks worker that orchestrates the Gnani Batch STT pipeline:
    1. Retrieve note record from DB.
    2. Set status='transcribing', progress=10.
    3. Download audio bytes from private Supabase Storage.
    4. Create Gnani batch job, store gnani_job_id, progress=25.
    5. Wait 10s.
    6. Start Gnani batch job, progress=50.
    7. Wait 10s.
    8. Poll until COMPLETED (at 10s intervals).
    9. Wait 10s.
    10. Retrieve completed files, get transcript_url.
    11. Download transcript JSON.
    12. Extract full_transcript and update note: transcript=full_transcript, status='completed', progress=100.
    """
    current_progress = 0
    try:
        # a. Retrieve audio_notes row by note_id
        note = get_audio_note(note_id)
        if not note:
            logger.error("Audio note %s not found in database. Aborting task.", note_id)
            return

        api_key = _get_gnani_api_key()

        # b. Set status = "transcribing", progress = 10
        current_progress = 10
        update_audio_note(note_id, {"status": "transcribing", "progress": current_progress, "error_message": None})

        # c. Download audio from private Supabase Storage bucket
        storage_path = note.get("storage_path")
        if not storage_path:
            raise ValueError(f"Note {note_id} has no storage_path recorded.")

        bucket_name, _, bucket_path = storage_path.partition("/")
        if not bucket_name or not bucket_path:
            raise ValueError(f"Invalid storage_path format: '{storage_path}'")

        supabase_client = get_supabase_client()
        try:
            audio_bytes = supabase_client.storage.from_(bucket_name).download(bucket_path)
        except Exception as exc:
            raise RuntimeError(f"Failed to download audio from Supabase Storage bucket '{bucket_name}': {exc}") from exc

        if not audio_bytes or len(audio_bytes) == 0:
            raise ValueError(f"Downloaded audio from '{storage_path}' is empty (0 bytes).")

        file_name = note.get("file_name") or "audio.wav"
        language_code = (note.get("language_code") or "en-IN").strip()

        # d. Create Gnani Batch job
        job_id = _create_batch_job(api_key, file_name, audio_bytes, language_code=language_code)

        # e. Save returned gnani_job_id and set status="transcribing", progress=25
        current_progress = 25
        update_audio_note(
            note_id,
            {
                "gnani_job_id": job_id,
                "status": "transcribing",
                "progress": current_progress,
                "language_code": language_code,
            },
        )

        # f. Wait 10 seconds before start
        time.sleep(STEP_DELAY_SECONDS)

        # g. Start the Gnani job
        _start_batch_job(api_key, job_id)

        # h. Set status = "transcribing", progress = 50
        current_progress = 50
        update_audio_note(note_id, {"status": "transcribing", "progress": current_progress})

        # i. Wait 10 seconds before first poll
        time.sleep(STEP_DELAY_SECONDS)

        # j. Poll the Gnani job every 10 seconds until terminal state
        _poll_batch_job(api_key, job_id)

        # k. Wait 10 seconds after completion before requesting files
        time.sleep(STEP_DELAY_SECONDS)

        # l. Retrieve completed files and transcript_url
        transcript_url = _retrieve_transcript_url(api_key, job_id)

        # m. Download transcript JSON
        transcript_data = _download_transcript(api_key, transcript_url)

        # n. Extract full_transcript
        full_transcript = (
            transcript_data.get("full_transcript")
            or transcript_data.get("transcript")
            or ""
        )

        # Detect resolved language from transcript response (e.g. if auto-detected)
        resolved_lang = (
            transcript_data.get("language_code")
            or transcript_data.get("language")
            or language_code
        )

        # Step A: Save transcript to database and transition to 'summarizing' (progress = 85)
        current_progress = 85
        update_audio_note(
            note_id,
            {
                "transcript": full_transcript,
                "status": "summarizing",
                "progress": current_progress,
                "language_code": resolved_lang,
                "error_message": None,
            },
        )
        logger.info(
            "Saved transcript for note %s (status: summarizing, language: %s, progress: 85%%)",
            note_id,
            resolved_lang,
        )

        # Minimum visual duration for summarizing state (1.5 - 2s) so polling catches it
        time.sleep(1.8)

        # Step B & C: Generate summary with Groq in the matching transcript language
        summary = ""
        if not full_transcript or not full_transcript.strip():
            logger.info("Transcript is empty for note %s. Skipping Groq summary.", note_id)
            summary = "No speech detected in audio."
        else:
            try:
                summary = generate_summary(full_transcript, language_code=resolved_lang)
                update_audio_note(
                    note_id,
                    {
                        "summary": summary,
                        "progress": current_progress,
                        "language_code": resolved_lang,
                    },
                )
                logger.info("Generated summary for note %s (progress: 85%%)", note_id)
            except Exception as summary_exc:
                safe_summary_err = str(summary_exc)
                groq_key = os.getenv("GROQ_API_KEY")
                if groq_key and groq_key in safe_summary_err:
                    safe_summary_err = safe_summary_err.replace(groq_key, "[REDACTED]")
                logger.error("Summary generation failed for note %s: %s", note_id, safe_summary_err)
                update_audio_note(
                    note_id,
                    {
                        "status": "failed",
                        "progress": 85,
                        "error_message": "Transcription completed, but summary generation failed.",
                    },
                )
                return

        # Step D: Mark note completed with transcript, summary, and language_code (progress = 100)
        current_progress = 100
        update_audio_note(
            note_id,
            {
                "summary": summary,
                "status": "completed",
                "progress": current_progress,
                "language_code": resolved_lang,
                "error_message": None,
            },
        )
        logger.info("Successfully completed transcription and summarization for note %s", note_id)

    except Exception as exc:
        safe_msg = str(exc)
        gnani_key = os.getenv("GNANI_API_KEY")
        if gnani_key and gnani_key in safe_msg:
            safe_msg = safe_msg.replace(gnani_key, "[REDACTED]")
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key and groq_key in safe_msg:
            safe_msg = safe_msg.replace(groq_key, "[REDACTED]")

        logger.exception("Processing failed for note %s: %s", note_id, safe_msg)
        
        # Format user-friendly error string for database storage
        lower_err = safe_msg.lower()
        if "rate limit" in lower_err or "429" in lower_err:
            user_facing_error = "The speech recognition service is currently experiencing high demand. Please try again in a few moments."
        elif "timeout" in lower_err or "timed out" in lower_err:
            user_facing_error = "The transcription service timed out while processing this audio. Please try again."
        elif "format" in lower_err or "decode" in lower_err or "unsupported" in lower_err:
            user_facing_error = "The audio file format could not be decoded. Please upload a standard MP3, WAV, or M4A file."
        elif "summary" in lower_err or "groq" in lower_err:
            user_facing_error = "Transcription completed, but summary generation failed."
        else:
            user_facing_error = "Speech recognition could not process this audio file. Please check the recording and try again."

        try:
            update_audio_note(
                note_id,
                {
                    "status": "failed",
                    "progress": current_progress,
                    "error_message": user_facing_error,
                },
            )
        except Exception as db_exc:
            logger.error("Failed to update failure status for note %s: %s", note_id, db_exc)
