import mongoose from 'mongoose';
import { MAX_URL_LENGTH } from '../utils/url.js';

// One row per (user, URL) in a user's QR code history. Generating the same
// URL again moves it back to the top instead of creating a duplicate.
const qrCodeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Exactly the text encoded in the QR code.
    content: {
      type: String,
      required: true,
      maxlength: MAX_URL_LENGTH,
    },
    // Set when the QR code is for one of the user's Shortify links.
    link: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Link',
      default: null,
    },
    // How many times the user generated this QR code, and when they last did.
    generatedCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    lastGeneratedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// One entry per user per URL (the database enforces it), and fast "newest first" history.
qrCodeSchema.index({ owner: 1, content: 1 }, { unique: true });
qrCodeSchema.index({ owner: 1, lastGeneratedAt: -1 });

export const QrCode = mongoose.model('QrCode', qrCodeSchema);
