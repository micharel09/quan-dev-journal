import { API_URL } from "@/services/api/config";

export async function readJournal<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}/v1/articles${path}`, {
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "Article not found"
        : "Could not load articles. Please try again."
    );
  return response.json();
}
