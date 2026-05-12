"""Upload blueprint — local file storage, no external services needed."""

import os
import uuid
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, send_from_directory

from app.decorators import session_required

bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _upload_dir() -> Path:
    # current_app.root_path = .../backend/app
    # go up two levels to get .../backend, then uploads/
    base = Path(current_app.root_path).parent  # .../backend
    d = base / "uploads"
    d.mkdir(parents=True, exist_ok=True)
    return d.resolve()


@bp.post("/image")
@session_required
def upload_image():
    """Upload an image file. Returns a public URL path."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "Empty file"}), 400

    if not _allowed(file.filename):
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        return jsonify({"error": f"File type not allowed. Accepted: {allowed}"}), 400

    # Read into memory to check size without consuming the stream
    data = file.read()
    if len(data) > MAX_FILE_SIZE:
        return jsonify({"error": "File too large. Max 5 MB."}), 400
    if len(data) == 0:
        return jsonify({"error": "File is empty"}), 400

    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    save_path = _upload_dir() / filename

    save_path.write_bytes(data)

    url = f"/api/uploads/files/{filename}"
    return jsonify({"url": url, "filename": filename}), 201


@bp.get("/files/<filename>")
def serve_file(filename):
    """Serve an uploaded file."""
    # Prevent path traversal
    safe = Path(filename).name
    if safe != filename or "/" in filename or "\\" in filename or ".." in filename:
        return jsonify({"error": "Invalid filename"}), 400
    upload_dir = str(_upload_dir())
    return send_from_directory(upload_dir, safe)


@bp.get("/signature")
def upload_signature():
    return jsonify({"error": "Use POST /api/uploads/image for direct file upload."}), 410
