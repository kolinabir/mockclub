import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Cloudflare R2, reached over the S3 API.
 *
 * R2 is S3-compatible, so the official S3 client works unchanged as long as the
 * endpoint points at r2.cloudflarestorage.com and the region is the literal
 * "auto" — R2 has no regions, but SigV4 demands the field be present.
 *
 * Deliberately the ONLY module that knows an object store exists. Everything
 * above it deals in keys, so switching provider (or moving to a public CDN
 * domain) is a change here and nowhere else.
 */

export type R2Config = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

/**
 * `null` when any piece is missing rather than throwing at import time.
 *
 * A missing bucket must not take the whole app down at build — uploads are one
 * feature, and every caller here already has a "storage is off" branch. The
 * credentials are read but never returned to a caller and never logged.
 */
function config(): R2Config | null {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { endpoint, accessKeyId, secretAccessKey, bucket };
}

export function isStorageConfigured(): boolean {
  return config() !== null;
}

let cached: { client: S3Client; bucket: string } | null = null;

/** One client per process — it holds a connection pool worth reusing. */
function connect(): { client: S3Client; bucket: string } | null {
  if (cached) return cached;

  const c = config();
  if (!c) return null;

  cached = {
    bucket: c.bucket,
    client: new S3Client({
      region: "auto",
      endpoint: c.endpoint,
      credentials: {
        accessKeyId: c.accessKeyId,
        secretAccessKey: c.secretAccessKey,
      },
    }),
  };
  return cached;
}

export type PutResult = { ok: true } | { ok: false; error: string };

/**
 * Writes an object, overwriting whatever was at that key.
 *
 * `cacheControl` is stored ON the object so it survives however the bytes are
 * eventually served — through the proxy route today, straight off a public
 * r2.dev domain tomorrow. The default is deliberately modest: a caller that
 * wants a long TTL has to say so, having thought about how the object gets
 * deleted, because no cache anywhere can be recalled once it's handed out.
 */
export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
  cacheControl = "public, max-age=3600",
): Promise<PutResult> {
  const conn = connect();
  if (!conn) return { ok: false, error: "Storage isn't configured." };

  try {
    await conn.client.send(
      new PutObjectCommand({
        Bucket: conn.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      }),
    );
    return { ok: true };
  } catch {
    // The SDK's error can carry the signed request; never surface or log it.
    return { ok: false, error: "Couldn't store that file." };
  }
}

/** Best-effort. A failed cleanup leaves an orphan, which is not worth failing
 *  a user-facing write over — see the callers. */
export async function deleteObject(key: string): Promise<void> {
  const conn = connect();
  if (!conn) return;

  try {
    await conn.client.send(
      new DeleteObjectCommand({ Bucket: conn.bucket, Key: key }),
    );
  } catch {
    /* orphaned object; harmless */
  }
}

export type FetchedObject = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength?: number;
  etag?: string;
};

/** Reads an object back out. `null` for "not there", which callers turn into a 404. */
export async function getObject(key: string): Promise<FetchedObject | null> {
  const conn = connect();
  if (!conn) return null;

  try {
    const res = await conn.client.send(
      new GetObjectCommand({ Bucket: conn.bucket, Key: key }),
    );
    if (!res.Body) return null;

    return {
      body: res.Body.transformToWebStream(),
      contentType: res.ContentType ?? "application/octet-stream",
      contentLength: res.ContentLength,
      etag: res.ETag,
    };
  } catch {
    return null;
  }
}
