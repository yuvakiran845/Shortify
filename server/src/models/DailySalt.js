import mongoose from 'mongoose';

export const SALT_LIFETIME_SECONDS = 2 * 24 * 60 * 60; // 2 days

/**
 * A random secret per UTC day, used to hash visitors for "unique visitors".
 * Stored in MongoDB (not memory) so every server instance uses the same salt
 * and restarts do not change it. A TTL index makes MongoDB delete each salt
 * automatically after two days; once it is gone, that day's visitor hashes
 * can no longer be linked to anyone.
 */
const dailySaltSchema = new mongoose.Schema(
  {
    day: { type: String, required: true, unique: true }, // "2026-10-13" (UTC)
    salt: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: SALT_LIFETIME_SECONDS },
  },
  { versionKey: false },
);

export const DailySalt = mongoose.model('DailySalt', dailySaltSchema);
