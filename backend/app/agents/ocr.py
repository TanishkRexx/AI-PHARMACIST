import cv2
import pytesseract
from PIL import Image
import re
import json
import sys
import os
import numpy as np

# Windows Tesseract path
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# -------------------------------------------------------
# Google Gemini - install with: pip install google-generativeai
# Get free API key at: https://aistudio.google.com
# Set key via env: set GEMINI_API_KEY=AIza-...
# OR pass directly to process_prescription()
# -------------------------------------------------------
try:
    import google.generativeai as genai
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False


# ================================================================
# STEP 1: OCR - Extract raw text from image OR PDF
# ================================================================
def _preprocess_and_ocr(pil_img) -> str:
    """Preprocess a PIL image and run Tesseract OCR on it."""
    img_np = np.array(pil_img.convert("RGB"))
    img_cv = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    gray   = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    resized   = cv2.resize(thresh, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_LINEAR)
    return pytesseract.image_to_string(
        Image.fromarray(resized),
        config="--psm 6",
        lang="eng"          # add +mar for better Marathi if installed
    )


def extract_text_from_image(image_path: str) -> str:
    """
    Supports: .jpg .jpeg .png .bmp .tiff  AND  .pdf

    PDF requirements (install ONE of these):
      pip install pdf2image          (also needs Poppler for Windows)
        Poppler: https://github.com/oschwartz10612/poppler-windows/releases
      pip install pymupdf            (no extra dependency needed)
    """
    ext = os.path.splitext(image_path)[1].lower()

    # ── PDF path ──────────────────────────────────────────────────
    if ext == ".pdf":
        texts = []

        # Option A: pdf2image + Poppler
        try:
            from pdf2image import convert_from_path
            pages = convert_from_path(image_path, dpi=200)
            for page in pages:
                texts.append(_preprocess_and_ocr(page))
            return "\n".join(texts)
        except Exception:
            pass

        # Option B: PyMuPDF (fitz)
        try:
            import fitz
            doc = fitz.open(image_path)
            for page in doc:
                mat = fitz.Matrix(2, 2)
                pix = page.get_pixmap(matrix=mat)
                pil = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                texts.append(_preprocess_and_ocr(pil))
            return "\n".join(texts)
        except Exception:
            pass

        raise RuntimeError(
            f"Cannot read PDF '{image_path}'.\n"
            "Install one of:\n"
            "  pip install pymupdf\n"
            "  pip install pdf2image  (+ Poppler for Windows)\n"
            "Poppler: https://github.com/oschwartz10612/poppler-windows/releases"
        )

    # ── Image path ────────────────────────────────────────────────
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(
            f"Cannot open: '{image_path}'\n"
            "Check that the file exists and the path is correct."
        )
    gray    = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    resized = cv2.resize(thresh, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_LINEAR)
    return pytesseract.image_to_string(Image.fromarray(resized), config="--psm 6")


