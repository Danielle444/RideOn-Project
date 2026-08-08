// תור הטוסטים של האפליקציה. אין כאן import של react/react-native, בדיוק
// כמו inFlightGuard.js - כדי שאפשר יהיה לבדוק את הלוגיקה ישירות ב-vitest
// וכדי שקוד מחוץ לעץ הקומפוננטות (services, utils) יוכל להציג טוסט באותה
// קלות של Alert.alert, בלי useContext. ToastHost.jsx הוא הצרכן היחיד של
// subscribeToasts/dismissToast; showToast הוא ה-API הציבורי לכל השאר.
//
// createToastQueue מאפשר מופע מבודד לבדיקות (ראו inFlightGuard.test.js);
// singletonQueue הוא המופע היחיד שה-UI בפועל מאזין לו.

var DEFAULT_DURATION_MS = 3000;

function createToastQueue() {
  var toasts = [];
  var listeners = [];
  var timers = {};
  var nextId = 1;

  function notify() {
    listeners.forEach(function (listener) {
      listener(toasts);
    });
  }

  function dismissToast(id) {
    if (timers[id]) {
      clearTimeout(timers[id]);
      delete timers[id];
    }

    var next = toasts.filter(function (toast) {
      return toast.id !== id;
    });

    if (next.length === toasts.length) {
      return;
    }

    toasts = next;
    notify();
  }

  function showToast(message, type, duration) {
    var id = nextId++;
    var resolvedDuration =
      typeof duration === "number" ? duration : DEFAULT_DURATION_MS;

    toasts = toasts.concat({
      id: id,
      message: message,
      type: type || "info",
      duration: resolvedDuration,
    });

    notify();

    timers[id] = setTimeout(function () {
      dismissToast(id);
    }, resolvedDuration);

    return id;
  }

  function subscribeToasts(listener) {
    listeners.push(listener);
    listener(toasts);

    return function unsubscribe() {
      listeners = listeners.filter(function (existing) {
        return existing !== listener;
      });
    };
  }

  function getToasts() {
    return toasts;
  }

  return {
    showToast: showToast,
    dismissToast: dismissToast,
    subscribeToasts: subscribeToasts,
    getToasts: getToasts,
  };
}

var singletonQueue = createToastQueue();

function showToast(message, type, duration) {
  return singletonQueue.showToast(message, type, duration);
}

function dismissToast(id) {
  singletonQueue.dismissToast(id);
}

function subscribeToasts(listener) {
  return singletonQueue.subscribeToasts(listener);
}

function getToasts() {
  return singletonQueue.getToasts();
}

export {
  createToastQueue,
  showToast,
  dismissToast,
  subscribeToasts,
  getToasts,
};
