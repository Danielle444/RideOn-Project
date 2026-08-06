// Synchronous, key-scoped in-flight guard for async handlers triggered from
// UI events (e.g. a double-tapped cancel button). React state alone
// (setSomeBusyFlag) is not a correctness guard: state updates are
// asynchronous, so two rapid invocations of the same handler can both pass a
// "busy?" check before either render reflects the first one. This module has
// no react/react-native import so it is safe to hold in a useRef and to unit
// test directly.

function createInFlightGuard() {
  var active = new Set();

  function tryAcquire(key) {
    if (active.has(key)) {
      return false;
    }
    active.add(key);
    return true;
  }

  function release(key) {
    active.delete(key);
  }

  return { tryAcquire: tryAcquire, release: release };
}

export { createInFlightGuard };
