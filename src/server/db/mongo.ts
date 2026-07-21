import "server-only";

import { MongoClient, type Db } from "mongodb";

/**
 * Cached MongoClient. Next.js (dev HMR and serverless) instantiates modules
 * many times; without a global cache each one opens its own pool and exhausts
 * Atlas connections. One promise, reused.
 *
 * This file is framework-free on purpose — no `next/*` import — per the
 * server/ boundary rule.
 */

const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

function clientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    globalForMongo._mongoClientPromise = client.connect();
  }
  return globalForMongo._mongoClientPromise;
}

/** The `mockclub` database (name comes from the connection string). */
export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db();
}
