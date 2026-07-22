import "server-only";

import { MongoClient, type Db } from "mongodb";

/**
 * One cached MongoClient for the whole app — the waitlist AND Better Auth share
 * it. Next.js (dev HMR and serverless) instantiates modules many times; without
 * a global cache each one opens its own pool and exhausts Atlas connections.
 *
 * Deliberately synchronous: the driver connects lazily on the first operation,
 * and Better Auth's mongodbAdapter needs a real `Db` at config time, not a
 * promise. `await getDb()` still works for existing callers.
 *
 * Framework-free on purpose — no `next/*` import — per the server/ boundary.
 */

const globalForMongo = globalThis as unknown as {
  _mongoClient?: MongoClient;
};

export function getMongoClient(): MongoClient {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  if (!globalForMongo._mongoClient) {
    globalForMongo._mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      // The driver defaults to maxPoolSize 100. On serverless each instance
      // holds its own pool, so a handful of instances would blow past Atlas
      // M0's ~500 connection ceiling. Serverless work is I/O-bound and
      // single-request, so a small pool is both safer and sufficient.
      maxPoolSize: 10,
      minPoolSize: 0,
    });
  }
  return globalForMongo._mongoClient;
}

/** The `mockclub` database (name comes from the connection string). */
export function getDb(): Db {
  return getMongoClient().db();
}
