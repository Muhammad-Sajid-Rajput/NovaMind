// NovaMind — ChatInput.jsx — File Upload Bug Fix

import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useStream } from "../hooks/useStream.js";
import { useVoiceInput } from "../hooks/useVoiceInput.js";
import { useChatContext } from "../context/ChatContext.jsx";
import { api, getAccessToken } from "../../../config/api.js";
import ModelSelector from "./ModelSelector.jsx";
import ErrorMessage from "../../../core/components/ui/ErrorMessage.jsx";
import FilePreview from "./FilePreview.jsx";

// ── Module-level constants ────────────────────────────────────────────────────
const UPLOAD_STORAGE_KEY = 'novamind_pending_upload';
const MAX_INGEST_RETRIES = 3;
const POLL_INTERVAL_MS   = 2000;
const POLL_TIMEOUT_MS    = 300_000; // 5 minutes

const formatCountdown = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

// ── localStorage helpers ──────────────────────────────────────────────────────
const saveUploadStorage = (data) => {
  try { localStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
};
const clearUploadStorage = () => {
  try { localStorage.removeItem(UPLOAD_STORAGE_KEY); } catch (_) {}
};

// ── Allowed file extensions ───────────────────────────────────────────────────
const ALLOWED_EXTS = [
  'jpg','jpeg','png','webp','gif',
  'pdf','docx','doc','xlsx','xls',
  'pptx','ppt','txt','csv',
];

// ─────────────────────────────────────────────────────────────────────────────

function ChatInput() {
  const {
    currentSessionId,
    setCurrentSessionId,
    sessionsList,
    setSessionsList,
    chatMessages,
    setChatMessages,
    selectedLanguage,
    contextLimit,
    selectedModel,
    setSelectedModel,
    setActiveModel,
    setModelStatus,
    setFallbackUsed,
    handleSessionNamed,
    editingMessageId,
    sessionDrafts,
    setSessionDrafts,
    isStreamEnabled
  } = useChatContext();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [inputText,       setInputText]       = useState("");
  const [isGlow,          setIsGlow]          = useState(false);
  const [uploadError,     setUploadError]     = useState("");
  const [isDragging,      setIsDragging]      = useState(false);

  // ── Multiple Files state ─────────────────────────────────────────────────────
  const [attachedFiles,   setAttachedFiles]   = useState([]);
  const [isCleaningUp,    setIsCleaningUp]    = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const fileInputRef           = useRef(null);
  const textareaRef            = useRef(null);
  const isSendingRef           = useRef(false);
  const upgradingSessionRef    = useRef(false);
  const prevSessionIdRef       = useRef(null); // guards session-change effect vs HMR
  const hasRestoredRef         = useRef(false); // localStorage restore runs once
  const dragCounterRef         = useRef(0);     // robust drag counter vs flicker

  // Dynamic references for multiple file tracking
  const abortControllersRef    = useRef({}); // { [fileId]: AbortController }
  const pollingIntervalsRef    = useRef({}); // { [fileId]: intervalId }
  const originalFilesMapRef    = useRef({}); // { [fileId]: File object }
  const tempMessageIdRef       = useRef(null);
  const attachedFilesRef       = useRef([]);

  const charCount = inputText.length;

  // ── useStream hook ──────────────────────────────────────────────────────────
  const {
    isLoading,
    isStreaming,
    countdown,
    sendMessage: sendStreamingMessage,
    stopGeneration
  } = useStream({
    sessionId: currentSessionId,
    setChatMessages,
    chatMessages,
    language: selectedLanguage,
    contextLimit,
    model: selectedModel,
    setSelectedModel,
    setActiveModel,
    setModelStatus,
    setFallbackUsed,
    onSessionNamed: handleSessionNamed,
    editingMessageId,
    sessionsList,
    setSessionsList,
    setCurrentSessionId,
    isStreamEnabled
  });

  const handleTranscript = useCallback((transcript) => {
    setInputText((prev) => prev + (prev ? " " : "") + transcript);
  }, []);

  const { isRecording, hasVoiceSupport, toggleRecording } = useVoiceInput(handleTranscript);

  // Atomic state + storage updater helper to prevent React batching/closure lags
  const updateFileStateAndStorage = (id, updates) => {
    setAttachedFiles(prev => {
      const next = prev.map(f => f.id === id ? { ...f, ...updates } : f);
      if (next.length === 0) {
        clearUploadStorage();
      } else {
        saveUploadStorage({
          sessionId: currentSessionId,
          attachedFiles: next.map(f => ({
            id: f.id,
            name: f.name,
            type: f.type,
            size: f.size,
            previewUrl: f.previewUrl,
            uploadState: f.uploadState,
            progress: f.progress,
            error: f.error,
            ingestJobId: f.ingestJobId,
            ingestJobData: f.ingestJobData,
            ingestRetryCount: f.ingestRetryCount,
            uploadedData: f.uploadedData,
          })),
          messageId: tempMessageIdRef.current,
        });
      }
      return next;
    });
  };

  // ── Shared reset ────────────────────────────────────────────────────────────
  const _resetUploadState = () => {
    // Abort all in-progress uploads
    Object.keys(abortControllersRef.current).forEach(id => {
      abortControllersRef.current[id].abort();
    });
    abortControllersRef.current = {};

    // Clear all polling intervals
    Object.keys(pollingIntervalsRef.current).forEach(id => {
      clearInterval(pollingIntervalsRef.current[id]);
    });
    pollingIntervalsRef.current = {};

    // Revoke preview object URLs
    attachedFiles.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });

    setAttachedFiles([]);
    setUploadError('');
    tempMessageIdRef.current = null;
    originalFilesMapRef.current = {};
    dragCounterRef.current = 0;
    setIsDragging(false);
  };

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Reset sending guard when streaming stops
  useEffect(() => {
    if (!isLoading && !isStreaming) isSendingRef.current = false;
  }, [isLoading, isStreaming]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      attachedFiles.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, []);

  // Reset file card when the user switches to a DIFFERENT session.
  // Guards: (1) initial mount, (2) HMR re-run (same ID), (3) RAG upgrade flag.
  useEffect(() => {
    const prev = prevSessionIdRef.current;
    prevSessionIdRef.current = currentSessionId;
    if (prev === null)             return; // initial mount
    if (prev === currentSessionId) return; // HMR re-run — value unchanged
    if (upgradingSessionRef.current) {
      upgradingSessionRef.current = false;
      return;                              // intentional session upgrade
    }
    handleRemoveAllFiles();
  }, [currentSessionId]);

  // Sync attachedFilesRef with state
  useEffect(() => {
    attachedFilesRef.current = attachedFiles;
  }, [attachedFiles]);

  // Clean up and discard any persisted pending uploads on mount / page load
  useEffect(() => {
    if (!currentSessionId || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    let stored;
    try {
      const raw = localStorage.getItem(UPLOAD_STORAGE_KEY);
      if (!raw) return;
      stored = JSON.parse(raw);
    } catch (_) {
      clearUploadStorage();
      return;
    }

    if (stored.sessionId !== currentSessionId) {
      clearUploadStorage();
    } else if (Array.isArray(stored.attachedFiles) && stored.attachedFiles.length > 0) {
      // Discard files, trigger cancellation on backend, and clear local storage
      setIsCleaningUp(true);
      const cleanups = stored.attachedFiles.map(async (f) => {
        if (f.uploadedData && f.uploadedData.publicId) {
          try {
            await api.upload.cancel({
              publicId:     f.uploadedData.publicId,
              resourceType: f.uploadedData.resourceType,
              messageId:    stored.messageId || null,
            });
          } catch (err) {
            console.error('Failed to clean up pending file on mount:', err);
          }
        }
      });

      Promise.all(cleanups).finally(() => {
        setIsCleaningUp(false);
        clearUploadStorage();
      });
    }
  }, [currentSessionId]);

  // Handle tab close / refresh cleanup for currently attached files
  useEffect(() => {
    const handleUnloadCleanup = () => {
      const filesToCancel = attachedFilesRef.current
        .map(f => f.uploadedData)
        .filter(Boolean)
        .filter(data => data.publicId);

      if (filesToCancel.length === 0) return;

      filesToCancel.forEach(file => {
        try {
          api.upload.cancelKeepalive({
            publicId:     file.publicId,
            resourceType: file.resourceType,
            messageId:    tempMessageIdRef.current || null,
          });
        } catch (err) {
          console.error('Failed to dispatch keepalive cancel request:', err);
        }
      });

      clearUploadStorage();
    };

    window.addEventListener('pagehide', handleUnloadCleanup);

    return () => {
      window.removeEventListener('pagehide', handleUnloadCleanup);
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = "auto";
    const sh = el.scrollHeight;
    el.style.height       = `${Math.max(42, Math.min(sh, 200))}px`;
    el.style.overflowY    = sh > 200 ? "auto" : "hidden";
  }, [inputText]);

  // Load draft when switching sessions
  useEffect(() => {
    setInputText(sessionDrafts[currentSessionId] || "");
  }, [currentSessionId]);

  // Debounce-save draft as user types
  useEffect(() => {
    if (!currentSessionId) return;
    const timer = setTimeout(() => {
      setSessionDrafts((prev) => {
        if (prev[currentSessionId] === inputText) return prev;
        return { ...prev, [currentSessionId]: inputText };
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [inputText, currentSessionId, setSessionDrafts]);

  // Global custom event listeners
  useEffect(() => {
    const handleEdit = (e) => {
      setInputText(e.detail.text);
      textareaRef.current?.focus();
    };

    const handleAutoSend = (e) => {
      if (isLoading || isStreaming || isSendingRef.current) return;
      isSendingRef.current = true;
      sendStreamingMessage({
        message:      e.detail.text,
        file:         e.detail.file || null,
        files:        e.detail.files || [],
        isRagSession: e.detail.isRagSession !== undefined ? e.detail.isRagSession : true,
        skipAppend:   e.detail.skipAppend,
      });
    };

    const handleInsertTemplate = (e) => {
      setInputText(e.detail.text);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
          textareaRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 0);
      setIsGlow(true);
      setTimeout(() => setIsGlow(false), 1000);
    };

    window.addEventListener("edit-chat-message",    handleEdit);
    window.addEventListener("auto-send-chat-message",handleAutoSend);
    window.addEventListener("insert-chat-template", handleInsertTemplate);
    return () => {
      window.removeEventListener("edit-chat-message",    handleEdit);
      window.removeEventListener("auto-send-chat-message",handleAutoSend);
      window.removeEventListener("insert-chat-template", handleInsertTemplate);
    };
  }, [sendStreamingMessage, isLoading, isStreaming]);

  // ── Unified File processing and upload initiation ───────────────────────────
  const addAndUploadFile = async (file) => {
    let currentLength = 0;
    setAttachedFiles(prev => {
      currentLength = prev.length;
      return prev;
    });

    if (currentLength >= 2) {
      setUploadError('You can only upload up to 2 files per message.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File is too large. Maximum size is 10 MB.');
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setUploadError(
        `"${ext}" files are not supported. Allowed: images, PDF, Word, Excel, PowerPoint, TXT, CSV`
      );
      return;
    }

    setUploadError('');

    const newId = `${file.name}-${file.size}-${Date.now()}`;
    const newFileEntry = {
      id: newId,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size || 0,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      uploadState: 'selected',
      uploadedData: null,
      progress: 0,
      error: '',
      ingestJobId: null,
      ingestJobData: null,
      ingestRetryCount: 0,
    };

    originalFilesMapRef.current[newId] = file;
    
    // Atomically write new entry to state and storage
    setAttachedFiles(prev => {
      const next = [...prev, newFileEntry];
      saveUploadStorage({
        sessionId: currentSessionId,
        attachedFiles: next,
        messageId: tempMessageIdRef.current,
      });
      return next;
    });

    if (!tempMessageIdRef.current) {
      tempMessageIdRef.current = `msg-${crypto.randomUUID()}`;
    }

    await uploadSingleFile(file, newId);
  };

  // ── File Selection via Click ─────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;
    await addAndUploadFile(file);
  };

  // ── Drag & Drop Handlers ─────────────────────────────────────────────────────
  const handleWindowDragEnter = useCallback((e) => {
    e.preventDefault();
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      dragCounterRef.current += 1;
      setIsDragging(true);
    }
  }, []);

  const handleWindowDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleWindowDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleWindowDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    let currentLength = 0;
    setAttachedFiles(prev => {
      currentLength = prev.length;
      return prev;
    });

    const allowedSlots = 2 - currentLength;
    if (allowedSlots <= 0) {
      setUploadError('You can only upload up to 2 files per message.');
      return;
    }

    const filesToUpload = files.slice(0, allowedSlots);
    if (files.length > allowedSlots) {
      setUploadError('You can only upload up to 2 files per message. Extra files were ignored.');
    }

    for (const file of filesToUpload) {
      await addAndUploadFile(file);
    }
  }, [addAndUploadFile]);

  useEffect(() => {
    window.addEventListener("dragenter", handleWindowDragEnter);
    window.addEventListener("dragover",  handleWindowDragOver);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("drop",      handleWindowDrop);

    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter);
      window.removeEventListener("dragover",  handleWindowDragOver);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("drop",      handleWindowDrop);
    };
  }, [handleWindowDragEnter, handleWindowDragOver, handleWindowDragLeave, handleWindowDrop]);

  // ── Upload a single file to Cloudinary + queue BullMQ Ingest ─────────────────
  const uploadSingleFile = async (file, id) => {
    const abortCtrl = new AbortController();
    abortControllersRef.current[id] = abortCtrl;

    updateFileStateAndStorage(id, { uploadState: 'uploading', progress: 10, error: '' });

    try {
      const isImage = file.type.startsWith('image/');
      const resType = isImage ? 'image' : 'raw';
      const sigData = await api.upload.getSignature();
      if (abortCtrl.signal.aborted) return;

      const formData = new FormData();
      formData.append('file',      file);
      formData.append('api_key',   sigData.apiKey);
      formData.append('timestamp', sigData.timestamp);
      formData.append('signature', sigData.signature);
      formData.append('folder',    sigData.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sigData.cloudName}/${resType}/upload`,
        { method: 'POST', body: formData, signal: abortCtrl.signal }
      );
      if (!uploadRes.ok) {
        const errBody = await uploadRes.json().catch(() => ({}));
        throw new Error(errBody.error?.message || 'CDN upload failed');
      }

      const data = await uploadRes.json();
      if (abortCtrl.signal.aborted) return;

      const uploadedInfo = {
        url:          data.secure_url,
        publicId:     data.public_id,
        resourceType: data.resource_type || resType,
        format:       data.format || file.name.split('.').pop().toLowerCase(),
        bytes:        data.bytes || file.size,
        width:        data.width,
        height:       data.height,
        originalName: file.name,
        mimeType:     file.type || 'application/octet-stream',
      };

      updateFileStateAndStorage(id, { uploadedData: uploadedInfo });

      if (isImage) {
        updateFileStateAndStorage(id, { uploadState: 'done', progress: 100 });
        return;
      }

      // ── Document: queue RAG ingest ─────────────────────────────────────────
      const ingestData = {
        fileUrl:  uploadedInfo.url,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        publicId: uploadedInfo.publicId,
        fileSize: uploadedInfo.bytes,
      };

      const ingestRes = await api.upload.ingest({
        ...ingestData,
        sessionId: currentSessionId,
        messageId: tempMessageIdRef.current,
      });

      updateFileStateAndStorage(id, {
        ingestJobId: ingestRes.jobId,
        ingestJobData: ingestData,
      });

      startSingleIngestPolling(ingestRes.jobId, id);

    } catch (err) {
      if (err.name === 'AbortError') return;
      updateFileStateAndStorage(id, {
        uploadState: 'failed',
        error: err.message || 'Upload failed.',
        progress: 0
      });
      setUploadError(err.message || 'Upload failed.');
    }
  };

  // ── Poll a single BullMQ ingest job ─────────────────────────────────────────
  const startSingleIngestPolling = (jobId, id) => {
    let consecutiveErrors = 0;
    let localLastSeenProgress = 0;

    const markDone = () => {
      clearInterval(poll);
      delete pollingIntervalsRef.current[id];
      updateFileStateAndStorage(id, { uploadState: 'done', progress: 100 });
    };

    const poll = setInterval(async () => {
      try {
        const status = await api.upload.getIngestStatus(jobId);
        consecutiveErrors = 0;

        const progress = status.progress || 0;
        updateFileStateAndStorage(id, { progress });
        if (progress > localLastSeenProgress) localLastSeenProgress = progress;

        if (status.status === 'completed') {
          markDone();
        } else if (status.status === 'failed') {
          clearInterval(poll);
          delete pollingIntervalsRef.current[id];
          retrySingleIngest(id, `Ingest job failed: ${status.error || 'Unknown error'}`);
        }
      } catch (err) {
        // 404 after seeing progress = BullMQ cleaned up a completed job
        const isGone =
          err?.status === 404 ||
          err?.message?.includes('404') ||
          err?.message?.includes('not found');

        if (isGone && localLastSeenProgress > 0) { markDone(); return; }

        consecutiveErrors++;
        console.warn(`Transient polling error for ${id} (${consecutiveErrors}/5):`, err.message);
        if (consecutiveErrors >= 5) {
          clearInterval(poll);
          delete pollingIntervalsRef.current[id];
          retrySingleIngest(id, 'Connection lost while tracking ingest progress.');
        }
      }
    }, POLL_INTERVAL_MS);

    pollingIntervalsRef.current[id] = poll;

    // Hard 5-minute timeout
    setTimeout(() => {
      if (pollingIntervalsRef.current[id] === poll) {
        clearInterval(poll);
        delete pollingIntervalsRef.current[id];
        retrySingleIngest(id, 'Ingest timed out.');
      }
    }, POLL_TIMEOUT_MS);
  };

  // ── Auto-retry ingest (no Cloudinary re-upload) ──────────────────────────────
  const retrySingleIngest = async (id, reason = '') => {
    let currentItem;
    setAttachedFiles(prev => {
      currentItem = prev.find(f => f.id === id);
      return prev;
    });

    if (!currentItem || !currentItem.ingestJobData) return;

    if (currentItem.ingestRetryCount >= MAX_INGEST_RETRIES) {
      console.warn(`[retrySingleIngest] giving up after ${MAX_INGEST_RETRIES} retries. Reason: ${reason}`);
      updateFileStateAndStorage(id, {
        uploadState: 'failed',
        error: `Processing failed after ${MAX_INGEST_RETRIES} attempts.`,
        progress: 0,
      });
      return;
    }

    const nextRetryCount = currentItem.ingestRetryCount + 1;
    updateFileStateAndStorage(id, {
      uploadState: 'retrying',
      ingestRetryCount: nextRetryCount,
      progress: 0,
      error: '',
    });

    // Exponential back-off: 2s, 4s, 6s
    await new Promise(r => setTimeout(r, 2000 * nextRetryCount));

    try {
      const ingestRes = await api.upload.ingest({
        ...currentItem.ingestJobData,
        sessionId: currentSessionId,
        messageId: tempMessageIdRef.current,
      });

      updateFileStateAndStorage(id, { ingestJobId: ingestRes.jobId });
      startSingleIngestPolling(ingestRes.jobId, id);
    } catch (err) {
      console.error('[retrySingleIngest] re-queue failed:', err.message);
      retrySingleIngest(id, `Re-queue request failed: ${err.message}`);
    }
  };

  // ── Remove a single file (X button) ──────────────────────────────────────────
  const handleRemoveSingleFile = async (id) => {
    if (abortControllersRef.current[id]) {
      abortControllersRef.current[id].abort();
      delete abortControllersRef.current[id];
    }
    if (pollingIntervalsRef.current[id]) {
      clearInterval(pollingIntervalsRef.current[id]);
      delete pollingIntervalsRef.current[id];
    }

    let fileToDelete = null;
    setAttachedFiles(prev => {
      const item = prev.find(f => f.id === id);
      if (item) {
        fileToDelete = item.uploadedData;
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      const remaining = prev.filter(f => f.id !== id);
      if (remaining.length === 0) {
        tempMessageIdRef.current = null;
        clearUploadStorage();
      } else {
        saveUploadStorage({
          sessionId: currentSessionId,
          attachedFiles: remaining,
          messageId: tempMessageIdRef.current,
        });
      }
      return remaining;
    });

    delete originalFilesMapRef.current[id];

    if (fileToDelete) {
      try {
        await api.upload.cancel({
          publicId:     fileToDelete.publicId,
          resourceType: fileToDelete.resourceType,
          messageId:    tempMessageIdRef.current,
        });
      } catch (err) {
        console.error('Failed to cancel/delete file on server:', err);
      }
    }
  };

  // ── Remove all files (clean up sessions switch) ─────────────────────────────
  const handleRemoveAllFiles = async () => {
    let filesToDelete = [];
    setAttachedFiles(prev => {
      filesToDelete = prev.map(f => f.uploadedData).filter(Boolean);
      return prev;
    });

    _resetUploadState();
    clearUploadStorage();

    for (const fileToDelete of filesToDelete) {
      try {
        await api.upload.cancel({
          publicId:     fileToDelete.publicId,
          resourceType: fileToDelete.resourceType,
          messageId:    null, // general session sweep
        });
      } catch (err) {
        console.error('Failed to sweep file on server:', err);
      }
    }
  };

  // ── Retry manual (user clicks failed card) ──────────────────────────────────
  const handleRetrySingleUpload = (id) => {
    let currentItem;
    setAttachedFiles(prev => {
      currentItem = prev.find(f => f.id === id);
      return prev;
    });
    if (!currentItem) return;

    if (currentItem.ingestJobData) {
      updateFileStateAndStorage(id, { ingestRetryCount: 0 });
      retrySingleIngest(id, 'Manual retry by user');
    } else {
      const originalFileObj = originalFilesMapRef.current[id];
      if (originalFileObj) {
        uploadSingleFile(originalFileObj, id);
      }
    }
  };

  // ── Clear after Send ─────────────────────────────────────────────────────────
  const clearFileAfterSend = () => {
    _resetUploadState();
    clearUploadStorage();
  };

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!canSend) return;

    const uploadedList = attachedFiles.map(f => f.uploadedData).filter(Boolean);
    const fileAttachment = uploadedList[0] || null;
    const filesArray = uploadedList;

    const messageText =
      inputText.trim() ||
      (fileAttachment
        ? fileAttachment.mimeType.startsWith('image/')
          ? 'Analyze this image and tell me what is in it.'
          : 'Analyze this document and tell me about it.'
        : '');

    setInputText('');
    clearFileAfterSend();
    isSendingRef.current = true;

    try {
      await sendStreamingMessage({
        message:      messageText,
        file:         fileAttachment, // backward compatibility
        files:        filesArray,     // multiple attachments
        isRagSession: !!(filesArray.some(f => !f.mimeType.startsWith('image/'))),
      });
    } catch (err) {
      console.error("[ChatInput] Failed to send message:", err.message);
      setInputText(messageText);

      // Restore files back into input area on failure
      if (filesArray.length > 0) {
        setAttachedFiles(prev => {
          const next = filesArray.map((f, i) => ({
            id: `restored-${i}-${Date.now()}`,
            name: f.originalName,
            type: f.mimeType,
            size: f.bytes,
            uploadState: 'done',
            progress: 100,
            uploadedData: f,
          }));
          saveUploadStorage({
            sessionId: currentSessionId,
            attachedFiles: next,
            messageId: tempMessageIdRef.current,
          });
          return next;
        });
      }
      isSendingRef.current = false;
    }
  };

  const isAnyFileProcessing = attachedFiles.some(f => f.uploadState === 'uploading' || f.uploadState === 'retrying');

  const canSend =
    (inputText.trim().length > 0 || attachedFiles.some(f => f.uploadState === 'done')) &&
    !isStreaming &&
    !isAnyFileProcessing &&
    !isCleaningUp;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="chat-input-area px-4 py-2 bg-background md:max-w-190 lg:max-w-200 xl:max-w-210 w-full mx-auto flex flex-col z-30 select-none pb-0">
      {countdown > 0 && (
        <div className="border p-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 mb-3 animate-pulse bg-error/10 border-error/20 text-error" role="alert">
          <Icon icon="material-symbols:hourglass-bottom-rounded" className="text-lg" />
          <span>Please wait {formatCountdown(countdown)} before sending again</span>
        </div>
      )}

      {uploadError && !isAnyFileProcessing && (
        <div style={{ padding: '0 0 8px 0' }}>
          <ErrorMessage message={uploadError} onDismiss={() => setUploadError('')} fullWidth />
        </div>
      )}

      {/* Input wrapper */}
      <div
        className={`chat-input-wrapper ${isGlow ? "is-glowing" : ""} ${isDragging ? "is-dragging" : ""} ${charCount > 8000 ? "has-error" : ""}`}
        style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)" }}
      >
        {/* File previews list */}
        {attachedFiles.length > 0 && (
          <div style={{ padding: '10px 12px 0', display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
            {attachedFiles.map(f => (
              <FilePreview
                key={f.id}
                file={{ name: f.name, type: f.type, size: f.size }}
                previewUrl={f.previewUrl}
                uploadState={f.uploadState}
                onRemove={() => handleRemoveSingleFile(f.id)}
                onRetry={() => handleRetrySingleUpload(f.id)}
                progress={f.progress}
              />
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="chat-textarea w-full bg-transparent border-none text-text-primary text-base sm:text-[15px] font-sans outline-none resize-none leading-relaxed p-2.5 pb-1.5 scrollbar-thin select-text placeholder:text-text-muted"
          placeholder={
            editingMessageId !== null ? "Editing a message above..." :
            isRecording             ? "Listening to voice input..."  :
                                      "Message NovaMind..."
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            else if (e.key === "Escape")          { setInputText(""); }
          }}
          disabled={(isLoading && !isStreaming) || editingMessageId !== null}
          rows={1}
          style={{ padding: attachedFiles.length > 0 ? '8px 12px 10px' : '12px 12px' }}
          aria-label="Chat Message Input"
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-1">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.csv"
              onChange={handleFileSelect}
              aria-label="Upload Files"
            />
            <button
              className="w-9 h-9 flex items-center justify-center bg-transparent border-none text-text-secondary hover:text-primary hover:bg-surface-hover cursor-pointer rounded-lg text-xl"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || editingMessageId !== null || attachedFiles.length >= 2 || isCleaningUp}
              title={isCleaningUp ? "Cleaning up previous session..." : attachedFiles.length >= 2 ? "Maximum 2 files uploaded" : "Upload Attachment (Images, Documents)"}
            >
              <Icon icon="material-symbols:attach-file" />
            </button>
            {hasVoiceSupport && (
              <button
                className={`w-9 h-9 flex items-center justify-center bg-transparent border-none text-text-secondary hover:text-primary hover:bg-surface-hover cursor-pointer rounded-lg text-xl ${isRecording ? "text-error animate-pulse" : ""} ${editingMessageId !== null ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={toggleRecording}
                disabled={editingMessageId !== null}
                title={isRecording ? "Stop voice input" : "Voice dictation"}
              >
                <Icon icon={isRecording ? "material-symbols:mic-outline" : "material-symbols:mic-off-outline"} />
              </button>
            )}
            {isRecording && <span className="text-xs text-error font-bold flex items-center gap-1.5 animate-pulse ml-1">Listening...</span>}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:block"><ModelSelector compact={false} dropdownPosition="up" /></div>
            <div className="lg:hidden"><ModelSelector compact={true}  dropdownPosition="up" /></div>
            {charCount > 7000 && (
              <span className={`text-xs font-semibold ${charCount > 8000 ? "text-error" : "text-warning"}`} role="status">
                {charCount}/8000
              </span>
            )}
            {isStreaming ? (
              <button
                className="w-9 h-9 flex items-center justify-center bg-error hover:bg-error/90 text-white border-none rounded-full cursor-pointer text-lg active:scale-95 shadow-xs"
                onClick={stopGeneration}
                title="Stop generation"
              >
                <Icon icon="material-symbols:stop" />
              </button>
            ) : (
              <button
                className={`w-9 h-9 flex items-center justify-center border-none rounded-full cursor-pointer text-lg active:scale-95 shadow-xs ${canSend ? "bg-primary text-white hover:bg-primary-hover" : "bg-surface-hover text-text-muted cursor-not-allowed"}`}
                onClick={handleSend}
                disabled={!canSend}
                title="Send message"
              >
                <Icon icon="material-symbols:arrow-upward" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isDragging && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs pointer-events-none transition-all duration-300 animate-in fade-in"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="w-[calc(100%-2rem)] max-w-lg p-12 border-2 border-dashed border-primary/50 bg-background/90 rounded-2xl flex flex-col items-center justify-center gap-4 text-center shadow-2xl scale-95 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl animate-bounce">
              <Icon icon="material-symbols:cloud-upload-outline" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-text-primary">
                Drop files to upload
              </h3>
              <p className="text-sm text-text-muted">
                Attach images or documents directly to this chat session
              </p>
            </div>
            <span className="text-xs text-text-muted bg-surface px-3 py-1.5 rounded-full border border-border">
              Up to 2 files per message • Max 10MB each
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatInput;
