from database import SessionLocal
from models import Conversation, Message
from database import engine
from models import Base

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from retriever import retrieve_context
from typing import Optional

import pytesseract
from PIL import Image, ImageDraw, ImageFont
import pdfplumber
import io
import base64
import os
import re
import uuid
import httpx
import requests 
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from dotenv import load_dotenv

#import google.generativeai as genai


load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

print("====APP STARTED VERSION 999====")
print("OPENROUTER KEY FOUND:", OPENROUTER_API_KEY is not None)




app = FastAPI()

Base.metadata.create_all(bind=engine)

GENERATED_DIR = "generated_files"
os.makedirs(GENERATED_DIR, exist_ok=True)
app.mount("/files", StaticFiles(directory=GENERATED_DIR), name="files")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Conversation-Id"],
)


# =========================
# SCHEMAS
# =========================

class MessageSchema(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[MessageSchema]
    conversation_id: Optional[int] = None


class GenerateRequest(BaseModel):
    content: str
    title: str = "LandResolve AI Report"
    format: str  # "pdf" or "image"


class AIImageRequest(BaseModel):
    prompt: str


# =========================
# HELPERS
# =========================

def clean_text_for_render(text: str) -> str:
    emoji_pattern = re.compile(
        "["
        u"\U0001F600-\U0001F64F"
        u"\U0001F300-\U0001F5FF"
        u"\U0001F680-\U0001F9FF"
        u"\U00002702-\U000027B0"
        u"\U000024C2-\U0001F251"
        u"\u2764\u2665\u2666\u2663\u2660\u2020\u2021"
        u"\u26A0\u26B0\u26B1\u2B50\u2B55"
        "]+", flags=re.UNICODE
    )
    text = emoji_pattern.sub("", text)
    text = text.replace("•", "-").replace("📞", "").replace("⚖️", "").replace("📄", "").replace("🏛️", "").replace("💡", "").replace("🔔", "")
    return text.strip()


def parse_content_to_sections(content: str):
    lines = [l.strip() for l in content.strip().split("\n") if l.strip()]
    intro_lines = []
    bullet_lines = []
    closing = ""

    for line in lines:
        if line.startswith(("📞", "Consult a lawyer")):
            closing = clean_text_for_render(line)
        elif any(line.startswith(e) for e in ["⚖️", "📄", "🏛️", "💡", "🔔", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "-", "*", "•"]):
            bullet_lines.append(clean_text_for_render(line))
        else:
            intro_lines.append(clean_text_for_render(line))

    return "\n".join(intro_lines), bullet_lines, closing or "Consult a lawyer for professional legal advice."


# =========================
# PDF GENERATION
# =========================

def generate_pdf(content: str, title: str) -> str:
    filename = f"{uuid.uuid4().hex}.pdf"
    filepath = os.path.join(GENERATED_DIR, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2.5*cm,
        bottomMargin=2*cm,
    )

    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        "Header", fontSize=9, textColor=colors.HexColor("#6b7280"),
        alignment=TA_CENTER, fontName="Helvetica", spaceAfter=4,
    )
    title_style = ParagraphStyle(
        "MainTitle", fontSize=22, textColor=colors.HexColor("#14532d"),
        alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=6, leading=28,
    )
    subtitle_style = ParagraphStyle(
        "SubTitle", fontSize=11, textColor=colors.HexColor("#16a34a"),
        alignment=TA_CENTER, fontName="Helvetica-Oblique", spaceAfter=20,
    )
    section_title_style = ParagraphStyle(
        "SectionTitle", fontSize=13, textColor=colors.HexColor("#14532d"),
        fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=8, leading=18,
    )
    body_style = ParagraphStyle(
        "Body", fontSize=10.5, textColor=colors.HexColor("#1f2937"),
        fontName="Helvetica", leading=17, spaceAfter=10, alignment=TA_JUSTIFY,
    )
    bullet_style = ParagraphStyle(
        "Bullet", fontSize=10.5, textColor=colors.HexColor("#1f2937"),
        fontName="Helvetica", leading=17, spaceAfter=6, leftIndent=16,
        bulletIndent=0, bulletFontName="Helvetica-Bold", bulletFontSize=11,
        bulletColor=colors.HexColor("#16a34a"),
    )
    closing_style = ParagraphStyle(
        "Closing", fontSize=10, textColor=colors.HexColor("#16a34a"),
        fontName="Helvetica-Bold", alignment=TA_CENTER, spaceBefore=16, spaceAfter=4, borderPad=8,
    )
    footer_style = ParagraphStyle(
        "Footer", fontSize=8, textColor=colors.HexColor("#9ca3af"),
        alignment=TA_CENTER, fontName="Helvetica",
    )

    intro, bullets, closing = parse_content_to_sections(content)
    clean_title = clean_text_for_render(title)
    now = datetime.now().strftime("%d %B %Y, %I:%M %p")

    story = []

    header_data = [[Paragraph(f"LandResolve AI  |  Generated: {now}", header_style)]]
    header_table = Table(header_data, colWidths=[17*cm])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(clean_title, title_style))
    story.append(Paragraph("AI-Generated Legal Land Guidance", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#16a34a"), spaceAfter=16))

    if intro:
        story.append(Paragraph("Overview", section_title_style))
        story.append(Paragraph(intro, body_style))

    if bullets:
        story.append(Paragraph("Key Legal Points", section_title_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#d1fae5"), spaceAfter=8))
        for b in bullets:
            story.append(Paragraph(f'<bullet bulletIndent="0" bulletColor="#16a34a">&#x2713;</bullet> {b}', bullet_style))

    story.append(Spacer(1, 0.4*cm))

    closing_data = [[Paragraph(f"Note: {closing}", closing_style)]]
    closing_table = Table(closing_data, colWidths=[17*cm])
    closing_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("BOX", (0, 0), (-1, -1), 1.5, colors.HexColor("#22c55e")),
    ]))
    story.append(closing_table)
    story.append(Spacer(1, 0.6*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb"), spaceAfter=8))
    story.append(Paragraph(
        "This document was generated by LandResolve AI and is not a substitute for professional legal advice.",
        footer_style
    ))

    doc.build(story)
    return filename


# =========================
# IMAGE GENERATION (styled info card)
# =========================

def generate_image(content: str, title: str) -> str:
    filename = f"{uuid.uuid4().hex}.png"
    filepath = os.path.join(GENERATED_DIR, filename)

    W, H = 900, 700
    img = Image.new("RGB", (W, H), color=(10, 10, 15))
    draw = ImageDraw.Draw(img)

    for i in range(H):
        ratio = i / H
        r = int(10 + ratio * 8)
        g = int(10 + ratio * 20)
        b = int(15 + ratio * 10)
        draw.line([(0, i), (W, i)], fill=(r, g, b))

    draw.rectangle([(0, 0), (W, 5)], fill=(34, 197, 94))
    draw.rounded_rectangle([(30, 20), (W-30, 90)], radius=12, fill=(22, 163, 74, 180))
    draw.ellipse([(44, 30), (78, 70)], fill=(34, 197, 94))

    try:
        font_path = "C:/Windows/Fonts/arial.ttf"
        font_bold_path = "C:/Windows/Fonts/arialbd.ttf"
        title_font = ImageFont.truetype(font_bold_path, 20)
        header_font = ImageFont.truetype(font_bold_path, 15)
        body_font = ImageFont.truetype(font_path, 13)
        small_font = ImageFont.truetype(font_path, 11)
    except Exception:
        title_font = ImageFont.load_default()
        header_font = title_font
        body_font = title_font
        small_font = title_font

    draw.text((52, 40), "LR", fill=(255, 255, 255), font=header_font)
    clean_t = clean_text_for_render(title)[:60]
    draw.text((92, 32), "LandResolve AI", fill=(255, 255, 255), font=header_font)
    draw.text((92, 54), clean_t, fill=(187, 247, 208), font=body_font)
    now = datetime.now().strftime("%d %b %Y, %I:%M %p")
    draw.text((W - 210, 50), now, fill=(187, 247, 208), font=small_font)
    draw.rounded_rectangle([(30, 105), (W-30, H-60)], radius=14, fill=(22, 27, 34))
    draw.rounded_rectangle([(30, 105), (W-30, H-60)], radius=14, outline=(34, 197, 94, 80), width=1)
    draw.rectangle([(30, 105), (200, 130)], fill=(34, 197, 94))
    draw.text((44, 109), "AI Legal Summary", fill=(255, 255, 255), font=small_font)

    intro, bullets, closing = parse_content_to_sections(content)
    y = 145
    max_y = H - 90

    def draw_wrapped(text, x, start_y, max_width, fnt, color, line_height=20):
        words = text.split()
        line = ""
        cy = start_y
        for word in words:
            test = line + word + " "
            bbox = draw.textbbox((0, 0), test, font=fnt)
            if bbox[2] > max_width and line:
                draw.text((x, cy), line.strip(), fill=color, font=fnt)
                cy += line_height
                line = word + " "
                if cy > max_y:
                    break
            else:
                line = test
        if line.strip() and cy <= max_y:
            draw.text((x, cy), line.strip(), fill=color, font=fnt)
            cy += line_height
        return cy

    if intro:
        y = draw_wrapped(intro[:300], 50, y, W - 100, body_font, (209, 213, 219), 19)
        y += 10

    if y < max_y:
        draw.line([(50, y), (W-50, y)], fill=(34, 197, 94, 60), width=1)
        y += 14

    for b in bullets[:6]:
        if y > max_y:
            break
        draw.ellipse([(50, y+5), (58, 13+y)], fill=(34, 197, 94))
        y = draw_wrapped(b[:120], 68, y, W - 118, body_font, (240, 240, 245), 19)
        y += 4

    if y < max_y - 10:
        draw.rounded_rectangle([(34, max_y - 2), (W-34, H-65)], radius=8, fill=(20, 83, 45))
        closing_clean = clean_text_for_render(closing)[:110]
        draw.text((50, max_y + 6), closing_clean, fill=(187, 247, 208), font=small_font)

    draw.rectangle([(0, H-28), (W, H)], fill=(14, 40, 20))
    draw.text((30, H-20), "LandResolve AI  |  Not a substitute for professional legal advice", fill=(74, 122, 74), font=small_font)

    img.save(filepath, format="PNG", quality=95)
    return filename


# =========================
# AI IMAGE GENERATION via Pollinations
# Returns { url, prompt } — no base64, just a saved file URL
# =========================

HF_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"


async def _fetch_and_save_ai_image(subject: str) -> dict:
    subject = subject.strip()
    if not subject:
        return {"error": "No subject provided."}

    enhanced_prompt = (
        f"{subject}, highly detailed, professional photography, "
        f"vibrant colors, sharp focus, 4k quality, award winning"
    )

    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": enhanced_prompt,
        "parameters": {
            "num_inference_steps": 30,
            "guidance_scale": 7.5,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                HF_API_URL,
                headers=headers,
                json=payload,
            )

        if response.status_code == 503:
            return {"error": "Model is loading on Hugging Face, please wait 20 seconds and try again."}

        if response.status_code != 200:
            return {"error": f"Image generation failed (HTTP {response.status_code}): {response.text[:200]}"}

        content_type = response.headers.get("content-type", "")
        if "image" not in content_type:
            return {"error": f"Unexpected response from Hugging Face: {response.text[:200]}"}

        filename = f"ai_{uuid.uuid4().hex}.png"
        filepath = os.path.join(GENERATED_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(response.content)

        return {
            "url": f"/files/{filename}",
            "prompt": subject,
            "format": "ai_image",
        }

    except httpx.TimeoutException:
        return {"error": "Image generation timed out (>2 min). Please try again."}
    except Exception as e:
        return {"error": str(e)}


@app.post("/generate-ai-image")
async def generate_ai_image_endpoint(request: AIImageRequest):
    prompt = request.prompt.strip()
    if not prompt:
        return JSONResponse({"error": "No prompt provided."}, status_code=400)

    result = await _fetch_and_save_ai_image(prompt)

    if "error" in result:
        status = 504 if "timed out" in result["error"] else 500
        return JSONResponse(result, status_code=status)

    return JSONResponse(result)


# =========================
# GENERATE PDF / SCREENSHOT ENDPOINT
# =========================

@app.post("/generate")
async def generate_file(request: GenerateRequest):
    try:
        fmt = request.format.lower()
        if fmt == "pdf":
            filename = generate_pdf(request.content, request.title)
            media = "application/pdf"
        elif fmt == "image":
            filename = generate_image(request.content, request.title)
            media = "image/png"
        else:
            return JSONResponse({"error": "Invalid format. Use 'pdf' or 'image'."}, status_code=400)

        file_url = f"/files/{filename}"
        return JSONResponse({"url": file_url, "filename": filename, "format": fmt})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# =========================
# CHAT API
# =========================

@app.post("/chat")
async def chat(request: ChatRequest):

    db = SessionLocal()

    if len(request.messages) == 0:
        db.close()
        def empty_response():
            yield "⚠️ Empty message."
        return StreamingResponse(empty_response(), media_type="text/plain")

    if not request.conversation_id:
        first_user_message = next(
            (msg.content for msg in request.messages if msg.role == "user"), ""
        )
        title = first_user_message[:40] + "..." if len(first_user_message) > 40 else first_user_message
        new_conversation = Conversation(title=title)
        db.add(new_conversation)
        db.commit()
        db.refresh(new_conversation)
        conversation_id = new_conversation.id
    else:
        conversation_id = request.conversation_id

    latest_message = request.messages[-1].content
    clean_message = latest_message.lower().strip()

    last_saved_user = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.role == "user"
    ).order_by(Message.id.desc()).first()

    if not last_saved_user or last_saved_user.content != latest_message:
        db.add(Message(
            conversation_id=conversation_id,
            role="user",
            content=latest_message
        ))
        db.commit()

    # -------------------------------------------------------
    # QUICK REPLIES
    # -------------------------------------------------------
    quick_replies = {
        "hi": "👋 Hello! How can I help you with your land dispute today?",
        "hello": "👋 Hello! How can I help you with your land dispute today?",
        "hlo": "👋 Hello! How can I help you with your land dispute today?",
        "hey": "👋 Hey! Tell me your land or property issue.",
        "good morning": "☀️ Good morning! How can I assist you today?",
        "good evening": "🌙 Good evening! How can I assist you today?",
        "bye": "👋 Goodbye! Feel free to return anytime.",
        "thanks": "👍 You're welcome. Stay informed about your rights!",
        "thank you": "👍 You're welcome. Stay informed about your rights!",
        "ok": "👍 Alright. Let me know if you need anything.",
        "how are you": "😊 I'm doing great and ready to help with your land issues!",
        "what are you doing": "⚖️ Helping people resolve land and property disputes.",
        "who are you": "⚖️ I'm LandResolve AI — your smart Indian legal land assistant.",
    }

    if clean_message in quick_replies:
        quick_reply = quick_replies[clean_message]
        db.add(Message(conversation_id=conversation_id, role="assistant", content=quick_reply))
        db.commit()
        db.close()
        def quick_response():
            yield quick_reply
        return StreamingResponse(
            quick_response(), media_type="text/plain",
            headers={"X-Conversation-Id": str(conversation_id)}
        )

    context = retrieve_context(latest_message)[:500]
    is_file_message = "📄 [Extracted from:" in latest_message

    if is_file_message:
        system_prompt = f"""
You are LandResolve AI — a smart Indian legal land document analyzer.

The user has uploaded a document or image. Your job is to READ the extracted text and summarize ONLY what is clearly written in it.

STRICT RULES FOR FILE ANALYSIS — NO EXCEPTIONS:
1. ONLY extract and report information that is CLEARLY present in the text.
2. DO NOT guess, assume, or make up anything not clearly written.
3. If text is unclear or garbled, skip it — write "⚠️ Some text was unclear."
4. Write a 1-2 sentence intro about what type of document this appears to be.
5. Then list ONLY the clear factual points found — number them 1️⃣ 2️⃣ 3️⃣ etc.
6. Keep each point to 1 line — just state the fact clearly.
7. Maximum 8 points — do not pad with unnecessary analysis.
8. Do NOT give legal advice about the document unless it is a land/property document.
9. End with: "📞 Consult a lawyer for professional legal advice."
10. NEVER repeat the same information twice.
11. NEVER add analysis, opinions, or guesses — only facts from the document.
12. If it is a land/property document, add relevant legal tips after the facts.

Legal Context:
{context}
"""
        num_tokens = 500
    else:
        system_prompt = f"""
You are LandResolve AI — a smart Indian legal land dispute assistant.

STRICT RULES — NO EXCEPTIONS:
1. Response = 2-3 sentence intro paragraph + maximum 5 bullet points + 1 closing line.
2. HARD STOP at 10 lines total — never exceed this.
3. Intro paragraph: 2-3 complete sentences explaining the topic. NO bullets in intro.
4. Every bullet point MUST have an emoji at the start.
5. Every bullet point MUST be a COMPLETE sentence — never cut mid-sentence.
6. Maximum 150 words total. But NEVER cut a sentence to fit — finish the sentence then stop.
7. Only answer land, property, legal topics. For anything else reply: "⚖️ I only assist with land and property disputes."
8. Never repeat the same point twice.
9. End every response with: "📞 Consult a lawyer for full details."
10. Never write more than 5 bullet points.

RESPONSE FORMAT:
[2-3 complete sentence intro paragraph]

⚖️ [Complete point 1 — full sentence]
📄 [Complete point 2 — full sentence]
🏛️ [Complete point 3 — full sentence]
💡 [Complete point 4 — full sentence]
🔔 [Complete point 5 — full sentence]

📞 Consult a lawyer for full details.

Legal Context:
{context}
"""
        num_tokens = 280

    db.close()

    def generate():
        chat_history = [{"role": "system", "content": system_prompt}]

        for msg in request.messages[-6:]:
            chat_history.append({
                "role": msg.role,
                "content": msg.content
            })

        prompt = system_prompt + "\n\nUser: " + latest_message

        try:
            print("MODEL USED =meta-llama")
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta-llama/llama-3.3-8b-instruct:free",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ]
                },
                timeout=60
            )
            print("STATUS:", response.status_code)
            print("TEXT:", response.text)

            data = response.json()

            print("OPENROUTER RESPONSE:", data)

            if "choices" in data:
                full_ai_response = data["choices"][0]["message"]["content"]
            else:
                full_ai_response = str(data)

        except Exception as e:
            full_ai_response = f"OPENROUTER ERROR: {str(e)}"

        yield full_ai_response

        try:
            save_db = SessionLocal()
            save_db.add(Message(
                conversation_id=conversation_id,
                role="assistant",
                content=full_ai_response
            ))
            save_db.commit()
            save_db.close()
        except Exception as e:
            print("SAVE ERROR:", e)

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"X-Conversation-Id": str(conversation_id)}
    )


