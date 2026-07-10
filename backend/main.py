from database import SessionLocal
from models import User, Conversation, Message, Memory
from database import engine
from models import Base

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from retriever import retrieve_context
from typing import Optional
from dataset_search import search_dataset
from fastapi.staticfiles import StaticFiles
from image_mapper import DOCUMENT_IMAGES

from sqlalchemy import DateTime
from datetime import datetime
from huggingface_hub import InferenceClient
from fastapi.staticfiles import StaticFiles
import asyncio

import pytesseract
from PIL import Image, ImageDraw, ImageFont
import pdfplumber
import speech_recognition as sr
from pydub import AudioSegment
import io
import base64
import os
import re
import uuid
import httpx
import json
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


HF_TOKEN = os.getenv("HF_TOKEN")


hf_client = InferenceClient(
    provider="fal-ai",
    api_key=HF_TOKEN,
)


print("HF TOKEN FOUND:", bool(HF_TOKEN))
print("HF TOKEN START:", HF_TOKEN[:10] if HF_TOKEN else "NONE")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

print("====APP STARTED VERSION 999====")
print("OPENROUTER KEY FOUND:", OPENROUTER_API_KEY is not None)
print("STEP A")




app = FastAPI()


Base.metadata.create_all(bind=engine)

print("STEP B")
GENERATED_DIR = "generated_files"
os.makedirs(GENERATED_DIR, exist_ok=True)
app.mount("/files", StaticFiles(directory=GENERATED_DIR), name="files")

EDUCATIONAL_DOCS_DIR = "educational_documents"
app.mount(
    "/educational_documents",
    StaticFiles(directory=EDUCATIONAL_DOCS_DIR),
    name="educational_documents",
)

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

class GoogleUserRequest(BaseModel):
    name: str
    email: str
    picture: str | None = None

