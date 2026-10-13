import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected: ${host}/${name}`);
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
