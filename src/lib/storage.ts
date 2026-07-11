import { supabase } from "@/lib/supabase";

export async function uploadImage(bucket: string, id: number, file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${id}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
