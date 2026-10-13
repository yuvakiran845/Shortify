import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { config } from '../../src/config/env.js';
import { Link } from '../../src/models/Link.js';
import { Click } from '../../src/models/Click.js';
import { User } from '../../src/models/User.js';
import { QrCode } from '../../src/models/QrCode.js';
import { DailySalt } from '../../src/models/DailySalt.js';
import { resetSaltCache } from '../../src/services/visitorService.js';

const MODELS = [Link, Click, User, QrCode, DailySalt];

export async function connectTestDatabase() {
  // Safety net: never run destructive test cleanup against a real database.
  assert.match(new URL(config.mongoUri).pathname, /_test$/, 'Tests must use a database whose name ends in _test');
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  await Promise.all(MODELS.map((model) => model.init())); // wait until indexes exist
}

export async function clearDatabase() {
  await Promise.all(MODELS.map((model) => model.deleteMany({})));
  resetSaltCache(); // the cached daily salt was just deleted from the database
}

export async function dropTestDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
