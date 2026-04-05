/**
 * AuthModel — handles all authentication-related API calls.
 * Pure data layer: no DOM access, no UI logic.
 */

import { parseJSONResponse } from "../helpers/api.js";

export async function register(data) {
  try {
    const res = await fetch("/registerAuth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await parseJSONResponse(res, "Failed to register");
    return { ok: true, status: res.status, data: json };
  } catch (error) {
    return {
      ok: false,
      status: error?.status ?? 0,
      data: error?.data ?? null,
      error,
    };
  }
}

export async function login(identifier, password) {
  try {
    const res = await fetch("/loginAuth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const json = await parseJSONResponse(res, "Failed to login");
    return { ok: true, status: res.status, data: json };
  } catch (error) {
    return {
      ok: false,
      status: error?.status ?? 0,
      data: error?.data ?? null,
      error,
    };
  }
}

export async function logout() {
  const res = await fetch("/logout", { method: "POST", credentials: "include" });
  return parseJSONResponse(res, "Failed to logout");
}

export async function checkSession() {
  try {
    const res = await fetch("/check-session", { credentials: "include" });
    const data = await parseJSONResponse(res, "Failed to check session");
    return { ok: true, status: res.status, data };
  } catch (error) {
    return {
      ok: false,
      status: error?.status ?? 0,
      data: error?.data ?? null,
      error,
    };
  }
}
