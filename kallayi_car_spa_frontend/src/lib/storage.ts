/**
 * KALLAYI CAR SPA & AUTO CARE - SUPABASE STORAGE UTILITY
 * Reusable server-side helper for uploading files, receipts, and Khata proof photos.
 */

import { getSupabaseAdmin } from '@/lib/supabaseServer';

const BUCKET_NAME = 'uploads';

/**
 * Ensures the uploads storage bucket exists and has public read access.
 */
async function ensureBucketExists() {
  const supabase = getSupabaseAdmin();
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET_NAME);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB limit
        allowedMimeTypes: [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/webp',
          'image/gif',
          'application/pdf',
        ],
      });
    }
  } catch (err) {
    console.warn('[Storage Bucket Initialization Warning]:', err);
  }
}

/**
 * Uploads a file (File, Blob, or Buffer) to Supabase Storage and returns its permanent public URL.
 *
 * @param file - File, Blob, or Buffer to upload
 * @param folder - Folder path inside the bucket (e.g., 'receipts', 'khata-proofs')
 * @param fileName - Optional preferred filename
 * @returns Promise<string> Public URL of the uploaded asset
 */
export async function uploadFileToStorage(
  file: File | Blob | Buffer,
  folder: string = 'receipts',
  fileName?: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  await ensureBucketExists();

  let buffer: Buffer;
  let mimeType = 'application/octet-stream';
  let originalName = fileName || 'file.jpg';

  if (file instanceof Buffer) {
    buffer = file;
  } else if (file instanceof Blob) {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    if (file.type) mimeType = file.type;
    if ('name' in file && typeof (file as any).name === 'string') {
      originalName = (file as any).name;
    }
  } else {
    throw new Error('Unsupported file payload provided for upload.');
  }

  // Derive file extension
  let ext = 'jpg';
  if (originalName.includes('.')) {
    ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  } else if (mimeType.includes('png')) {
    ext = 'png';
  } else if (mimeType.includes('webp')) {
    ext = 'webp';
  } else if (mimeType.includes('pdf')) {
    ext = 'pdf';
  }

  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const filePath = `${cleanFolder}/${timestamp}_${randomSuffix}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error('[Supabase Storage Upload Error]:', uploadError);
    throw new Error(`Failed to upload file to storage: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}
