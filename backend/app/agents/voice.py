from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq

router = APIRouter(
    prefix="/api/v1/voice",
    tags=["Voice Agent"]
)

client = Groq(
    api_key=""
)


class VoiceRequest(BaseModel):
    message: str


SYSTEM_PROMPT = """
You are an expert AI Pharmacist.
Answer medicine queries with uses, price in India,
side effects, dosage, alternatives and prescription info.
Keep answers short and patient-friendly.
"""


@router.post("/")
async def voice_agent(data: VoiceRequest):
    try:

        # Prevent empty transcript
        if not data.message.strip():
            return {"reply": "Please speak again."}

        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",   # ✅ Supported model
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": data.message}
            ],
            temperature=0.3
        )

        reply = completion.choices[0].message.content

        return {"reply": reply}

    except Exception as e:
        print("VOICE ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
        