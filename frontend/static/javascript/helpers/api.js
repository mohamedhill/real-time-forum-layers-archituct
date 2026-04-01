export async function parseJSONResponse(res, fallbackMessage) {
  let data = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data?.error || fallbackMessage;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}
