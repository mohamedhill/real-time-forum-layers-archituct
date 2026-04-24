
import { parseJSONResponse } from "../helpers/api.js";

export async function fetchComments(postId) {
  const res = await fetch(`/comments?postId=${postId}`);
  return parseJSONResponse(res, "Failed to fetch comments");
}

export async function getCommentCount(postId) {
  const res = await fetch(`/comment-count?postId=${postId}`);
  const data = await parseJSONResponse(res, "Failed to fetch comment count");
  return data.count;
}

export async function createComment(commentData) {
  const res = await fetch("/addcomment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(commentData),
  });
  const json = await parseJSONResponse(res, "Failed to create comment");
  return { ok: res.ok, status: res.status, data: json };
}

export async function deleteComment(commentId) {
  const res = await fetch(`/deletecomment?commentId=${commentId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const json = await parseJSONResponse(res, "Failed to delete comment");
  return { ok: res.ok, status: res.status, data: json };
}
