/** True when the request failed due to network/timeout (not a 4xx/5xx business error). */
export function isNetworkFailure(error) {
  if (!error) return false;
  if (error.response) return false;

  const code = error.code;
  if (code === 'ECONNABORTED' || code === 'ERR_NETWORK' || code === 'ECONNREFUSED') {
    return true;
  }

  const msg = String(error.message || '').toLowerCase();
  return /network error|timeout|socket|econnrefused|enotfound|etimedout|econnreset|failed to fetch|cannot reach/i.test(
    msg
  );
}

export function shouldQueueOffline(error) {
  return isNetworkFailure(error);
}
