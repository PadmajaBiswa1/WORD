const mongoose = require('mongoose');

async function cleanupLegacyUserIndexes() {
  try {
    const usersCollection = mongoose.connection.collection('users');
    const indexes = await usersCollection.indexes();
    const hasLegacyFirebaseIndex = indexes.some((index) => index?.name === 'firebaseUid_1');

    if (hasLegacyFirebaseIndex) {
      await usersCollection.dropIndex('firebaseUid_1');
      console.log('Removed legacy users index: firebaseUid_1');
    }
  } catch (err) {
    // Ignore "ns not found"/missing collection cases during first boot.
    if (err?.codeName === 'NamespaceNotFound') return;
    if (String(err?.message || '').includes('index not found')) return;
    console.warn('Could not clean up legacy users indexes:', err.message);
  }
}

async function connectDB() {
  if (!process.env.MONGO_URI) {
    console.warn('MongoDB disabled: MONGO_URI is not set.');
    return false;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await cleanupLegacyUserIndexes();
    console.log('MongoDB connected');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    return false;
  }
}

module.exports = connectDB;
