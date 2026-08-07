import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from ..core.deps import require_admin
from ..core.supabase import get_supabase

router = APIRouter(prefix="/api/storage", tags=["storage"])

BUCKET = "product-images"
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.post("/product-images", status_code=status.HTTP_201_CREATED)
async def upload_product_image(
    file: UploadFile,
    _admin=Depends(require_admin),  # noqa: B008
) -> dict[str, str]:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type"
        )

    extension = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    path = f"{uuid.uuid4()}.{extension}"
    contents = await file.read()

    supabase = get_supabase()
    supabase.storage.from_(BUCKET).upload(
        path, contents, {"content-type": file.content_type}
    )
    public_url = supabase.storage.from_(BUCKET).get_public_url(path)

    return {"path": path, "url": public_url}


@router.delete("/product-images/{path}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_image(path: str, _admin=Depends(require_admin)) -> None:  # noqa: B008
    supabase = get_supabase()
    supabase.storage.from_(BUCKET).remove([path])
