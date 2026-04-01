/**
 * PostModel — handles all post-related API calls.
 * Pure data layer: no DOM access, no UI logic.
 */

import { parseJSONResponse } from "../helpers/api.js";

export async function fetchPosts({ limit = 10, offset = 0 } = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(`/posts?${params.toString()}`);
  return parseJSONResponse(res, "Failed to fetch posts");
}

export async function createPost(postData) {
  const res = await fetch("/addpost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postData),
  });
  const json = await parseJSONResponse(res, "Failed to create post");
  return { ok: true, status: res.status, data: json };
}


export async function getLikedPosts() {
  const response = await fetch("/liked-posts", {
    method: "GET",
    credentials: "include",
  });

  return parseJSONResponse(response, "Failed to fetch liked posts");
}


export async function getSavedPosts() {
  const response = await fetch("/saved-posts", {
    method: "GET",
    credentials: "include",
  });

  return parseJSONResponse(response, "Failed to fetch saved posts");
}
