// A restored session's first data request has no earlier request that could
// have already woken a cold Render instance (login gets a deliberate 30s
// timeout for exactly that reason - see authService.js - but the role-home
// screens inherit axiosInstance's 8s default and are the first network call
// on a session restored from storage). This helper retries a request exactly
// once, and only when the failure looks like a transient timeout/network
// blip rather than a real server response, so a slow cold start does not
// surface as a hard error on the very first screen after session restore.
//
// Worst case is additive, not just "one more try": first 8s timeout, then
// this delay, then a second full 8s timeout if the retry also times out -
// with the current 8000ms global default and DEFAULT_RETRY_DELAY_MS below,
// that is 8s + 1s + 8s = ~17s before the screen's existing error alert can
// appear, not ~9s. See the worst-case-window test in the sibling test file.

var DEFAULT_RETRY_DELAY_MS = 1000;

function isTransientNetworkError(error) {
  if (!error || error.isAuthError) {
    return false;
  }

  // A real server response (401/403/404/5xx/etc) is never retried here -
  // only failures where no response came back at all.
  if (error.response) {
    return false;
  }

  if (error.code === "ECONNABORTED") {
    return true;
  }

  // axios sets `request` whenever a request was actually dispatched. Its
  // presence without a `response` means the request went out and no
  // response ever came back (network error, connection reset, etc) - a
  // non-axios error thrown elsewhere in the try block won't have it.
  return !!error.request;
}

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function withTransientRetry(requestFn, options) {
  var delayMs =
    options && typeof options.delayMs === "number"
      ? options.delayMs
      : DEFAULT_RETRY_DELAY_MS;

  return requestFn().catch(function (error) {
    if (!isTransientNetworkError(error)) {
      throw error;
    }

    return wait(delayMs).then(requestFn);
  });
}

export { withTransientRetry, isTransientNetworkError, DEFAULT_RETRY_DELAY_MS };
