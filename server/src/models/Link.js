import mongoose from 'mongoose';
import { MAX_URL_LENGTH } from '../utils/url.js';

const linkSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      // Deleted links ("tombstones", see below) no longer keep their destination.
      required() {
        return !this.deletedAt;
      },
      maxlength: MAX_URL_LENGTH,
    },
    // Optional label to recognize the link in your list, e.g. "Spring newsletter".
    title: {
      type: String,
      default: null,
      maxlength: 100,
    },
    shortCode: {
      type: String,
      required: true,
      // Creates a unique index in MongoDB. The database itself rejects a
      // duplicate code, even if two requests insert at the same moment.
      unique: true,
    },
    // The account that owns this link (null for links created while logged out).
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Links created while logged out: SHA-256 hash of that browser's guest
    // cookie (see middleware/guest.js). Cleared when the links move into an account.
    guestKeyHash: {
      type: String,
      default: null,
    },
    // Total counted clicks. Stored on the link (instead of counting Click
    // documents every time) so lists can be sorted by popularity cheaply.
    clickCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastClickedAt: {
      type: Date,
      default: null,
    },
    // Optional expiry. After this moment the redirect answers 410 Gone.
    expiresAt: {
      type: Date,
      default: null,
    },
    // Owners can switch a link off without deleting it.
    isActive: {
      type: Boolean,
      default: true,
    },
    // Set when the owner deletes the link. The document stays as a "tombstone"
    // so its short code is never given to anyone else: old shared links and
    // printed QR codes can never start pointing somewhere unexpected.
    deletedAt: {
      type: Date,
      default: null,
    },
    // Set on the placeholder left behind when a link changes its alias: the
    // link that used this code before. Like a tombstone it keeps the old code
    // reserved, but that same link may take its old alias back.
    formerCodeOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Link',
      default: null,
    },
  },
  { timestamps: true }, // adds createdAt and updatedAt
);

// Compound indexes for "my links" pages. Each one matches a sort order
// (owner first, then the sort field, then _id as a tie-breaker), so MongoDB
// reads the page straight from the index instead of sorting in memory.
linkSchema.index({ owner: 1, createdAt: -1, _id: -1 }); // newest / oldest
linkSchema.index({ owner: 1, clickCount: -1, _id: -1 }); // most / fewest clicks
// Finds a browser's guest links quickly when they are claimed at sign-up/login.
linkSchema.index({ guestKeyHash: 1 });

export const Link = mongoose.model('Link', linkSchema);
