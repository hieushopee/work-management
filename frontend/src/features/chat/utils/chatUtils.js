export const normalizeId = (value) => {
  if (value === undefined || value === null) return null;
  try {
    return value.toString();
  } catch {
    return null;
  }
};

export const encodeFileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const isImageAttachment = (attachment = {}) => {
  const kind = typeof attachment.kind === 'string' ? attachment.kind.toLowerCase() : null;
  if (kind) {
    if (kind === 'image') return true;
    if (kind !== 'image') return false;
  }

  const mimeType = typeof attachment.mimeType === 'string' ? attachment.mimeType : '';
  return mimeType.startsWith('image/');
};

export const formatFileSize = (size) => {
  if (!Number.isFinite(size) || size <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = size;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const formatted = value < 10 && index > 0 ? value.toFixed(1) : Math.round(value);
  return `${formatted} ${units[index]}`;
};

export const generateObjectId = () => {
  const hex = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 24; i += 1) {
    id += hex[Math.floor(Math.random() * 16)];
  }
  return id;
};

export const normalizeToString = (value) => {
  if (value === undefined || value === null) return null;
  try {
    return value.toString();
  } catch {
    return null;
  }
};

export const toIsoTimestamp = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const normalizeString = (value) => {
  if (value === undefined || value === null) return '';
  try {
    return value.toString();
  } catch {
    return '';
  }
};

export const matchesSearchTerm = (term, user) => {
  if (!term) return true;
  const lowered = term.toLowerCase();
  const fields = [user?.name, user?.email, user?.role, user?.department];
  return fields.some((field) => normalizeString(field).toLowerCase().includes(lowered));
};