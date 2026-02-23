/**
 * PostModel — handles all post-related API calls.
 * Pure data layer: no DOM access, no UI logic.
 */

export async function fetchPosts() {
  const res = await fetch("/posts");
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
}

export async function createPost(postData) {
  const res = await fetch("/addpost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postData),
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, data: json };
}
