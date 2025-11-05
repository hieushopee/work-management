import mongoose from 'mongoose';

const { Types } = mongoose;

export const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }
  return null;
};

export const normalizeId = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value.toString === 'function') {
    try {
      return value.toString();
    } catch (_error) {
      return null;
    }
  }
  return null;
};

export const buildConversationId = (id1, id2) => {
  const normalized = [normalizeId(id1), normalizeId(id2)].filter(Boolean);
  return normalized.sort().join('_');
};