import io
import json
from functools import lru_cache
from typing import Any

import fitz
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from PIL import Image, ImageFilter, ImageStat

try:
    from paddleocr import PaddleOCR
except Exception:  # pragma: no cover - runtime dependency
    PaddleOCR = None  # type: ignore

app = FastAPI(title="Northline OCR Service", version="0.1.0")


@lru_cache(maxsize=1)
def get_ocr_engine():
    if PaddleOCR is None:
        raise HTTPException(status_code=503, detail="PaddleOCR is not installed in this environment")

    return PaddleOCR(
        lang="en",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )


def ensure_page_number(page_number: str | None) -> int:
    try:
        parsed = int(page_number or "1")
    except ValueError as error:  # pragma: no cover - defensive
        raise HTTPException(status_code=400, detail="pageNumber must be an integer") from error

    if parsed < 1:
        raise HTTPException(status_code=400, detail="pageNumber must be >= 1")

    return parsed


def load_page_image(file_name: str, content_type: str, payload: bytes, page_number: int) -> Image.Image:
    extension = (file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "")
    is_pdf = content_type == "application/pdf" or extension == "pdf"

    if is_pdf:
        document = fitz.open(stream=payload, filetype="pdf")
        if page_number > document.page_count:
            raise HTTPException(status_code=400, detail="Requested page exceeds PDF page count")

        page = document.load_page(page_number - 1)
        pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        image = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
        document.close()
        return image

    try:
        image = Image.open(io.BytesIO(payload)).convert("RGB")
    except Exception as error:  # pragma: no cover - defensive
        raise HTTPException(status_code=400, detail="Unable to decode uploaded image") from error

    return image


def to_numpy(image: Image.Image) -> np.ndarray[Any, Any]:
    return np.array(image)


def normalize_bbox(points: list[list[float]], width: int, height: int):
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    left = max(0.0, min(xs))
    top = max(0.0, min(ys))
    right = min(float(width), max(xs))
    bottom = min(float(height), max(ys))
    return {
        "x": left / width,
        "y": top / height,
        "width": max(1.0, right - left) / width,
        "height": max(1.0, bottom - top) / height,
    }


def analyze_quality(image: Image.Image):
    grayscale = image.convert("L")
    brightness = ImageStat.Stat(grayscale).mean[0]
    contrast = ImageStat.Stat(grayscale).stddev[0]
    blur_probe = grayscale.filter(ImageFilter.FIND_EDGES)
    sharpness = ImageStat.Stat(blur_probe).mean[0]
    width, height = image.size

    issues: list[str] = []

    if min(width, height) < 1000:
        issues.append("resolution_low")
    if brightness < 60:
        issues.append("too_dark")
    if contrast < 25:
        issues.append("low_contrast")
    if sharpness < 8:
        issues.append("blurry")

    if not issues:
        status = "good"
    elif len(issues) == 1:
        status = "review"
    else:
        status = "poor"

    suggestions = {
        "resolution_low": "Increase scan resolution or export at 150-200 DPI.",
        "too_dark": "Improve lighting or adjust exposure before upload.",
        "low_contrast": "Increase contrast to separate text from background.",
        "blurry": "Use a sharper scan or retake the photo without motion blur.",
    }

    return {
        "status": status,
        "checks": {
            "width": width,
            "height": height,
            "brightness": round(brightness, 2),
            "contrast": round(contrast, 2),
            "sharpness": round(sharpness, 2),
            "issues": issues,
        },
        "suggestions": [suggestions[item] for item in issues],
    }


def unwrap_prediction_payload(prediction_item: Any):
    payload = getattr(prediction_item, "json", prediction_item)
    if isinstance(payload, str):
        payload = json.loads(payload)
    if isinstance(payload, dict) and "res" in payload and isinstance(payload["res"], dict):
        return payload["res"]
    if isinstance(payload, dict):
        return payload
    raise HTTPException(status_code=500, detail="Unexpected PaddleOCR prediction payload")


