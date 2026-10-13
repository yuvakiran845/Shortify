import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    // Always stored lowercase, so "Ana@Example.com" and "ana@example.com" are one account.
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      unique: true, // unique index: the database rejects a second account with the same email
    },
    // bcrypt hash, never the password itself. `select: false` keeps it out of
    // query results unless a query explicitly asks for it (only login does).
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    // Copied into every session token. Increasing it (on logout) makes all
    // existing tokens for this user invalid, including any stolen copies.
    sessionVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
