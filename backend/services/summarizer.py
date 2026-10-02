"""
Groq LLM Summarization Service.
Uses Groq's OpenAI-compatible API to generate concise summaries from transcripts in the same language.
"""

import logging
import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_MODEL = "openai/gpt-oss-20b"

SYSTEM_PROMPT = (
    "You are an AI assistant that produces clear, accurate, and well-structured summaries of transcribed audio recordings.\n"
    "Guidelines:\n"
    "- Summarize ONLY information explicitly present in the transcript. Do not invent details, extrapolate, or assume information not provided.\n"
    "- Generate the summary in the same language as the transcript. Do not translate unless explicitly requested.\n"
    "- Capture the major topics, key points, and important technical terms from the transcript rather than compressing everything into one overly dense sentence.\n"
    "- Keep the summary readable: use short paragraphs or concise bullet points where appropriate when multiple distinct topics are discussed.\n"
    "- Avoid unnecessary repetition and conversational filler.\n"
    "- The summary must be fully complete and conclude naturally with a complete sentence. It must NEVER stop in the middle of a sentence.\n"
    "- Return only the summary text directly, without introductory preamble or headings such as 'Summary:'."
)


def _get_adaptive_length_guidelines(words: int) -> tuple:
    """
    Returns an adaptive length instruction and token ceiling based on transcript length:
    - Short (< 60 words): ~2-3 sentences, max_tokens=600
    - Medium (60-250 words): ~100-150 words, max_tokens=1000
    - Long (250-800 words): ~150-250 words, max_tokens=1500
    - Very long (> 800 words): ~250-350 words, max_tokens=2048
    """
    if words < 60:
        return "Write a concise summary in approximately 2 to 3 sentences.", 600
    elif words < 250:
        return "Write a well-structured summary of approximately 100 to 150 words.", 1000
    elif words < 800:
        return "Write a comprehensive, well-structured summary of approximately 150 to 250 words.", 1500
    else:
        return "Write a comprehensive, well-structured summary of approximately 250 to 350 words.", 2048


def _get_groq_api_key() -> str:
    """Retrieve GROQ_API_KEY from environment without exposing it."""
    backend_dir = Path(__file__).resolve().parent.parent
    env_file = backend_dir / ".env"
    if env_file.exists():
        load_dotenv(dotenv_path=env_file)
    else:
        load_dotenv()

    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured in backend environment.")
    return api_key


def generate_summary(
    transcript: str,
    language_code: Optional[str] = "en-IN",
    model: str = DEFAULT_MODEL,
) -> str:
    """
    Generates an adaptive, comprehensive summary of the provided transcript using Groq in the same language.

    Args:
        transcript: Text transcript to summarize.
        language_code: Language of the transcript (e.g., 'en-IN', 'hi-IN', 'ta-IN').
        model: Groq model identifier (defaults to 'openai/gpt-oss-20b').

    Returns:
        Summary text string.
    """
    if not transcript or not transcript.strip():
        logger.info("Empty or whitespace transcript provided. Skipping summary generation.")
        return ""

    api_key = _get_groq_api_key()

    try:
        from openai import OpenAI, OpenAIError
    except ImportError as exc:
        raise RuntimeError("The 'openai' client package is not installed.") from exc

    client = OpenAI(
        api_key=api_key,
        base_url=BASE_URL,
    )

    words = len(transcript.strip().split())
    length_instruction, dynamic_max_tokens = _get_adaptive_length_guidelines(words)

    user_prompt = (
        f"Transcript:\n{transcript.strip()}\n\n"
        f"Length requirement: {length_instruction}\n"
        "Ensure all major topics are covered and the summary concludes naturally with a complete sentence."
    )
    if language_code:
        user_prompt = f"Language code: {language_code}\nPlease write the summary in this language.\n\n" + user_prompt

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=dynamic_max_tokens,
        )
    except OpenAIError as exc:
        safe_msg = str(exc)
        if api_key in safe_msg:
            safe_msg = safe_msg.replace(api_key, "[REDACTED]")
        logger.error("Groq API error during summarization: %s", safe_msg)
        raise RuntimeError(f"Groq API error: {safe_msg}") from exc
    except Exception as exc:
        safe_msg = str(exc)
        if api_key in safe_msg:
            safe_msg = safe_msg.replace(api_key, "[REDACTED]")
        logger.error("Unexpected error during summarization: %s", safe_msg)
        raise RuntimeError(f"Summarization failed: {safe_msg}") from exc

    if not response.choices or not response.choices[0].message.content:
        raise RuntimeError("Groq returned an empty completion response.")

    summary = response.choices[0].message.content.strip()

    # Clean off any stray leading header like "Summary:" if the model outputs it
    if summary.lower().startswith("summary:"):
        summary = summary[8:].strip()

    return summary
