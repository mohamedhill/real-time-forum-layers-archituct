import { parseJSONResponse } from "../helpers/api.js";

export async function getProfileSummary() {
  const res = await fetch("/profile-data", {
    method: "GET",
    credentials: "include",
  });

  return parseJSONResponse(res, "Failed to fetch profile");
}
