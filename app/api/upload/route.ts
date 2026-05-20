import { getUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/cortex/rate-limit";
import { processAndStoreFile } from "@/lib/cortex/rag";

export const maxDuration = 120; // PDF parsing + embedding can take time
export const runtime = "nodejs"; // pdf-parse requires Node.js APIs

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
];

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResult = await checkRateLimit(user.id);
  if (!rateLimitResult.ok) {
    return Response.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimitResult.retryAfter) },
      },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json(
      { error: "Could not parse form data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json(
      { error: "Missing 'file' field (must be a file upload)" },
      { status: 400 },
    );
  }

  const workspaceId = formData.get("workspace_id") as string | null;

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
      { status: 413 },
    );
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return Response.json(
      {
        error: `Unsupported file type: ${file.type}. Supported types: PDF, TXT, Markdown.`,
      },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name;
  const contentType = file.type;
  const storagePath = `${user.id}/${crypto.randomUUID()}-${filename}`;

  const supabase = await createSupabaseServerClient();

  // Upload to Supabase Storage first
  const { error: uploadError } = await supabase.storage
    .from("cortex-files")
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    return Response.json(
      { error: `Failed to store file: ${uploadError.message}` },
      { status: 500 },
    );
  }

  try {
    // Process: extract text → chunk → embed → store in DB
    const document = await processAndStoreFile(supabase, {
      userId: user.id,
      workspaceId: workspaceId ?? undefined,
      buffer,
      filename,
      contentType,
      storagePath,
      sizeBytes: file.size,
    });

    return Response.json({ document });
  } catch (err) {
    // Processing failed — clean up the storage file
    await supabase.storage.from("cortex-files").remove([storagePath]);

    const message =
      err instanceof Error ? err.message : "File processing failed";
    return Response.json({ error: message }, { status: 422 });
  }
}