# ================================================================
# STEP 2A: LLM PARSER  (Primary — best accuracy)
# ================================================================
def parse_with_llm(text: str, api_key: str) -> dict:
    """
    Use Google Gemini 1.5 Flash to extract structured data from raw OCR text.
    - Free tier: 1500 requests/day (plenty for a hackathon)
    - Handles Marathi/Hindi better than OpenAI (Google trains on Indian languages)
    - Falls back to regex parser if anything goes wrong
    """
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=genai.GenerationConfig(
                temperature=0,
                response_mime_type="application/json",   # forces clean JSON output, no markdown
            )
        )

        prompt = f"""
You are an expert medical prescription parser for Indian prescriptions.
Extract all information from this OCR-scanned prescription text.
The text may contain OCR errors — use medical knowledge to correct them.

Marathi translations:
  आठवडयातुन एकदा = once a week
  दररोज एकदा     = once daily
  सकाळी          = morning
  दुपारी          = afternoon
  रात्री          = night
  नाश्यानंतर     = after breakfast
  जेवणानंतर      = after meals
  दिवस            = days
  १=1, २=2, ३=3, ४=4, ५=5, ६=6, ७=7, ८=8, ९=9, ०=0

Return a JSON object with this exact structure:
{{
  "format": "indian | western | clinic",
  "patient": {{
    "name": null, "id": null, "age": null, "gender": null,
    "date_of_birth": null, "mobile": null, "address": null,
    "weight_kg": null, "height_cm": null, "bmi": null, "bp": null, "contact": null
  }},
  "doctor": {{
    "name": null, "qualification": null, "registration_no": null, "license_number": null
  }},
  "hospital": {{
    "name": null, "address": null, "phone": null, "timing": null
  }},
  "prescription_date": null,
  "follow_up_date": null,
  "diagnosis": [],
  "medicines": [
    {{
      "name": "", "dosage": null, "frequency": null, "route": null,
      "duration_days": null, "total_quantity": null,
      "refills": null, "indications": null, "instructions": null
    }}
  ],
  "advice": []
}}

Rules:
- Fix OCR errors in medicine names and dosages using medical knowledge
- duration_days and refills must be integers or null, never strings
- For dash-prefixed medicines (— ARCHITOL NANO): extract name, translate Marathi frequency, parse duration
- For numbered medicines (1. TAB. METFORMIN): extract name, frequency, duration
- For table medicines (western format): extract name, dosage, route, refills
- instructions field = meal timing like "After food", "Before food", "After breakfast"
- If a field is not present use null

Prescription Text:
{text}
"""

        response   = model.generate_content(prompt)
        json_text  = response.text.strip()
        # Strip markdown fences if Gemini adds them despite response_mime_type
        json_text  = re.sub(r"^```json\s*", "", json_text)
        json_text  = re.sub(r"\s*```$",     "", json_text)

        result = json.loads(json_text)
        result["_parsed_by"] = "gemini-1.5-flash"
        print("Parsed by: Google Gemini 1.5 Flash")
        return result

    except Exception as e:
        print(f"Gemini parsing failed: {e} — falling back to regex")
        return None


# ================================================================
# STEP 2B: REGEX PARSER  (Fallback — no API key needed)
# ================================================================

# ----------------------------------------------------------------
# FORMAT DETECTION
# ----------------------------------------------------------------
def detect_format(text: str) -> str:
    """
    Returns: western | indian | clinic

    Kelkar Hospital (Prescription11) clues:
      • "Complaints" header
      • "Diagnosis" header
      • "days" in duration
      • Devanagari / Marathi unicode
      • Dash-prefixed medicine lines  (— ARCHITOL NANO)
      • Reg.No. pattern (not opd style)
    """
    tl = text.lower()

    western_clues = [
        "patient name", "prescriber name", "date of birth",
        "medication name", "route of administration",
        "refills", "license number", "patient id",
        "indications", "prescriber",
    ]
    indian_clues = [
        "tab.", "cap.", "opd", "mmhg",
        "chief complaints", "clinical findings",
    ]
    clinic_clues = [
        "tablet", "capsule", "suspension", "timing",
        "stat", "uhid", "days",
        "complaints", "diagnosis", "reg.no", "reg. no", "regn. no",
        "दिवस", "दररोज", "नाश्यानंतर", "सकाळी", "एकदा", "जेवण",
        "आठवडयातुन", "calcium", "hospital",
    ]

    # Strong structural indicators
    has_xdosage = bool(re.search(r"\d\s*[-–]\s*\d\s*[-–]\s*\d", text))
    has_dashmed = bool(re.search(r"^\s*[—–-]\s+[A-Z]", text, re.MULTILINE))
    has_marathi = bool(re.search(r"[\u0900-\u097F]", text))
    has_regno   = bool(re.search(r"Reg\.?\s*No\.?\s*[:\s]+[A-Z0-9\-]+", text, re.IGNORECASE))

    w = sum(1 for c in western_clues if c in tl)
    i = sum(1 for c in indian_clues  if c in tl)
    c = sum(1 for c in clinic_clues  if c in tl)

    # Bonus weights for strong structural indicators
    c += (4 if has_dashmed else 0)
    c += (3 if has_marathi else 0)
    c += (2 if has_xdosage else 0)
    c += (2 if has_regno   else 0)

    scores = {"western": w, "indian": i, "clinic": c}
    fmt    = max(scores, key=scores.get)

    # Tiebreak: prefer clinic over indian if structural signals found
    if fmt == "indian" and c >= i and (has_xdosage or has_dashmed or has_marathi):
        fmt = "clinic"
    # If everything is 0, check for hospital name (Kelkar Hospital case)
    if w == 0 and i == 0 and c == 0:
        if re.search(r"hospital|clinic|nursing home", text, re.IGNORECASE):
            fmt = "clinic"

    print(f"Format detected: {fmt}  (western={w}, indian={i}, clinic={c})")
    return fmt


