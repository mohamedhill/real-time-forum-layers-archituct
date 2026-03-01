/**
 * AuthModel — handles all authentication-related API calls.
 * Pure data layer: no DOM access, no UI logic.
 */

export async function register(data) {
  const res = await fetch("/registerAuth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, data: json };
}

export async function login(identifier, password) {
  const res = await fetch("/loginAuth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, data: json };
}

export async function logout() {
  await fetch("/logout", { method: "POST", credentials: "include" });
}

export async function checkSession() {
  const res = await fetch("/check-session", { credentials: "include" });

  if (!res.ok) {
    return { status: res.status };
  }

  const data = await res.json(); 
  return { status: res.status, data };
}