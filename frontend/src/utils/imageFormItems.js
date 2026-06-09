export function createExistingImageItems(imageUrls) {
  return (Array.isArray(imageUrls) ? imageUrls : [])
    .filter(Boolean)
    .map((url, index) => ({
      id: `existing-${index}-${url}`,
      url,
    }));
}

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB — mirrors backend UPLOAD_MAX_FILE_SIZE_BYTES

/**
 * Returns { accepted: ImageItem[], rejected: { file, reason }[] }.
 * Callers decide how to surface rejections to the user.
 */
export function createPendingImageItemsSafe(fileList) {
  const files = Array.from(fileList || []);
  const createdAt = Date.now();
  const accepted = [];
  const rejected = [];

  files.forEach((file, index) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      rejected.push({ file, reason: `"${file.name}" không phải định dạng ảnh được hỗ trợ (PNG, JPEG, WEBP, GIF).` });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      rejected.push({ file, reason: `"${file.name}" vượt quá dung lượng tối đa 10 MB.` });
      return;
    }
    accepted.push({
      id: `pending-${createdAt}-${index}-${file.name}-${file.size}-${file.lastModified}`,
      url: URL.createObjectURL(file),
      file,
    });
  });

  return { accepted, rejected };
}

export function createPendingImageItems(fileList) {
  const files = Array.from(fileList || []);
  const createdAt = Date.now();

  return files.map((file, index) => ({
    id: `pending-${createdAt}-${index}-${file.name}-${file.size}-${file.lastModified}`,
    url: URL.createObjectURL(file),
    file,
  }));
}

export function imageItemUrl(item) {
  if (typeof item === "string") return item;
  return item?.url || "";
}

export function existingImageUrlsFromItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => !item?.file)
    .map(imageItemUrl)
    .filter(Boolean);
}

export function pendingImageFilesFromItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item?.file)
    .map((item) => item.file);
}

export function revokePendingImageUrls(items) {
  (Array.isArray(items) ? items : []).forEach((item) => {
    if (item?.file && typeof item.url === "string" && item.url.startsWith("blob:")) {
      URL.revokeObjectURL(item.url);
    }
  });
}