def parse_with_regex(text: str) -> dict:
    fmt = detect_format(text)
    if fmt == "western":
        result = parse_western(text)
    elif fmt == "clinic":
        result = parse_clinic(text)
    else:
        result = parse_indian(text)
    result["_parsed_by"] = f"regex_{fmt}"
    print(f"Parsed by: regex ({fmt} format)")
    return result


# ================================================================
# CLINIC FORMAT PARSER
# Handles: Kelkar Hospital, Dr. Atul Vadgaonkar, etc.
# Medicines: dash-prefixed, Marathi frequency, "X days" duration
# ================================================================
def parse_clinic(text: str) -> dict:
    return {
        "format":            "clinic",
        "patient":           _clinic_patient(text),
        "doctor":            _clinic_doctor(text),
        "hospital":          _clinic_hospital(text),
        "prescription_date": _find(
            r"(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})", text
        ),
        "follow_up_date":    None,
        "diagnosis":         _clinic_diagnosis(text),
        "medicines":         _clinic_medicines(text),
        "advice":            _clinic_advice(text),
    }


def _clinic_patient(text: str) -> dict:
    """
    Handles multiple patient label styles:
      MAST. GITE SARTH VISHWAS        13 Yrs / M    (bold line, no "Name:" label)
      Name : MRS. MANISHA GITE        (46y, Female)
      Address : SMARTH NAGAR NASHIK, Tel. : 9823361080
    """
    # Try labeled "Name :" first
    name = _find(r"Name\s*[:\s]+([A-Z][A-Z\s\.]+?)(?:\(|\n|Phone|Address|$)", text)

    # Fallback A: MAST./MRS./MR./MISS prefix (Kelkar hospital style)
    if not name:
        m = re.search(r"((?:MAST|MRS|MR|MISS|MASTER|KU|SMT)\.?\s+[A-Z][A-Z\.]{1,}(?:\s+[A-Z][A-Z\.]+){1,4})(?=\s{3,}|\s*Reg|\s*\n|$)", text)
        if m:
            name = m.group(1).strip()

    # Fallback B: first standalone all-caps bold line (hospital prescription style)
    if not name:
        for line in text.split("\n"):
            line = line.strip()
            if len(line) < 5:
                continue
            if re.search(r"hospital|doctor|dr\.|kelkar|center|consult|reg\.|www\.|phone|tel\.|address|complaint|diagnosis|advice|follow|pathology|ortho|medicine", line, re.IGNORECASE):
                continue
            if re.match(r"^[A-Z][A-Z\s\.]+$", line) and 2 <= len(line.split()) <= 6 and not re.search(r"\d", line):
                name = line.strip()
                break

    # Age: "13 Yrs / M" or "(46y, Female)" or "13Y" or "/ M" style
    age = _find(r"(\d+)\s*[Yy]rs?", text)
    if not age:
        age = _find(r"\((\d+)\s*[yY]", text)
    if not age:
        age = _find(r"/\s*(\d+)\s*/\s*[MF]", text)

    # Gender
    gender_m = re.search(r"\b(\d+)\s*[Yy]rs?\s*/\s*([MF])\b", text)
    gender   = gender_m.group(2) if gender_m else _find(r"\((Male|Female|M|F)\)", text, re.IGNORECASE)

    # Mobile: Tel. : 9823361080 or Phone: 98...
    mobile = _find(r"(?:Tel|Phone|Mob)\.?\s*[:\s]+(\d{10})", text)
    if not mobile:
        mobile = _find(r"\bTel\.\s*:\s*(\d{10})\b", text)

    # Address
    address = _find(r"Address\s*[:\s]+(.+?)(?:\n|Tel\.|Phone|$)", text)
    if not address:
        # Kelkar: "Address : SMARTH NAGAR NASHIK, Tel. : 9823361080"
        address = _find(r"Address\s*:\s*(.+?)(?:,\s*Tel|$)", text)

    # Reg/ID
    pat_id = _find(r"Reg\.?\s*No\.?\s*[:\s]+([A-Z0-9\-]+)", text)

    return {
        "name":          name,
        "id":            pat_id,
        "age":           age,
        "gender":        gender,
        "date_of_birth": None,
        "mobile":        mobile,
        "address":       address.strip() if address else None,
        "weight_kg":     None,
        "height_cm":     None,
        "bmi":           None,
        "bp":            None,
        "contact":       mobile,
    }


