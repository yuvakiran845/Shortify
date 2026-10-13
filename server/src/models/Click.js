import mongoose from 'mongoose';

/**
 * One document per counted click, used for analytics.
 *
 * Privacy by design - what is stored:
 *   link, owner, time, the referring site's domain (not its full URL),
 *   a coarse device type, and a daily visitor hash (see visitorService.js).
 * What is NOT stored: IP address, full User-Agent, full referrer URL, cookies, location.
 */
const clickSchema = new mongoose.Schema(
  {
    link: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Link',
      required: true,
    },
    // Copied from the link so a user's analytics can be queried in one indexed
    // step, without first collecting all of their link ids.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    clickedAt: {
      type: Date,
      default: Date.now,
    },
    // e.g. "news.ycombinator.com"; null when the browser sent no referrer ("direct").
    referrerHost: {
      type: String,
      default: null,
      maxlength: 255,
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'other'],
      default: 'other',
    },
    // HMAC of IP + browser with a random salt that changes every day and is
    // deleted after two days, so it can count "unique visitors per day" but can
    // never be turned back into an IP address.
    visitorId: {
      type: String,
      default: null,
    },
  },
  { versionKey: false },
);

// "Clicks for this link, newest first / in a date range".
clickSchema.index({ link: 1, clickedAt: -1 });
// "All of this user's clicks in a date range" (the analytics page).
clickSchema.index({ owner: 1, clickedAt: -1 });

export const Click = mongoose.model('Click', clickSchema);
