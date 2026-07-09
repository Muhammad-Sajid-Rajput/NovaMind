// NovaMind — api.js — Phase 5
// Central API client. All existing feature hooks (useSessions, useMessages, etc.) import from here.
//
// Phase 1 changes:
//   - Token is no longer read from localStorage. It is set via setAccessToken() from AuthContext.
//   - 401 interceptor: silently refreshes the accessToken and retries the original request.
//   - Queue mechanism: concurrent 401s all wait for one refresh, not many parallel refresh calls.
//   - credentials: "include" added to every request so the httpOnly refreshToken cookie is sent.

const BASE = import.meta.env.VITE_API_URL || "";

// ─── Module-level token store (in memory, never localStorage) ─────────────────
let _accessToken  = null;
let _isRefreshing = false;
let _failedQueue  = []; // requests waiting for a refresh to complete

const processQueue = (error, token = null) => {
  _failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else       resolve(token);
  });
  _failedQueue = [];
};

// Called from AuthContext after login / silent refresh / logout
export const setAccessToken = (token) => { _accessToken = token; };
export const getAccessToken = () => _accessToken;

// ─── Auth headers from memory token ──────────────────────────────────────────
const getAuthHeaders = () =>
  _accessToken ? { Authorization: `Bearer ${_accessToken}` } : {};

// ─── Core fetch with 401 interceptor ─────────────────────────────────────────
const fetchWithRefresh = async (url, options = {}) => {
  const makeRequest = (token) =>
    fetch(`${BASE}${url}`, {
      ...options,
      credentials: "include", // sends httpOnly refreshToken cookie
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let response;
  try {
    response = await makeRequest(_accessToken);
  } catch (err) {
    if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
    throw err;
  }

  // ── 401 interceptor ─────────────────────────────────────────────────────────
  if (response.status === 401 && !url.includes("/auth/refresh")) {
    if (_isRefreshing) {
      // Another refresh is already in flight — queue this request
      return new Promise((resolve, reject) => {
        _failedQueue.push({ resolve, reject });
      }).then((newToken) => makeRequest(newToken).catch((e) => {
        if (e.name === 'TypeError' && e.message.toLowerCase().includes('fetch')) {
          throw new Error('Unable to connect to server. Please check your internet connection.');
        }
        throw e;
      }));
    }

    _isRefreshing = true;

    let refreshSuccessful = false;
    try {
      const refreshRes = await fetch(`${BASE}/auth/refresh`, {
        method:      "POST",
        credentials: "include",
      });

      if (!refreshRes.ok) throw new Error("Refresh failed");

      const data    = await refreshRes.json();
      _accessToken  = data.accessToken;
      _isRefreshing = false;
      refreshSuccessful = true;
      processQueue(null, _accessToken);
    } catch (err) {
      _isRefreshing = false;
      processQueue(err, null);
      // Tell AuthContext to clear user state and redirect to login
      window.dispatchEvent(new CustomEvent("auth:logout", { detail: "session_expired" }));
      if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      throw err;
    }

    if (refreshSuccessful) {
      try {
        return await makeRequest(_accessToken);
      } catch (err) {
        if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
          throw new Error('Unable to connect to server. Please check your internet connection.');
        }
        throw err;
      }
    }
  }

  return response;
};

// ─── Response handler ─────────────────────────────────────────────────────────
const handleResponse = async (response) => {
  if (!response.ok) {
    const data  = await response.json().catch(() => ({}));
    const error = new Error(data.error || "API request failed");
    error.status = response.status;
    error.data   = data;
    throw error;
  }
  return response.json();
};

// ─── HTTP method helpers ──────────────────────────────────────────────────────
const get = async (url, params) => {
  let targetUrl = url;
  if (params) {
    const qStr = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null)
    ).toString();
    if (qStr) targetUrl = `${url}?${qStr}`;
  }
  const res = await fetchWithRefresh(targetUrl, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(res);
};

const post = async (url, body = {}, options = {}) => {
  const res = await fetchWithRefresh(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body:    JSON.stringify(body),
    ...options,
  });
  return handleResponse(res);
};

const postForm = async (url, formData, signal) => {
  const res = await fetchWithRefresh(url, {
    method:  "POST",
    headers: { ...getAuthHeaders() }, // no Content-Type — browser sets multipart boundary
    body:    formData,
    signal,
  });
  return handleResponse(res);
};

const put = async (url, body = {}) => {
  const res = await fetchWithRefresh(url, {
    method:  "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body:    JSON.stringify(body),
  });
  return handleResponse(res);
};

const patch = async (url, body = {}) => {
  const res = await fetchWithRefresh(url, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body:    JSON.stringify(body),
  });
  return handleResponse(res);
};

const del = async (url, body) => {
  const res = await fetchWithRefresh(url, {
    method:  "DELETE",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return handleResponse(res);
};

// ─── Public API surface (unchanged shape — all hooks keep working) ─────────────
export const api = {
  chat: {
    send:   (body)         => post("/chat", body),
    stream: (body, signal) => fetchWithRefresh("/chat/stream", {
      method:  "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body:    JSON.stringify(body),
      signal,
    }),
    vision: (body, signal) => post("/chat/vision", body, { signal }),
    search: (q)            => get(`/chat/search?q=${encodeURIComponent(q)}`),
  },
  upload: {
    getSignature:    (params) => get("/upload/signature", params),
    ingest:          (body)  => post("/upload/ingest", body),
    getIngestStatus: (jobId) => get(`/upload/ingest/${jobId}`),
    cancel:          (body)  => post("/upload/cancel", body),
    cancelKeepalive: (body)  => {
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      };
      return fetch(`${BASE}/upload/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        keepalive: true,
      }).catch((e) => console.error('cancelKeepalive failed:', e));
    },
  },
  sessions: {
    list:   ()           => get("/sessions"),
    create: (body)       => post("/sessions", body),
    rename: (id, name)   => put(`/sessions/${id}`, { name }),
    delete: (id)         => del(`/sessions/${id}`),
    clearAll: ()         => del("/sessions"),
  },
  messages: {
    get:      (sessionId)            => get(`/messages?sessionId=${sessionId}`),
    clear:    (sessionId)            => del(`/messages?sessionId=${sessionId}`),
    truncate: (sessionId, fromIndex) => del("/messages/truncate", { sessionId, fromIndex }),
  },
  auth: {
    changePassword: (currentPassword, newPassword) =>
      patch("/auth/change-password", { currentPassword, newPassword }),
    deleteAccount:  (password) =>
      del("/auth/account", { password }),
    updateProfile:  (name) =>
      patch("/auth/profile", { name }),
  },
  memory: {
    list:      ()   => get("/memory"),
    deleteOne: (id) => del(`/memory/${id}`),
    deleteAll: ()   => del("/memory"),
  },
  utils: {
    password: (length) => post("/password", { length }),
    status:   ()       => get("/status"),
  },
};