def _clinic_doctor(text: str) -> dict:
    """
    Kelkar: "DR. BHARAT KELKAR" at bottom, "Reg.No.: 45361"
    Also handles "Dr. Bharat R. Kelkar" in header.
    """
    # Look for doctor signature block at bottom: "DR. BHARAT KELKAR\nReg.No.:"
    sig_match = re.search(
        r"DR\.?\s+([A-Z][A-Z\s\.]+?)\s*\nReg\.?\s*No\.?",
        text, re.IGNORECASE
    )
    name = sig_match.group(1).strip() if sig_match else None

    # Fallback: first "Dr." occurrence
    if not name:
        name = _find(r"Dr\.?\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,3})", text)

    # Registration number — prefer the one near doctor signature
    reg = _find(r"Reg\.?\s*No\.?\s*[:\s]+(\d+)", text)

    # Qualification
    qual = _find(r"(M\.?[SD]\.?(?:\s*\([A-Za-z]+\))?(?:\s*,?\s*D\.?\s*[A-Za-z]+\.?)?)", text)

    return {
        "name":            f"Dr. {name}" if name and not name.upper().startswith("DR") else name,
        "qualification":   qual,
        "registration_no": reg,
        "license_number":  None,
    }


def _clinic_hospital(text: str) -> dict:
    """
    Kelkar: "KELKAR HOSPITAL" in logo area, phone from header line.
    """
    hosp = _find(
        r"([A-Za-z\s]+(?:Hospital|Nursing Home|Clinic|Centre|Center|HOSPITAL))",
        text
    )
    phone = _find(r"[Pp]hone\s*[:\s]*([\d\s\-\(\)]+)", text)
    if not phone:
        # Kelkar header: "I(0253) 2313308"
        phone = _find(r"(\(?\d{4,5}\)\s*\d{6,7})", text)
    addr = _find(r"([A-Za-z\s,]+(?:Naka|Road|Nagar|Chowk|Street)[^\n]+)", text)

    return {
        "name":    hosp.strip() if hosp else None,
        "address": addr.strip() if addr else None,
        "phone":   phone.strip() if phone else None,
        "timing":  None,
    }


def _clinic_diagnosis(text: str) -> list:
    """
    Kelkar: "Diagnosis :\nFRACTURE NECK PP 2ND TOE RIGHT FOOT"
    """
    match = re.search(
        r"[Dd]iagnos[ie]s\s*[:\s]*(.*?)(?:\n\n|\n\s*[-—]|\Z)",
        text, re.DOTALL
    )
    if match:
        raw = match.group(1).strip().split("\n")
        items = [r.strip() for r in raw if r.strip() and not re.match(r"^[-—\s]+$", r)]
        return items[:3]  # max 3 diagnosis lines
    return []


def _clinic_advice(text: str) -> list:
    """Foot of prescription advisory text."""
    lines = []
    for line in text.split("\n"):
        line = line.strip()
        if re.match(r"^(Advice|Note|Instruction)", line, re.IGNORECASE):
            lines.append(line)
    return lines


def _marathi_frequency(text: str) -> str:
    """Translate common Marathi frequency strings to English."""
    mappings = {
        "आठवडयातुन एकदा":  "Once a week",
        "आठवडयातून एकदा":  "Once a week",
        "दररोज एकदा":      "Once daily",
        "दिवसातुन दोनदा":  "Twice daily",
        "दिवसातून दोनदा":  "Twice daily",
        "दिवसातुन तीनदा":  "Three times daily",
        "रोज एकदा":        "Once daily",
        "१ सकाळी":         "1 Morning",
        "सकाळी":           "Morning",
        "नाश्यानंतर":      "After breakfast",
        "जेवणानंतर":       "After meals",
        "रात्री":          "Night",
    }
    for marathi, english in mappings.items():
        if marathi in text:
            return english
    # Fallback: keep original
    return text.strip()