# =========================
# FILE UPLOAD + OCR EXTRACT
# =========================

@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        filename = file.filename.lower()
        extracted_text = ""

        if any(filename.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
            image = Image.open(io.BytesIO(contents))
            image = image.convert("RGB")
            width, height = image.size
            if width < 1000:
                scale = 1000 / width
                try:
                    resample = Image.Resampling.LANCZOS
                except AttributeError:
                    resample = Image.LANCZOS
                image = image.resize(
                    (int(width * scale), int(height * scale)), resample
                )
            try:
                extracted_text = pytesseract.image_to_string(image, lang="eng+hin")
            except Exception:
                extracted_text = pytesseract.image_to_string(image, lang="eng")

        elif filename.endswith(".pdf"):
            with pdfplumber.open(io.BytesIO(contents)) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n"
        else:
            return JSONResponse(
                {"error": "Unsupported file type. Upload a PDF or image (jpg, png, webp)."},
                status_code=400
            )

        extracted_text = extracted_text.strip()
        if not extracted_text:
            return JSONResponse(
                {"error": "Could not extract any text from this file."},
                status_code=400
            )

        return {"text": extracted_text[:4000], "filename": file.filename, "char_count": len(extracted_text)}

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# =========================
# CONVERSATIONS CRUD
# =========================

@app.get("/conversations")
async def get_conversations():
    db = SessionLocal()
    convs = db.query(Conversation).order_by(Conversation.id.desc()).all()
    db.close()
    return convs


@app.get("/conversations/{conversation_id}")
async def get_conversation_messages(conversation_id: int):
    db = SessionLocal()
    msgs = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.id.asc()).all()
    db.close()
    return msgs


@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int):
    db = SessionLocal()
    db.query(Message).filter(Message.conversation_id == conversation_id).delete()
    db.query(Conversation).filter(Conversation.id == conversation_id).delete()
    db.commit()
    db.close()
    return {"success": True}


class RenameRequest(BaseModel):
    title: str


@app.patch("/conversations/{conversation_id}")
async def rename_conversation(conversation_id: int, body: RenameRequest):
    db = SessionLocal()
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        conv.title = body.title
        db.commit()
    db.close()
    return {"success": True}


import uvicorn
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port
    )