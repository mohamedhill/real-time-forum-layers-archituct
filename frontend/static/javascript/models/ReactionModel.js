/**
 * ReactionModel — handles all reaction-related API calls.
 * Pure data layer: no DOM access, no UI logic.
 */

import { parseJSONResponse } from "../helpers/api.js";

export async function sendReaction(postId, type) {
  const res = await fetch("/react", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId, type }),
  });
  return parseJSONResponse(res, "Failed to send reaction");
}

export async function fetchReactionCounts(postId) {
  const res = await fetch(`/reaction-counts?postId=${postId}`);
  return parseJSONResponse(res, "Failed to fetch reaction counts");
}
