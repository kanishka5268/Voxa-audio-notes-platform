import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from supabase import create_client, Client

# Ensure .env is loaded from the backend directory
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"
load_dotenv(dotenv_path=_ENV_FILE)

# Cached client instance
_supabase_client: Optional[Client] = None


def is_supabase_configured() -> bool:
    """Checks whether Supabase environment variables are provided."""
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    return bool(url and key)


def get_supabase_client() -> Client:
    """
    Initializes and returns a cached Supabase client using server-side credentials.
    Uses SUPABASE_SERVICE_ROLE_KEY to interact with PostgreSQL and private Storage.
    Raises RuntimeError if credentials are not set.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not supabase_url or not supabase_service_role_key:
        raise RuntimeError(
            "Supabase credentials are not configured. Please set SUPABASE_URL "
            "and SUPABASE_SERVICE_ROLE_KEY in backend/.env"
        )

    _supabase_client = create_client(supabase_url, supabase_service_role_key)
    return _supabase_client


def verify_storage_access(bucket_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Verifies that the private Supabase storage bucket can be accessed by the backend.
    Checks bucket access without uploading any files.
    Supports either 'audio' or 'audio-files' bucket names.
    """
    client = get_supabase_client()

    # List all buckets accessible to this service role key
    buckets = client.storage.list_buckets()
    available_names = [getattr(b, "name", getattr(b, "id", str(b))) for b in buckets]

    # Select target bucket name ('audio' or 'audio-files' or specified)
    target = bucket_name
    if not target:
        if "audio" in available_names:
            target = "audio"
        elif "audio-files" in available_names:
            target = "audio-files"
        else:
            target = "audio"

    # Verify retrieval of target bucket metadata
    bucket = client.storage.get_bucket(target)

    return {
        "status": "ok",
        "bucket": target,
        "is_public": getattr(bucket, "public", False),
        "available_buckets": available_names,
    }


def create_signed_audio_url(storage_path: str, expires_in: int = 3600) -> Optional[str]:
    """
    Generates a temporary signed download URL for private storage.
    Expects storage_path in format: 'audio/<uuid>/<filename>'.
    Returns the signed URL string or None if generation fails.
    """
    if not storage_path:
        return None
    try:
        client = get_supabase_client()
        bucket_name, _, bucket_path = storage_path.partition("/")
        if not bucket_name or not bucket_path:
            return None
        res = client.storage.from_(bucket_name).create_signed_url(bucket_path, expires_in=expires_in)
        if isinstance(res, dict):
            return res.get("signedURL") or res.get("signedUrl")
        elif isinstance(res, str):
            return res
        return None
    except Exception:
        return None