class MessageSchema(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[MessageSchema]
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None
    pdf_text: Optional[str] = None


class GenerateRequest(BaseModel):
    content: str
    title: str = "LandResolve AI Report"
    format: str  # "pdf" or "image"


class AIImageRequest(BaseModel):
    prompt: str
    user_id: str | None = None
    conversation_id: str | None = None


# =========================       !!!!!!!!!!!!!!
# HELPERS
# =========================

def find_document_image(user_message: str):
    user_message = user_message.lower()

    for keyword, filename in DOCUMENT_IMAGES.items():
        if keyword in user_message:
            return f"/educational_documents/{filename}"

    return None

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

#HF_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"
async def _fetch_and_save_ai_image(subject: str) -> dict:
    subject = subject.strip()

    if not subject:
        return {"error": "No subject provided."}

    try:
        import urllib.parse
        import httpx

        filename = f"ai_{uuid.uuid4().hex}.png"
        filepath = os.path.join(GENERATED_DIR, filename)

        prompt = urllib.parse.quote(subject)

        image_url = (
            f"https://image.pollinations.ai/prompt/{prompt}"
            "?width=1024&height=1024&model=flux&nologo=true"
        )

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.get(image_url)

        if response.status_code != 200:
            return {"error": f"Pollinations error: {response.status_code}"}

        with open(filepath, "wb") as f:
            f.write(response.content)

        return {
            "url": f"/files/{filename}",
            "prompt": subject,
            "format": "ai_image",
        }

    except Exception as e:
        print("POLLINATIONS ERROR =", repr(e))
        return {"error": str(e)}
    
    

# List moved to module level so it's defined once and never depends on
# which branch (new vs existing conversation) runs first.
ALLOWED_IMAGE_KEYWORDS = [
    "land",
    "property",
    "farm",
    "farmer",
    "village",
    "plot",
    "boundary",
    "survey",
    "registry",
    "sale deed",
    "partition",
    "power of attorney",
    "will",
    "jamabandi",
    "mutation",
    "fard",
    "khasra",
    "patwari",
    "tehsil",
    "map"
]


def is_land_related_prompt(prompt: str) -> bool:
    """
    Word-boundary based check so short/common words like
    'will' or 'map' don't match inside unrelated words
    (e.g. 'will' inside 'will this work', 'map' inside 'roadmap').
    Multi-word phrases like 'sale deed' are matched as plain substrings.
    """
    text = prompt.lower()

    for keyword in ALLOWED_IMAGE_KEYWORDS:
        if " " in keyword:
            if keyword in text:
                return True
        else:
            if re.search(rf"\b{re.escape(keyword)}\b", text):
                return True

    return False


@app.post("/generate-ai-image")
async def generate_ai_image_endpoint(request: AIImageRequest):

    prompt = request.prompt.strip()

    if not prompt:
        return JSONResponse(
            {"error": "No prompt provided."},
            status_code=400
        )

    db = SessionLocal()

    if not request.conversation_id:

        title = prompt[:40]

        conversation = Conversation(
            title=title,
            user_id=request.user_id
        )

        db.add(conversation)
        db.commit()
        db.refresh(conversation)

        conversation_id = conversation.id

    else:
        conversation_id = request.conversation_id

    if not is_land_related_prompt(prompt):

        user_message = Message(
            conversation_id=conversation_id,
            role="user",
            content=prompt
        )
        db.add(user_message)

        assistant_message = Message(
            conversation_id=conversation_id,
            role="assistant",
            content="🏞️ I can generate only land and property related educational images."
        )
        db.add(assistant_message)

        db.commit()

        return JSONResponse({
            "error": "Only land related images allowed.",
            "conversation_id": conversation_id
        })

    result = await _fetch_and_save_ai_image(prompt)

    if "error" in result:
        status = 504 if "timed out" in result["error"] else 500
        return JSONResponse(result, status_code=status)

    user_message = Message(
    conversation_id=conversation_id,
    role="user",
    content=prompt
    )

    db.add(user_message)

    image_message = Message(
    conversation_id=conversation_id,
    role="ai_image",
    content=json.dumps({
        "url": result["url"],
        "prompt": prompt
    })
    )

    db.add(image_message)

    db.commit()

    result["conversation_id"] = conversation_id

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

@app.post("/auth/google")
async def save_google_user(user: GoogleUserRequest):

    print("GOOGLE LOGIN HIT")
    print(user)

    db = SessionLocal()

    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    is_new = False

    if not existing_user:

        new_user = User(
            id=str(uuid.uuid4()),
            name=user.name,
            email=user.email,
            picture=user.picture
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        existing_user = new_user
        is_new = True

    db.close()

    return {
        "id": existing_user.id,
        "name": existing_user.name,
        "email": existing_user.email,
        "picture": existing_user.picture,
        "is_new": is_new
    }
    

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
        new_conversation = Conversation(
        title=title,
        user_id=request.user_id
        )
        db.add(new_conversation)
        db.commit()
        db.refresh(new_conversation)
        conversation_id = new_conversation.id
    else:
        conversation_id = request.conversation_id

    latest_message = request.messages[-1].content
    
    dataset_result = search_dataset(latest_message)

    print("DATASET RESULT:")
    print(dataset_result)
    
    #printf("Data can 

    if request.pdf_text:
        latest_message = f"📄 [Extracted from PDF]\n\n{request.pdf_text}"

    clean_message = latest_message.lower().strip()

    if request.user_id:

        try:

            memory_prompt = f"""
    You are a memory extraction system.

    Extract ONLY information that may be useful in future conversations.

    Examples:

    My name is Avineet
    -> User's name is Avineet

    I am from Punjab
    -> User is from Punjab

    I study AI-DS
    -> User studies AI-DS

    Call me Avi
    -> User prefers to be called Avi

    I am building LandResolve AI
    -> User is building LandResolve AI

    Return ONLY the memory itself.

    Good:
    User's name is Avineet

    User is from Punjab

    User studies AI-DS

    Bad:
    The user is from Punjab.

    This memory should be saved.

    I found the following memory.

    If nothing should be remembered return:
    NONE

    User message:
    {latest_message}
    """

            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "openai/gpt-oss-20b",
                    "messages": [
                        {
                            "role": "user",
                            "content": memory_prompt
                        }
                    ]
                },
                timeout=20
            )

            memory_result = (
                response.json()["choices"][0]["message"]["content"]
                .strip()
            )

            if memory_result.upper() != "NONE":

                existing = db.query(Memory).filter(
                    Memory.user_id == request.user_id,
                    Memory.memory_text == memory_result
                ).first()

                if not existing:

                    db.add(
                        Memory(
                            id=str(uuid.uuid4()),
                            user_id=request.user_id,
                            memory_text=memory_result
                        )
                    )

                    db.commit()

        except Exception as e:
            print("MEMORY SAVE ERROR:", e)

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
        "who are you": "I'm LandResolve AI, an assistant that helps with land disputes, property rights, land registration, inheritance, and tenant matters.",
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


    context = retrieve_context(latest_message)[:2000]

    print("LATEST MESSAGE:")
    print(latest_message)

    is_file_message = "📄" in latest_message

    print("IS FILE =", is_file_message)

    question_count = latest_message.count("?")

    print("QUESTION COUNT =", question_count)

    if is_file_message and question_count >= 3:

        system_prompt = """
        
IMPORTANT:

The PDF contains only questions.

Answer ONLY from the information present in the question.

Do NOT invent:

- laws
- legal sections
- court names
- government offices
- portals
- forms
- procedures
- document names
- timelines

If information is not present in the question, say:

"Not enough information is available in the question."

Use only simple practical guidance.

Never create tables.

Never create long explanations.

Maximum 5 lines per answer.

You are LandResolve AI.

The uploaded PDF contains land-related questions.

Answer every question separately.

CRITICAL RULES:

- Use ONLY information contained in the question.
- Do NOT invent:
  - laws
  - legal sections
  - court names
  - government offices
  - forms
  - notices
  - procedures
  - portals
  - land records
  - document names

- Never write:
  - Section numbers
  - Act names
  - Rule numbers
  - Form names
  - Court names

- If unsure, say:
  "The exact procedure may vary by state."

- Use only these land records when genuinely relevant:
  - Sale Deed
  - Mutation Record
  - Jamabandi
  - Fard
  - Khasra Number
  - Khata Number
  - Survey Record
  - Encumbrance Certificate
  - Property Tax Receipt

- Keep answers short.

- Do not create tables.

- Do not create legal citations.

- Do not create examples.

- Do not assume facts.

- Do not explain laws.

Format:

Question:
<repeat exactly>

Answer:
<simple answer>

Useful Documents:
<list or Not specified>

Next Steps:
<simple practical steps>
"""
        num_tokens = 500

    elif is_file_message:

        system_prompt = f"""
You are LandResolve AI — a legal document and land record analyzer.

The user has uploaded a document or image.Analyze only the text that can be clearly extracted.

  Rules:
1. Only report information clearly present in the document.
2. Never guess or invent information.
3. Identify the document type if possible.
4. Provide a concise summary.
5. Extract names, dates, survey numbers, plot numbers, ownership details, and property information when present.
6. If it is a land / property document, explain its significance.
7. If information is unclear, clearly say so.

Legal Context:
{ context }
"""
        num_tokens = 500

    else:

        system_prompt = f"""
You are LandResolve AI — a smart Indian legal land assistant.

Your primary job is to help users with Punjab land-related issues.

When Punjab Dataset Guidance is provided:

1. Use the dataset information as the primary source.
2. Explain the information in simple language.
3. Expand the answer when helpful.
4. Do not contradict the dataset.
5. Do not invent fees, timelines, legal guarantees, government policies, office addresses, or official procedures not present in the dataset.
6. If documents, offices, officials, or next steps are provided, include them naturally in the answer.
7. Give practical guidance, not just definitions.

CREATOR INFORMATION:

LandResolve AI is an AI-powered legal assistance platform focused on land disputes, property rights, land records, and legal guidance.

LandResolve AI was founded, designed, and developed by Avineet Pal Singh.

About the Founder:

Avineet Pal Singh is a B.Tech student specializing in Artificial Intelligence and Data Science (AI & DS).

He developed LandResolve AI to help citizens, farmers, and landowners better understand land records, property rights, legal procedures, and dispute resolution through AI-powered guidance.

The goal of LandResolve AI is to make legal and land-related information more accessible, understandable, and easier to navigate for everyone.

Contact Information:
Founder: Avineet Pal Singh
Email: singhavineetpal@gmail.com

If users ask:
- Who made you?
- Who created you?
- Who developed you?
- Who is your founder?
- Who owns LandResolve AI?
- Tell me about your founder.
- Who is Avineetpal Singh?

Answer using the founder information above.

LandResolve AI was independently designed and developed by Avineetpal Singh. 


Rules:
Rules:
1. Answer greetings naturally.
2. Explain land disputes in simple language.
3. Provide practical guidance.
4. Do not invent legal facts.
5. Mention relevant records when appropriate.
6. If dataset documents, offices, officials, or next steps are provided, use only those items.
7. Do not invent forms, fees, certificates, letters, timelines, office counters, or procedures not present in the dataset.
8. Keep language clear and natural. Avoid made-up translations or uncommon words.

Legal Context:
{context}
"""
        num_tokens = 500
        
    else:
        system_prompt = f"""
        
IMPORTANT:

LandResolve AI already contains educational sample images for the following land documents:

- Jamabandi
- Fard
- Girdawari
- Khasra Document
- Mutation Register (Intkal)
- Registry
- Sale Deed
- Partition Deed
- Power of Attorney
- Will
- Tatima
- Aks Shajra
- E-Stamp

If the user asks for the image, photo, sample, or format of any of these documents:

- NEVER say you cannot provide or display the image.
- NEVER apologize for not having the image.
- NEVER say the image is unavailable.

Assume the application will automatically display the correct educational document image.

Your job is only to:
1. Briefly explain what the document is.
2. Explain its purpose.
3. Explain when it is used.
4. Keep the explanation concise.
        

Legal Context:
{ context }
"""

        
    
    
        
     


    history_messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).all()

    memory_context = ""

    if request.user_id:
        memories = db.query(Memory).filter(
            Memory.user_id == request.user_id
        ).all()

        memory_context = "\n".join(
            [m.memory_text for m in memories]
        )

    db.close()
    
    dataset_context = ""

    if dataset_result:

        dataset_context = f"""
Punjab Dataset Guidance

IMPORTANT:
If FAQ data exists, use that answer as the primary answer.
Do not invent extra legal details.
Do not override dataset information.
Prefer dataset information over model knowledge.
Use the detected intent below.
Do not reinterpret the user's issue.
If the intent is mutation_problem, treat Intkal as Mutation.
If the intent is family_dispute, treat it as a land dispute.
Use the dataset guidance as the primary source.

Intent:
{dataset_result.get('intent', '')}

FAQ:
{dataset_result.get('faq_answer', '')}

Village:
{dataset_result.get('village_info', {})}

Documents:
{', '.join(dataset_result.get('documents', []))}

Offices:
{', '.join(dataset_result.get('offices', []))}

Officials:
{', '.join(dataset_result.get('officials', []))}

Next Steps:
{', '.join(dataset_result.get('next_steps', []))}
"""


    def generate():
        chat_history = [{
            "role": "system",
            "content":
                system_prompt
                    + f"\n\nUser Memory:\n{memory_context}"
                    + f"\n\n{dataset_context}"
        }]

        for msg in history_messages[-20:]:
            chat_history.append({
                "role": msg.role,
                "content": msg.content
            })

        #prompt = system_prompt + "\n\nUser: " + latest_message

        try:
            print("AAAAAAAAA TEST 123")
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "openai/gpt-oss-20b",
                    "messages": chat_history
                    
                },
                timeout=60
                
            )
            print("STATUS:", response.status_code)
            print("TEXT:", response.text)

            data = response.json()

            print("FULL RESPONSE:")
            print(data)

            print("CONTENT:")
            print(data["choices"][0]["message"]["content"])

            print("OPENROUTER RESPONSE:", data)

            if (
                "choices" in data
                and data["choices"]
                and data["choices"][0]["message"].get("content")
            ):
                full_ai_response = data["choices"][0]["message"]["content"]
                
                image_url = find_document_image(latest_message)
                print("IMAGE URL =", image_url)
                
                if image_url:
                    full_ai_response = json.dumps({
                    "type": "document_image",
                    "text": full_ai_response,
                    "url": image_url
                })
            else:
                full_ai_response = (
                    "Sorry, I could not generate a response. "
                    "Please try again."
                )

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
OCR_SPACE_API_KEY = "K83874093588957"

