import os
import logging
from google import genai
from google.genai import types

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_FALLBACK_MODEL = "gemini-2.0-flash-lite"

gemini_client: genai.Client = None


def init_gemini():
    global gemini_client
    api_key = os.environ.get("GOOGLE_GEMINI_API_KEY", "")
    if api_key:
        try:
            gemini_client = genai.Client(api_key=api_key)
        except Exception as e:
            logging.error(f"Failed to initialize Gemini client: {e}")


def get_gemini_client() -> genai.Client:
    return gemini_client


async def call_llm(
    prompt: str,
    session_id: str = "default",
    system_message: str = "Você é um assistente inteligente.",
    raise_on_error: bool = False,
) -> str:
    """Call Gemini with automatic fallback to secondary model."""
    if not gemini_client:
        logging.warning("Gemini client not initialized")
        if raise_on_error:
            raise Exception("Gemini client not initialized")
        return "⚠️ Serviço de IA indisponível no momento."

    models_to_try = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL]
    last_error = None

    for model_name in models_to_try:
        try:
            response = gemini_client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(system_instruction=system_message),
            )
            return response.text
        except Exception as e:
            last_error = e
            logging.warning(f"LLM call failed with {model_name}: {e}")
            continue

    logging.error(f"All LLM models failed. Last error: {last_error}")
    if raise_on_error:
        raise last_error
    return f"⚠️ Erro ao processar sua solicitação: {str(last_error)}"
