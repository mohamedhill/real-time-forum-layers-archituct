
export async function fetchComments(postId) {
  const res = await fetch(`/comments?postId=${postId}`);
  if (!res.ok) throw new Error("Failed to fetch comments");
  return res.json();
}

export async function getCommentCount(postId) {
  const res = await fetch(`/comment-count?postId=${postId}`);
  if (!res.ok) throw new Error("Failed to fetch comment count");
  const data = await res.json();
  return data.count;
}

export async function createComment(commentData) {
  const res = await fetch("/addcomment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(commentData),
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, data: json };
}

export async function deleteComment(commentId) {
  const res = await fetch(`/deletecomment?commentId=${commentId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, data: json };
}
