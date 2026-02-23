/**
 * ReactionModel — handles all reaction-related API calls.
 * Pure data layer: no DOM access, no UI logic.
 */

export async function sendReaction(postId, type) {
  const res = await fetch("/react", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId, type }),
  });
  if (!res.ok) throw new Error("Failed to send reaction");
  return res.json();
}

export async function fetchReactionCounts(postId) {
  const res = await fetch(`/reaction-counts?postId=${postId}`);
  if (!res.ok) throw new Error("Failed to fetch reaction counts");
  return res.json(); // { likes, dislikes, saves }
}
