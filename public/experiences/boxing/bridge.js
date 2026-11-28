(function (global) {
  'use strict';

  var ARENA_ID = 'boxing';
  var PROTOCOL_VERSION = 1;

  function detectParentOrigin() {
    try {
      if (document.referrer) {
        var u = new URL(document.referrer);
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          return u.origin;
        }
      }
    } catch (_) {
      // Ignore malformed referrer
    }
    try {
      if (global.location && (global.location.protocol === 'http:' || global.location.protocol === 'https:')) {
        return global.location.origin;
      }
    } catch (_) {
      // Ignore file:// origin
    }
    return null;
  }

  function createBridge() {
    var isEmbedded = false;
    try {
      isEmbedded = !!(global.parent && global.parent !== global);
    } catch (_) {
      isEmbedded = false;
    }

    var parentOrigin = detectParentOrigin();
    var handlers = {
      onInit: null,
      onContext: null,
      onPause: null,
      onDispose: null
    };
    var disposed = false;
    var readySent = false;

    function postToHost(type, extra) {
      if (!isEmbedded || disposed || !parentOrigin) return false;
      var message = {
        type: type,
        version: PROTOCOL_VERSION,
        arenaId: ARENA_ID
      };
      if (extra && typeof extra === 'object') {
        var keys = Object.keys(extra);
        for (var i = 0; i < keys.length; i++) {
          message[keys[i]] = extra[keys[i]];
        }
      }
      try {
        global.parent.postMessage(message, parentOrigin);
        return true;
      } catch (_) {
        return false;
      }
    }

    function onMessage(event) {
      if (!isEmbedded || disposed) return;
      if (event.source !== global.parent) return;

      var data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.version !== PROTOCOL_VERSION) return;
      if (data.arenaId && data.arenaId !== ARENA_ID) return;

      // Enforce strict parentOrigin once known; if referrer was stripped, bind on valid wudao:init
      if (parentOrigin) {
        if (event.origin !== parentOrigin) return;
      } else if (data.type === 'wudao:init' && event.origin && event.origin !== 'null') {
        parentOrigin = event.origin;
      } else if (!parentOrigin && event.origin !== 'null') {
        // Reject unexpected pre-init messages if origin is unknown
        return;
      }

      switch (data.type) {
        case 'wudao:init':
          if (typeof handlers.onInit === 'function') {
            handlers.onInit(data.payload || data);
          }
          break;
        case 'wudao:context':
          if (typeof handlers.onContext === 'function') {
            handlers.onContext(data.payload || data);
          }
          break;
        case 'wudao:pause':
          if (typeof handlers.onPause === 'function') {
            handlers.onPause(Boolean(data.paused !== undefined ? data.paused : (data.payload && data.payload.paused)));
          }
          break;
        case 'wudao:dispose':
          triggerDispose();
          break;
        default:
          break;
      }
    }

    function triggerDispose() {
      if (disposed) return;
      disposed = true;
      global.removeEventListener('message', onMessage);
      global.removeEventListener('pagehide', triggerDispose);
      if (typeof handlers.onDispose === 'function') {
        try {
          handlers.onDispose();
        } catch (_) {
          // Safe teardown
        }
      }
    }

    function init(opts) {
      if (opts && typeof opts === 'object') {
        handlers.onInit = opts.onInit || null;
        handlers.onContext = opts.onContext || null;
        handlers.onPause = opts.onPause || null;
        handlers.onDispose = opts.onDispose || null;
      }
      if (isEmbedded) {
        global.addEventListener('message', onMessage);
      }
      global.addEventListener('pagehide', triggerDispose);
      return isEmbedded;
    }

    function ready() {
      if (readySent) return;
      readySent = true;
      postToHost('wudao:ready', { ready: true });
    }

    function complete(result) {
      var payload = result && typeof result === 'object' ? result : {};
      postToHost('wudao:complete', {
        result: {
          score: typeof payload.score === 'number' ? payload.score : 0,
          completed: payload.completed !== false,
          summary: typeof payload.summary === 'string' ? payload.summary : String(payload.summary || '')
        }
      });
    }

    function exit() {
      if (!isEmbedded) return false;
      return postToHost('wudao:exit', {});
    }

    function error(message) {
      postToHost('wudao:error', {
        message: String(message || 'Unknown error')
      });
    }

    return {
      isEmbedded: function () { return isEmbedded; },
      init: init,
      ready: ready,
      complete: complete,
      exit: exit,
      error: error,
      dispose: triggerDispose
    };
  }

  global.WuDaoBridge = createBridge();
})(window);
