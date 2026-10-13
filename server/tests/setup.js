// Loaded before every test file (see the "test" script in package.json).
// Tests use their own database so they never touch development data.
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/shortify_test';
process.env.PUBLIC_BASE_URL = 'https://sho.rt';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.CREATE_LINK_LIMIT_PER_MINUTE = '1000';
process.env.API_LIMIT_PER_MINUTE = '100000';
process.env.JWT_SECRET = 'test-only-secret-that-is-long-enough-1234567890';
process.env.BCRYPT_ROUNDS = '4'; // minimum cost: keeps tests fast (production uses 12)
process.env.LOGIN_LIMIT_PER_15_MINUTES = '1000';
process.env.REGISTER_LIMIT_PER_HOUR = '1000';
