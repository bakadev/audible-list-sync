/**
 * S3 Client — singleton client, upload, and presigned URL generation.
 *
 * Bucket is private (Block Public Access ON). Images are served via
 * proxy routes that 302-redirect to presigned S3 URLs.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const REGION = process.env.AWS_REGION || 'us-east-1'
const BUCKET = process.env.S3_BUCKET || 'audioshlf-lists'

/** Module-scope singleton — reused across requests in the same process. */
let _client: S3Client | null = null

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return _client
}

/**
 * Upload a PNG buffer to S3.
 *
 * @param key   S3 object key (e.g. "lists/clxyz123/v2/og.png")
 * @param buffer PNG image buffer
 * @returns The S3 key that was written
 */
export async function uploadImage(
  key: string,
  buffer: Buffer
): Promise<string> {
  const client = getClient()

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )

  return key
}

/**
 * Generate a presigned GET URL for an S3 object.
 *
 * @param key       S3 object key
 * @param expiresIn TTL in seconds (default 1 hour)
 * @returns Presigned URL string
 */
export async function getSignedImageUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getClient()

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
    { expiresIn }
  )

  return url
}