def _marathi_duration(text: str) -> int | None:
    """Extract duration in days from Marathi or English text."""
    # Marathi numerals → arabic
    marathi_nums = {"०":0,"१":1,"२":2,"३":3,"४":4,"५":5,"६":6,"७":7,"८":8,"९":9}
    converted = text
    for m, a in marathi_nums.items():
        converted = converted.replace(m, str(a))

    m = re.search(r"(\d+)\s*(?:दिवस|days?|day)", converted, re.IGNORECASE)
    return int(m.group(1)) if m else None


def _clinic_medicines(text: str) -> list:
    """
    Parse clinic-style medicines:

    Format A (Kelkar):
      — ARCHITOL  NANO        आठवडयातुन एकदा      4 दिवस
        नाश्यानंतर
      — CALFION CCm/ VEBA PLUS   १ सकाळी           30 days
        (Calcium)
        नाश्यानंतर

    Format B (X-X-X dosage):
      MEDICINE NAME TABLET    1-0-1    दररोज - 5 दिवस
    """
    medicines = []
    seen      = set()
    lines     = text.split("\n")

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        i += 1

        if not line:
            continue

        # ── Format A: dash-prefixed medicine line ─────────────────
        dash_m = re.match(r"^[—–\-]+\s+(.+)", line)
        if dash_m:
            med_raw = dash_m.group(1).strip()

            # Collect continuation lines (parenthetical brand, timing)
            extra_lines = []
            while i < len(lines):
                nxt = lines[i].strip()
                # Stop at next medicine or empty line
                if re.match(r"^[—–\-]+\s+[A-Z]", nxt) or (not nxt and len(extra_lines) > 1):
                    break
                extra_lines.append(nxt)
                i += 1

            full = med_raw + " " + " ".join(extra_lines)

            # Split on Marathi/English frequency + duration columns
            # Line usually: "NAME   FREQUENCY_MARATHI   DURATION"
            # Use large whitespace gaps as column delimiters
            cols = re.split(r"\s{3,}", med_raw)

            name = cols[0].strip() if cols else med_raw
            # Remove parenthetical from name (they appear in extra_lines)
            name = re.sub(r"\(.*?\)", "", name).strip()

            # Frequency: col[1] if present, else scan full text
            freq_raw = cols[1].strip() if len(cols) > 1 else ""
            # Also check extra lines for timing instruction
            timing_lines = [l for l in extra_lines if re.search(r"[\u0900-\u097F]", l)]
            if not freq_raw and timing_lines:
                freq_raw = timing_lines[0]

            frequency = _marathi_frequency(freq_raw) if freq_raw else None

            # Duration: last column or scan full text
            dur_raw = cols[-1] if len(cols) > 2 else full
            duration_days = _marathi_duration(dur_raw)
            # Fallback: scan full combined text
            if not duration_days:
                duration_days = _marathi_duration(full)

            # Instructions (नाश्यानंतर lines)
            instructions = None
            for el in extra_lines:
                if re.search(r"नाश्यानंतर|जेवणानंतर|After breakfast|After meal", el, re.IGNORECASE):
                    instructions = "After breakfast"
                    break

            key = re.sub(r"\s+", "", name.upper())
            if not key or key in seen:
                continue
            seen.add(key)

            medicines.append({
                "name":           name,
                "dosage":         None,
                "frequency":      frequency,
                "route":          "Oral",
                "duration_days":  duration_days,
                "total_quantity": None,
                "refills":        None,
                "indications":    None,
                "instructions":   instructions,
            })
            continue

        # ── Format B: X-X-X dosage style ─────────────────────────
        dosage_m = re.search(r"(\d)\s*[-–]\s*(\d)\s*[-–]\s*(\d)", line)
        med_suffix = re.search(
            r"\b(TABLET|CAPSULE|CAP|TAB|SUSPENSION|SYRUP|DROPS|INJECTION)\b",
            line, re.IGNORECASE
        )
        if dosage_m and med_suffix:
            name = line[:dosage_m.start()].strip()
            name = re.sub(r"\s+", " ", name).strip()
            if not name:
                continue

            m_val, a_val, n_val = dosage_m.group(1), dosage_m.group(2), dosage_m.group(3)
            freq_parts = []
            if m_val != "0": freq_parts.append(f"{m_val} Morning")
            if a_val != "0": freq_parts.append(f"{a_val} Afternoon")
            if n_val != "0": freq_parts.append(f"{n_val} Night")
            frequency = ", ".join(freq_parts) or dosage_m.group(0)

            duration_days = _marathi_duration(line)

            key = re.sub(r"\s+", "", name.upper())
            if key in seen:
                continue
            seen.add(key)

            medicines.append({
                "name":           name,
                "dosage":         dosage_m.group(0).replace(" ", ""),
                "frequency":      frequency,
                "route":          "Oral",
                "duration_days":  duration_days,
                "total_quantity": None,
                "refills":        None,
                "indications":    None,
                "instructions":   None,
            })

    return medicines


