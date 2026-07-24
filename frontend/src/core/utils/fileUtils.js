// NovaMind — frontend/src/core/utils/fileUtils.js
// Shared file categorization and icon/type helpers.

export function getFileTypeCategory(fileName = "", mimeType = "") {
  const ext  = (fileName.split(".").pop() || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();

  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext) || mime.startsWith("image/")) {
    return "image";
  }
  if (ext === "pdf" || mime === "application/pdf") {
    return "pdf";
  }
  if (["docx", "doc"].includes(ext) || mime.includes("word") || mime.includes("wordprocessingml")) {
    return "word";
  }
  if (["xlsx", "xls", "csv"].includes(ext) || mime.includes("excel") || mime.includes("spreadsheetml") || mime.includes("csv")) {
    return "excel";
  }
  if (["pptx", "ppt"].includes(ext) || mime.includes("powerpoint") || mime.includes("presentationml")) {
    return "powerpoint";
  }
  if (ext === "txt" || mime.includes("text/plain")) {
    return "text";
  }
  return "other";
}

export function getFileIconName(fileName = "", mimeType = "") {
  const cat = getFileTypeCategory(fileName, mimeType);
  switch (cat) {
    case "image":      return "lucide:image";
    case "pdf":        return "lucide:file-text";
    case "word":       return "lucide:file-text";
    case "excel":      return "lucide:table";
    case "powerpoint": return "lucide:presentation";
    case "text":       return "lucide:file-code";
    default:           return "lucide:file";
  }
}
