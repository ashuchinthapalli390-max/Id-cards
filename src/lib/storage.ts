import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET = "id-card-photos";

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

    if (!url || !key) {
      throw new Error("Supabase configuration missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
    }

    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

export interface UploadPhotoResult {
  success: boolean;
  storagePath: string;
  storageBucket: string;
  signedUrl?: string;
  error?: string;
}

/**
 * Uploads an intern photo to the private Supabase storage bucket.
 * The storage path follows the pattern: `${internId}/${internId}_v${version}_${timestamp}.jpg`
 */
export async function uploadInternPhotoToPrivateStorage(
  internId: string,
  fileBuffer: Buffer,
  mimeType: string = "image/jpeg",
  version: number = 1
): Promise<UploadPhotoResult> {
  const supabase = getSupabaseAdmin();
  const cleanInternId = internId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const timestamp = Date.now();
  const storagePath = `${cleanInternId}/${cleanInternId}_v${version}_${timestamp}.jpg`;

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error("[uploadInternPhotoToPrivateStorage Error]", error);
      return {
        success: false,
        storagePath: "",
        storageBucket: STORAGE_BUCKET,
        error: error.message || "Failed to store image in private storage.",
      };
    }

    return {
      success: true,
      storagePath: data.path,
      storageBucket: STORAGE_BUCKET,
    };
  } catch (err: any) {
    console.error("[uploadInternPhotoToPrivateStorage Exception]", err);
    return {
      success: false,
      storagePath: "",
      storageBucket: STORAGE_BUCKET,
      error: err.message || "Network exception during image storage.",
    };
  }
}

/**
 * Downloads the raw photo buffer from private storage for streaming ZIP export or admin preview.
 */
export async function downloadProtectedPhotoBuffer(
  storagePath: string,
  storageBucket: string = STORAGE_BUCKET
): Promise<{ buffer: Buffer | null; error?: string }> {
  const supabase = getSupabaseAdmin();

  try {
    // If path is a full public URL from legacy uploads, handle it gracefully
    let actualPath = storagePath;
    if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
      const match = storagePath.match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+)$/);
      if (match) {
        storageBucket = match[1];
        actualPath = decodeURIComponent(match[2]);
      }
    }

    const { data, error } = await supabase.storage.from(storageBucket).download(actualPath);

    if (error || !data) {
      console.error(`[downloadProtectedPhotoBuffer Error for ${actualPath}]`, error);
      return { buffer: null, error: error?.message || "File not found in storage." };
    }

    const arrayBuffer = await data.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer) };
  } catch (err: any) {
    console.error(`[downloadProtectedPhotoBuffer Exception for ${storagePath}]`, err);
    return { buffer: null, error: err.message || "Failed to download image." };
  }
}

/**
 * Generates a short-lived (15 min) signed URL for secure administrator image preview in browser.
 */
export async function getProtectedPhotoSignedUrl(
  storagePath: string,
  storageBucket: string = STORAGE_BUCKET,
  expiresInSeconds: number = 900
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  try {
    let actualPath = storagePath;
    if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
      const match = storagePath.match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+)$/);
      if (match) {
        storageBucket = match[1];
        actualPath = decodeURIComponent(match[2]);
      } else {
        return storagePath; // Return legacy URL if not standard Supabase format
      }
    }

    const { data, error } = await supabase.storage
      .from(storageBucket)
      .createSignedUrl(actualPath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return null;
    }

    return data.signedUrl;
  } catch {
    return null;
  }
}