# ================================================================
# INDIAN FORMAT PARSER
# ================================================================
def parse_indian(text: str) -> dict:
    return {
        "format":            "indian",
        "patient":           _indian_patient(text),
        "doctor":            _indian_doctor(text),
        "hospital":          _indian_hospital(text),
        "prescription_date": _find(r"Date:\s*(\d{1,2}[-/][A-Za-z]+[-/]\d{2,4})", text),
        "follow_up_date":    _find(r"Follow\s*Up[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})", text),
        "diagnosis":         _indian_diagnosis(text),
        "medicines":         _indian_medicines(text),
        "advice":            _indian_advice(text),
    }


def _indian_patient(text: str) -> dict:
    return {
        "name":          None,
        "id":            _find(r"ID:\s*(\d+)", text),
        "age":           _find(r"/\s*(\d+)\s*Y\b", text),
        "gender":        _find(r"PATIENT\s*\(([MF])\)", text),
        "date_of_birth": None,
        "mobile":        _find(r"Mob(?:ile)?\.?\s*No\.?[:\s]+(\d{10})", text),
        "address":       _find(r"Address:\s*(.+?)(?:\n|Weight)", text),
        "weight_kg":     _find(r"Weight\s*\(Kg\)\s*[:\-]?\s*(\d+)", text),
        "height_cm":     _find(r"Height\s*\(Cm[}\)]\s*[:\-]?\s*(\d+)", text),
        "bmi":           _find(r"B\.M\.I\.\s*=\s*([\d.]+)", text),
        "bp":            _find(r"BP:\s*(\d+/\d+)", text),
        "contact":       None,
    }


def _indian_doctor(text: str) -> dict:
    return {
        "name":            _find(r"Dr\.?\s+([A-Za-z]+)", text),
        "qualification":   _find(r"\n(M\.?S\.?|M\.?D\.?|M\.?B\.?B\.?S\.?)\b", text),
        "registration_no": _find(r"Reg\.?\s*No[:\s.]+([A-Z0-9]+\s*\d+)", text),
        "license_number":  None,
    }


def _indian_hospital(text: str) -> dict:
    return {
        "name":    _find(r"(SMS\s*[Hh]ospital|[A-Z][a-zA-Z\s]+[Hh]ospital)", text),
        "address": _find(r"(B/\d+[^\n]+)", text),
        "phone":   _find(r"Ph:\s*([\d]+)", text),
        "timing":  _find(r"Timing:\s*(.+?)(?:\n|Closed)", text),
    }


def _indian_diagnosis(text: str) -> list:
    match = re.search(
        r"Diagnosis[:\s]*(.*?)(?=Medicine\s*Name|^\s*R\s*$|\n\s*\n)",
        text, re.IGNORECASE | re.DOTALL | re.MULTILINE
    )
    if match:
        items = re.findall(r"\*\s*([^\n\*]+)", match.group(1))
        return [i.strip() for i in items if i.strip()]
    return []


