import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile

from app.config import settings

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


class FileHandler:
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save_upload(self, file: UploadFile) -> Path:
        """Save an uploaded file to disk with a UUID-based name. Returns the path."""
        suffix = Path(file.filename or "upload.pdf").suffix or ".pdf"
        stored_name = f"{uuid.uuid4().hex}{suffix}"
        dest = self.upload_dir / stored_name

        async with aiofiles.open(dest, "wb") as out:
            while chunk := await file.read(1024 * 1024):
                await out.write(chunk)
        return dest

    def delete_file(self, filename: str) -> None:
        target = self.upload_dir / filename
        try:
            target.unlink()
        except FileNotFoundError:
            pass


file_handler = FileHandler()
