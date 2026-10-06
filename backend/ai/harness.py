import os
import json
import httpx
from pydantic import BaseModel, Field, ValidationError

class TriageResult(BaseModel):
    hazard_type: str = Field(description="Flood, Fire, Structural, Medical, or Weather")
    severity_score: int = Field(ge=1, le=5)
    evacuation_needed: bool
    action_plan: str

class ResQNetHarness:
    """
    Provider-agnostic AI harness compliant with Hacktoberfest Open-Source track.
    Routes between Cloud Gemma 4 (Gemini API) and Edge Local Gemma (Ollama).
    """
    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "gemini")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")

    async def execute_triage(self, description: str, image_base64: str = None) -> dict:
        system_prompt = (
            "You are an emergency disaster triage AI adhering to the disaster-triage Agent Skill. "
            "Analyze the situation and return strictly valid JSON matching this structure: "
            '{"hazard_type": "Flood|Fire|Structural|Medical|Weather", "severity_score": 1-5, '
            '"evacuation_needed": true|false, "action_plan": "concise bulleted survival instructions"}. '
            "Output ONLY the JSON object, with no markdown code blocks or conversational text."
        )
        user_content = f"Field Incident Report: {description}"

        # 1. Primary Attempt: Gemini API (Gemma 4)
        if self.provider == "gemini" and self.gemini_key:
            try:
                return await self._call_gemini_api(system_prompt, user_content, image_base64)
            except Exception as e:
                print(f"[Harness Alert] Gemini API failed: {e}. Falling back to local Ollama...")

        # 2. Resilient Fallback: Local Ollama Edge Inference
        try:
            return await self._call_ollama(system_prompt, user_content)
        except Exception as e:
            print(f"[Harness Error] Local edge inference failed: {e}")
            return {
                "hazard_type": "Unknown",
                "severity_score": 3,
                "evacuation_needed": False,
                "action_plan": "Local AI offline. Follow local municipal radio alerts and remain in a secure shelter."
            }

    async def _call_gemini_api(self, system_prompt: str, user_content: str, image_base64: str = None) -> dict:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.gemini_key}"
        parts = [{"text": f"{system_prompt}\n\n{user_content}"}]
        
        if image_base64:
            clean_b64 = image_base64.split(",")[-1]
            parts.append({
                "inlineData": {
                    "mimeType": "image/jpeg",
                    "data": clean_b64
                }
            })

        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(url, json={"contents": [{"parts": parts}]})
            resp.raise_for_status()
            text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            text = text.replace("```json", "").replace("```", "").strip()
            data = json.loads(text)
            return TriageResult.model_validate(data).model_dump()

    async def _call_ollama(self, system_prompt: str, user_content: str) -> dict:
        url = f"{self.ollama_host}/api/generate"
        payload = {
            "model": "gemma4:4b",
            "prompt": f"{system_prompt}\n\n{user_content}",
            "stream": False,
            "format": "json"
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = json.loads(resp.json()["response"])
            return TriageResult.model_validate(data).model_dump()