def _indian_medicines(text: str) -> list:
    medicines = []
    seen = set()

    table_match = re.search(
        r"Medicine\s*Name.*?Duration\s*\n(.*?)(?=Advice|Follow\s*Up|$)",
        text, re.IGNORECASE | re.DOTALL
    )
    search_text = table_match.group(1) if table_match else text
    blocks = re.split(r"(?m)(?=^\s*\d+[).]\s)", search_text)

    for block in blocks:
        block = block.strip()
        if not block or not re.match(r"^\d+[).]\s", block):
            continue

        flat = re.sub(r"\s+", " ", block).strip()
        if re.search(r"medicine\s*name|dosage|duration", flat, re.IGNORECASE):
            continue

        flat_no_num = re.sub(r"^\d+[).]\s*", "", flat).strip()

        name_match = re.match(
            r"^((?:TAB|CAP|SYP|INJ|DROP|GEL|CREAM)[.,]?\s+"
            r"[A-Z][A-Z0-9\s/\.\-]*?"
            r"(?:\s+\d+(?=[/A-Z]))?)"
            r"(?=\s+\d*\s*(?:Morning|Night|Evening|After|Before|Daily|Once|Twice)"
            r"|\s+(?:Morning|Night|Evening|After|Before|Daily|Once|Twice))",
            flat_no_num, re.IGNORECASE
        )
        if not name_match:
            name_match = re.match(
                r"^([A-Za-z][A-Za-z0-9\s./\-]+?)"
                r"(?=\s+\d*\s*(?:Morning|Night|Day)"
                r"|\s+(?:Morning|Night|Evening))",
                flat_no_num, re.IGNORECASE
            )
        if not name_match:
            continue

        name = re.sub(r"\s+\d+$", "", name_match.group(1)).strip()
        key  = re.sub(r"\s+", "", name.upper())
        if key in seen:
            continue
        seen.add(key)

        days_match = re.search(r"(\d+)\s*Days?", flat, re.IGNORECASE)
        tot_match  = re.search(
            r"[({[\-]?\s*[Tt][Oo0][Tt][Kk]?[:\s]?\s*(\d+\s*(?:Tab|Cap|ml|Caps?)?)\s*[)}\]]?",
            flat, re.IGNORECASE
        )

        freq = None
        remaining = flat_no_num[name_match.end():].strip()
        remaining = re.sub(r"^\d+\s*", "", remaining, count=1) \
            if re.match(r"^\d+\s+(?:Morning|Night|Evening)", remaining, re.IGNORECASE) \
            else remaining
        if days_match:
            pos = remaining.lower().find(days_match.group(0).lower())
            if pos > 0:
                freq = re.sub(r"\s+", " ", remaining[:pos]).strip()
                freq = re.sub(r"[,\s]+$", "", freq).strip() or None

        medicines.append({
            "name":           name,
            "dosage":         None,
            "frequency":      freq,
            "route":          "Oral",
            "duration_days":  int(days_match.group(1)) if days_match else None,
            "total_quantity": tot_match.group(1).strip() if tot_match else None,
            "refills":        None,
            "indications":    None,
            "instructions":   "After Food" if freq and "after food" in freq.lower() else None,
        })

    return medicines


def _indian_advice(text: str) -> list:
    match = re.search(
        r"Advice[:\s]*(.*?)(?=Follow\s*Up|Substitute|$)",
        text, re.IGNORECASE | re.DOTALL
    )
    if match:
        items = re.findall(r"\*\s*([^\n\*]+)", match.group(1))
        return [i.strip() for i in items if i.strip()]
    return []


# ================================================================
# WESTERN FORMAT PARSER
# ================================================================
def parse_western(text: str) -> dict:
    return {
        "format":            "western",
        "patient":           _western_patient(text),
        "doctor":            _western_doctor(text),
        "hospital":          {"name": None, "address": None, "phone": None, "timing": None},
        "prescription_date": _find(r"Date\s*of\s*Prescription[:\s]+([A-Za-z0-9\s,]+?)(?:\n|$)", text),
        "follow_up_date":    None,
        "diagnosis":         [],
        "medicines":         _western_medicines(text),
        "advice":            [],
    }


def _western_patient(text: str) -> dict:
    return {
        "name":          _find(r"Patient\s*Name[:\s]+([A-Za-z\s]+?)(?:\n|$)", text),
        "id":            _find(r"Patient\s*ID[:\s]+([A-Z0-9]+)", text),
        "age":           None,
        "gender":        None,
        "date_of_birth": _find(r"Date\s*of\s*Birth[:\s]+([A-Za-z0-9\s,]+?)(?:\n|$)", text),
        "mobile":        None,
        "address":       None,
        "weight_kg":     None,
        "height_cm":     None,
        "bmi":           None,
        "bp":            None,
        "contact":       _find(r"Contact\s*(?:Information)?[:\s]+([\d\s\-]+?)(?:\n|$)", text),
    }


