import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from services.supabase import get_supabase_client

logger = logging.getLogger(__name__)
TABLE_NAME = "audio_notes"

BASE_COLUMNS = "id, file_name, file_size, status, progress, summary, error_message, created_at, updated_at"

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_STATE_FILE = _DATA_DIR / "notes_state.json"


def _load_persistent_state() -> Dict[str, Dict[str, Any]]:
    if not _STATE_FILE.exists():
        return {}
    try:
        with open(_STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        logger.warning("Could not read notes state file: %s", exc)
        return {}


def _save_persistent_state(state: Dict[str, Dict[str, Any]]) -> None:
    try:
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(_STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception as exc:
        logger.warning("Could not write notes state file: %s", exc)


def _get_note_metadata(note_id: str) -> Dict[str, Any]:
    state = _load_persistent_state()
    return state.get(note_id, {})


def _update_note_metadata(note_id: str, updates: Dict[str, Any]) -> None:
    state = _load_persistent_state()
    current = state.get(note_id, {})
    current.update(updates)
    state[note_id] = current
    _save_persistent_state(state)


def _delete_note_metadata(note_id: str) -> None:
    state = _load_persistent_state()
    if note_id in state:
        del state[note_id]
        _save_persistent_state(state)


def _enrich_note(note: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enriches a note dictionary with is_pinned, is_archived, and language_code.
    Ensures backwards compatibility if database migration is pending.
    """
    n = dict(note)
    meta = _get_note_metadata(n["id"])

    if "is_pinned" in n and n["is_pinned"] is not None:
        n["is_pinned"] = bool(n["is_pinned"])
    else:
        n["is_pinned"] = bool(meta.get("is_pinned", False))

    if "is_archived" in n and n["is_archived"] is not None:
        n["is_archived"] = bool(n["is_archived"])
    else:
        n["is_archived"] = bool(meta.get("is_archived", False))

    if "language_code" not in n or not n.get("language_code"):
        n["language_code"] = meta.get("language_code") or "en-IN"

    return n


def create_audio_note(
    file_name: str,
    storage_path: str,
    file_size: Optional[int] = None,
    status: str = "uploaded",
    progress: int = 0,
    language_code: Optional[str] = "en-IN",
    is_pinned: bool = False,
    is_archived: bool = False,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Inserts a new record into public.audio_notes.
    Returns the created record.
    Gracefully handles environments where column migrations are pending.
    """
    client = get_supabase_client()
    chosen_lang = (language_code or "en-IN").strip()

    payload: Dict[str, Any] = {
        "file_name": file_name,
        "storage_path": storage_path,
        "status": status,
        "progress": progress,
        "language_code": chosen_lang,
        "is_pinned": is_pinned,
        "is_archived": is_archived,
    }
    if file_size is not None:
        payload["file_size"] = file_size

    payload.update(kwargs)

    try:
        response = client.table(TABLE_NAME).insert(payload).execute()
        if response.data and len(response.data) > 0:
            rec = response.data[0]
            _update_note_metadata(
                rec["id"],
                {"language_code": chosen_lang, "is_pinned": is_pinned, "is_archived": is_archived},
            )
            return _enrich_note(rec)
    except Exception as exc:
        err_str = str(exc)
        logger.warning(
            "Column mismatch on insert (pending migration): %s. Retrying with basic fields.",
            err_str,
        )
        # Strip all newly added columns if DB table doesn't have them yet
        for col in ["language_code", "is_pinned", "is_archived"]:
            payload.pop(col, None)

        response = client.table(TABLE_NAME).insert(payload).execute()
        if response.data and len(response.data) > 0:
            rec = response.data[0]
            _update_note_metadata(
                rec["id"],
                {"language_code": chosen_lang, "is_pinned": is_pinned, "is_archived": is_archived},
            )
            return _enrich_note(rec)

    raise RuntimeError("Failed to insert record into audio_notes table: no record returned.")


def get_audio_note(note_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves a single audio note by its UUID id.
    Returns None if not found.
    """
    client = get_supabase_client()
    response = client.table(TABLE_NAME).select("*").eq("id", note_id).execute()
    if response.data and len(response.data) > 0:
        return _enrich_note(response.data[0])
    return None


def list_audio_notes(limit: int = 50) -> List[Dict[str, Any]]:
    """
    Retrieves a list of audio notes ordered by created_at descending.
    """
    client = get_supabase_client()
    response = (
        client.table(TABLE_NAME)
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    notes = response.data or []
    return [_enrich_note(n) for n in notes]


def list_audio_notes_summary(archived: bool = False, limit: int = 100) -> List[Dict[str, Any]]:
    """
    Retrieves summary list of audio notes.
    - Excludes full transcript to keep payload lightweight.
    - If archived=False, excludes archived notes.
    - If archived=True, returns only archived notes.
    - Orders: 1. pinned notes (newest first), 2. unpinned notes (newest first).
    """
    client = get_supabase_client()

    # Try selecting with is_pinned and is_archived from DB if columns exist
    try:
        columns = f"{BASE_COLUMNS}, language_code, is_pinned, is_archived"
        response = (
            client.table(TABLE_NAME)
            .select(columns)
            .eq("is_archived", archived)
            .order("is_pinned", desc=True)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        raw_notes = response.data or []
        return [_enrich_note(n) for n in raw_notes]
    except Exception as exc:
        logger.debug(
            "DB column query for is_pinned/is_archived not available yet (%s), using fallback.",
            exc,
        )

    # Fallback when columns are not yet added in Supabase PostgreSQL
    try:
        response = (
            client.table(TABLE_NAME)
            .select(BASE_COLUMNS)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        raw_notes = response.data or []
        enriched = [_enrich_note(n) for n in raw_notes]

        # Filter by archive state
        filtered = [n for n in enriched if n.get("is_archived") == archived]

        # Sort: pinned notes first (newest first), then unpinned notes (newest first)
        filtered.sort(
            key=lambda item: (1 if item.get("is_pinned") else 0, item.get("created_at") or ""),
            reverse=True,
        )
        return filtered
    except Exception as exc:
        logger.error("Failed to list audio notes summary: %s", exc)
        raise


def update_audio_note(note_id: str, fields: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Updates the specified fields for an audio note by note_id.
    Returns the updated record, or None if not found.
    """
    existing = get_audio_note(note_id)
    if not existing:
        return None

    client = get_supabase_client()
    payload = dict(fields)

    # Persist in local metadata store immediately
    _update_note_metadata(note_id, payload)

    # Attempt to update in Supabase table
    db_payload = dict(payload)
    try:
        response = client.table(TABLE_NAME).update(db_payload).eq("id", note_id).execute()
        if response.data and len(response.data) > 0:
            return _enrich_note(response.data[0])
    except Exception as exc:
        err_str = str(exc)
        logger.warning(
            "Supabase table update encountered column error (%s). Updating basic columns.",
            err_str,
        )
        for col in ["is_pinned", "is_archived", "language_code"]:
            if col in err_str:
                db_payload.pop(col, None)
        if db_payload:
            try:
                response = client.table(TABLE_NAME).update(db_payload).eq("id", note_id).execute()
                if response.data and len(response.data) > 0:
                    return _enrich_note(response.data[0])
            except Exception as inner_exc:
                logger.error("Fallback update also failed: %s", inner_exc)

    existing.update(payload)
    return _enrich_note(existing)


def delete_audio_note(note_id: str) -> Optional[Dict[str, Any]]:
    """
    Deletes an audio note by note_id:
    1. Finds the note in Postgres. Returns None if not found.
    2. Deletes the corresponding audio file from Supabase Storage using storage_path.
    3. Deletes the database record.
    4. Handles partial failure (raises RuntimeError if database deletion fails).
    """
    note = get_audio_note(note_id)
    if not note:
        return None

    client = get_supabase_client()

    # Step 1: Storage removal if storage_path is present
    storage_path = note.get("storage_path")
    if storage_path:
        bucket_name, _, bucket_path = storage_path.partition("/")
        if bucket_name and bucket_path:
            try:
                client.storage.from_(bucket_name).remove([bucket_path])
                logger.info("Removed storage object '%s' for note %s", storage_path, note_id)
            except Exception as storage_exc:
                logger.warning(
                    "Storage removal failed for '%s' (note %s): %s",
                    storage_path,
                    note_id,
                    storage_exc,
                )

    # Step 2: Database record deletion
    try:
        del_response = client.table(TABLE_NAME).delete().eq("id", note_id).execute()
        # Verify deletion occurred
        if not del_response.data or len(del_response.data) == 0:
            logger.warning("Database delete returned empty data for note %s", note_id)
    except Exception as db_exc:
        logger.error("Database deletion failed for note %s: %s", note_id, db_exc)
        raise RuntimeError(f"Database deletion failed: {db_exc}")

    # Step 3: Remove from persistent metadata store
    _delete_note_metadata(note_id)

    return {"id": note_id, "file_name": note.get("file_name")}
