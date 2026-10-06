from abc import ABC, abstractmethod
import os
import json
import httpx
from pydantic import BaseModel, Field, ValidationError

class TriageSchema(BaseModel):
    hazard_type: str = Field(description="Flood, Fire, Structural, Medical, or Weather")
    severity_score: int = Field(ge=1, le=5)
    evacuation_needed: bool
    people_affected_estimate: str
    action_plan: str

class BaseLLMProvider(ABC):
    @abstractmethod
    async def complete(self, prompt: str, image_b64: str | None = None) -> str:
        pass

class GeminiGemmaProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model = model

    async def complete(self, prompt: str, image_b64: str | None = None) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        parts = [{"text": prompt}]
        if image_b64:
            clean_b64 = image_b64.split(",")[-1]
            parts.append({"inlineData": {"mimeType": "image/jpeg", "data": clean_b64}})

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json={"contents": [{"parts": parts}]})
            resp.raise_for_status()
            return resp.json()["candidates"][0]["content"]["parts"][0]["text"]

class OllamaGemmaProvider(BaseLLMProvider):
    def __init__(self, host: str = "http://localhost:11434", model: str = "gemma4:4b"):
        self.host = host
        self.model = model

    async def complete(self, prompt: str, image_b64: str | None = None) -> str:
        url = f"{self.host}/api/generate"
        payload = {"model": self.model, "prompt": prompt, "stream": False, "format": "json"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()["response"]

class ModelHarness:
    def __init__(self):
        self.primary = GeminiGemmaProvider(os.getenv("GEMINI_API_KEY", ""))
        self.fallback = OllamaGemmaProvider(os.getenv("OLLAMA_HOST", "http://localhost:11434"))

    async def run_structured(self, system_instruction: str, user_payload: str, image_b64: str | None = None, max_repairs: int = 2) -> dict:
        provider = self.primary
        prompt = f"{system_instruction}\n\nUser Input:\n{user_payload}\n\nOutput valid JSON matching the schema."

        for attempt in range(max_repairs + 1):
            try:
                raw = await provider.complete(prompt, image_b64)
                clean_json = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                parsed = json.loads(clean_json)
                validated = TriageSchema.model_validate(parsed)
                return {"status": "success", "provider": type(provider).__name__, "data": validated.model_dump()}
            except (ValidationError, json.JSONDecodeError) as err:
                if attempt < max_repairs:
                    prompt += f"\n\nERROR in previous attempt: {str(err)}. Fix the JSON and adhere strictly to the schema."
                else:
                    if provider == self.primary:
                        provider = self.fallback
                        prompt = f"{system_instruction}\n\nUser Input:\n{user_payload}"
                        continue
                    raise RuntimeError("Both primary and fallback providers failed structured output validation.")
            except Exception:
                provider = self.fallback
                prompt = f"{system_instruction}\n\nUser Input:\n{user_payload}"