@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        filename = file.filename.lower()
        extracted_text = ""

        if any(filename.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
            response = requests.post(
                "https://api.ocr.space/parse/image",
                files={"file": (filename, contents)},
                data={
                    "apikey": OCR_SPACE_API_KEY,
                    "language": "eng",
                    "OCREngine": 2,
                },
                timeout=60,
            )
            result = response.json()

            if result.get("IsErroredOnProcessing"):
                return JSONResponse(
                    {"error": result.get("ErrorMessage", ["OCR failed"])[0]},
                    status_code=400
                )

            parsed_results = result.get("ParsedResults", [])
            if parsed_results:
                extracted_text = parsed_results[0].get("ParsedText", "")

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

# =========================
# VOICE TRANSCRIPTION
# =========================

@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    try:
        raw_bytes = await audio.read()

        # Convert incoming webm audio to WAV (SpeechRecognition needs WAV/FLAC/AIFF)
        audio_segment = AudioSegment.from_file(io.BytesIO(raw_bytes))
        wav_io = io.BytesIO()
        audio_segment.export(wav_io, format="wav")
        wav_io.seek(0)

        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_io) as source:
            audio_data = recognizer.record(source)

        text = recognizer.recognize_google(audio_data, language="en-IN")
        return {"text": text}

    except sr.UnknownValueError:
        return JSONResponse({"text": "", "error": "Could not understand audio"}, status_code=200)
    except Exception as e:
        print("TRANSCRIBE ERROR:", str(e))
        return JSONResponse({"text": "", "error": str(e)}, status_code=500)
    
    

@app.get("/conversations")
async def get_conversations(user_id: str):
    print("USER ID RECEIVED =", user_id)

    db = SessionLocal()

    convs = (
        db.query(Conversation)
        .filter(
            Conversation.user_id == user_id
        )
        .order_by(Conversation.created_at.desc())
        .all()
    )

    db.close()

    return convs


@app.get("/conversations/{conversation_id}")
async def get_conversation_messages(conversation_id: str):
    db = SessionLocal()
    msgs = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.id.asc()).all()
    db.close()
    return msgs


@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    db = SessionLocal()
    db.query(Message).filter(Message.conversation_id == conversation_id).delete()
    db.query(Conversation).filter(Conversation.id == conversation_id).delete()
    db.commit()
    db.close()
    return {"success": True}


class RenameRequest(BaseModel):
    title: str


@app.patch("/conversations/{conversation_id}")
async def rename_conversation(conversation_id: str, body: RenameRequest):
    db = SessionLocal()
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        conv.title = body.title
        
        db.commit()
        
        
    db.close()
    return {"success": True}

@app.get("/health")
async def health():
    return {"status": "ok"}


import uvicorn
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port
    )