def _western_doctor(text: str) -> dict:
    return {
        "name":            _find(r"Prescriber\s*Name[:\s]+(Dr\.?\s*[\w\s\[\]]+?)(?:\n|$)", text),
        "qualification":   None,
        "registration_no": None,
        "license_number":  _find(r"License\s*Number[:\s]+([A-Z0-9\-]+)", text),
    }


def _western_medicines(text: str) -> list:
    medicines  = []
    freq_kws   = ["3 times a day","three times a day","twice a day","twice daily",
                  "once daily","once a day","as needed","daily"]
    route_kws  = ["inhalation","intravenous","subcutaneous","intramuscular",
                  "sublingual","topical","oral"]
    skip_words = ["medication","dosage","frequency","route","indication",
                  "refill","administration","patient","prescriber","name"]

    lines = text.split("\n")
    table_start = 0
    for idx, line in enumerate(lines):
        if re.search(r"Medication\s*Name", line, re.IGNORECASE):
            table_start = idx + 1
            break

    pending_name = None
    for line in lines[table_start:]:
        line = line.strip()
        if not line:
            pending_name = None
            continue
        if re.search(r"^(advice|follow\s*up|note:|signature)", line, re.IGNORECASE):
            break

        dosage_m = re.search(r"(\d+(?:\.\d+)?)\s*(mg|mcg|ml|g|units?|iu)\b", line, re.IGNORECASE)
        if dosage_m:
            dosage = dosage_m.group(0).strip()
            pre    = line[:dosage_m.start()].strip()
            post   = line[dosage_m.end():].strip()
            name   = (pending_name + " " + pre).strip() if pending_name else pre
            pending_name = None
            if not name:
                continue

            frequency = None
            for kw in freq_kws:
                if kw.lower() in post.lower():
                    frequency = kw.title()
                    post = re.sub(re.escape(kw), "", post, flags=re.IGNORECASE).strip()
                    break

            route = None
            for rw in route_kws:
                if rw.lower() in post.lower():
                    route = rw.title()
                    post  = re.sub(re.escape(rw), "", post, flags=re.IGNORECASE).strip()
                    break

            refills  = None
            refill_m = re.search(r"\b(\d{1,2})\s*$", post)
            if refill_m:
                refills = int(refill_m.group(1))
                post    = post[:refill_m.start()].strip()

            medicines.append({
                "name":           name,
                "dosage":         dosage,
                "frequency":      frequency,
                "route":          route,
                "duration_days":  None,
                "total_quantity": None,
                "refills":        refills,
                "indications":    post if post else None,
                "instructions":   None,
            })
        else:
            is_name = (
                re.match(r"^[A-Z][a-zA-Z\s]+$", line) and
                len(line.split()) <= 3 and
                not any(kw in line.lower() for kw in skip_words)
            )
            pending_name = line if is_name else None

    return medicines


# ================================================================
# HELPERS
# ================================================================
def _find(pattern: str, text: str, flags=re.IGNORECASE) -> str | None:
    match = re.search(pattern, text, flags)
    return match.group(1).strip() if match else None


# ================================================================
# MAIN ENTRY POINT
# ================================================================
async def process_prescription(image_path: str, api_key: str = None) -> dict:
    """
    Full pipeline: Image/PDF → OCR → LLM (primary) → Regex (fallback) → JSON

    Usage in FastAPI:
        from OCR_OPEN import process_prescription

        @app.post("/upload-prescription")
        async def upload(file: UploadFile):
            result = process_prescription(saved_path, api_key=GEMINI_API_KEY)
            return result
    """
    print(f"\nProcessing: {image_path}")

    raw_text = extract_text_from_image(image_path)

    api_key = api_key or os.getenv("GEMINI_API_KEY")

    if api_key and LLM_AVAILABLE:
        print("Attempting LLM parsing...")
        result = parse_with_llm(raw_text, api_key)
        if result:
            result["_ocr_raw"] = raw_text
            return result

    print("Using regex parsing...")
    result = parse_with_regex(raw_text)
    result["_ocr_raw"] = raw_text
    return result