def to_float_list(values: Any):
    if values is None:
        return []
    return [float(value) for value in list(values)]


def to_points_list(values: Any):
    if values is None:
        return []
    return [
        [[float(point[0]), float(point[1])] for point in polygon]
        for polygon in list(values)
    ]


def run_detect(image: Image.Image):
    ocr = get_ocr_engine()
    width, height = image.size
    predictions = list(ocr.predict(to_numpy(image)))
    payload = unwrap_prediction_payload(predictions[0]) if predictions else {}
    points_list = to_points_list(payload.get("rec_polys") or payload.get("dt_polys"))
    text_list = list(payload.get("rec_texts") or [])
    confidence_list = to_float_list(payload.get("rec_scores") or payload.get("dt_scores"))
    candidates = []

    for index, points in enumerate(points_list):
        text = text_list[index] if index < len(text_list) else ""
        confidence = confidence_list[index] if index < len(confidence_list) else 0.0
        candidates.append(
            {
                "id": f"cand-{index + 1}",
                "bboxNormalized": normalize_bbox(points, width, height),
                "confidence": round(confidence, 4),
                "textPreview": text[:80],
            }
        )

    return {"candidates": candidates}


def crop_bbox(image: Image.Image, bbox: dict[str, float]):
    width, height = image.size
    left = int(clamp(bbox["x"], 0, 1) * width)
    top = int(clamp(bbox["y"], 0, 1) * height)
    right = int(clamp(bbox["x"] + bbox["width"], 0, 1) * width)
    bottom = int(clamp(bbox["y"] + bbox["height"], 0, 1) * height)

    if right <= left:
        right = min(width, left + 1)
    if bottom <= top:
        bottom = min(height, top + 1)

    return image.crop((left, top, right, bottom))


def clamp(value: float, minimum: float, maximum: float):
    return max(minimum, min(maximum, value))


def run_recognize(image: Image.Image, fields: list[dict[str, Any]]):
    ocr = get_ocr_engine()
    results = []

    for field in fields:
        bbox = field["bboxNormalized"]
        crop = crop_bbox(image, bbox)
        predictions = list(ocr.predict(to_numpy(crop)))
        payload = unwrap_prediction_payload(predictions[0]) if predictions else {}
        text_fragments = [str(fragment).strip() for fragment in list(payload.get("rec_texts") or []) if str(fragment).strip()]
        confidences = to_float_list(payload.get("rec_scores"))
        text = " ".join(text_fragments).strip()
        confidence = sum(confidences) / len(confidences) if confidences else 0.0

        results.append(
            {
                "fieldName": field["fieldName"],
                "outputColumn": field["outputColumn"],
                "fieldType": field["fieldType"],
                "text": text,
                "confidence": round(confidence, 4),
                "bboxNormalized": bbox,
            }
        )

    return {"fields": results}


async def read_upload(file: UploadFile):
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    return payload


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/quality-check")
async def quality_check(file: UploadFile = File(...), pageNumber: str = Form("1")):
    payload = await read_upload(file)
    image = load_page_image(file.filename or "document", file.content_type or "", payload, ensure_page_number(pageNumber))
    return analyze_quality(image)


@app.post("/detect")
async def detect(file: UploadFile = File(...), pageNumber: str = Form("1")):
    payload = await read_upload(file)
    image = load_page_image(file.filename or "document", file.content_type or "", payload, ensure_page_number(pageNumber))
    return run_detect(image)


@app.post("/recognize")
async def recognize(
    file: UploadFile = File(...),
    pageNumber: str = Form("1"),
    fields: str = Form(...),
):
    payload = await read_upload(file)
    image = load_page_image(file.filename or "document", file.content_type or "", payload, ensure_page_number(pageNumber))

    try:
        parsed_fields = json.loads(fields)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=400, detail="fields must be valid JSON") from error

    if not isinstance(parsed_fields, list):
        raise HTTPException(status_code=400, detail="fields must be a JSON array")

    return run_recognize(image, parsed_fields)
