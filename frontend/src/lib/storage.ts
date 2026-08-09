const API_BASE = import.meta.env.VITE_API_BASE_URL

export interface UploadedImage {
  path: string
  url: string
}

export async function uploadProductImage(file: File, accessToken: string): Promise<UploadedImage> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/api/storage/product-images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Upload failed (${res.status})`)
  }

  return res.json() as Promise<UploadedImage>
}
