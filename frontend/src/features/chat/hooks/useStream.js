// NovaMind — useStream.js — Media Upload

import { useState, useRef, useEffect } from "react";
import { api } from "../../../config/api.js";

const PASSWORD_COMMAND = "give me a unique key or password";

export function useStream({
  sessionId,
  setChatMessages,
  language,
  contextLimit,
  model,
  setSelectedModel,
  setActiveModel,
  setModelStatus,
  setFallbackUsed,
  onSessionNamed,
  editingMessageId,
  chatMessages,
  sessionsList,
  setSessionsList,
  setCurrentSessionId,
  isStreamEnabled
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const abortControllerRef = useRef(null);
  const chunkBufferRef = useRef("");
  const timerRef = useRef(null);

  // Cleanup throttled timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Rate Limiting Countdown Interval Timer
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const stopGeneration = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    chunkBufferRef.current = "";
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  // Abort stream if editing begins
  useEffect(() => {
    if (editingMessageId !== null && isStreaming) {
      stopGeneration();
    }
  }, [editingMessageId, isStreaming]);

  // ── Send Message Handler ───────────────────────────
  const sendMessage = async ({ message: inputText, file = null, files = [], isRagSession = false, skipAppend = false, parentMessageId = null }) => {
    const trimmedInput = inputText ? inputText.trim() : "";
    if ((!trimmedInput && !file && (!files || files.length === 0)) || isLoading || countdown > 0) return;

    let activeSessionId = sessionId;
    setIsLoading(true);

    // ── Background re-sync helper ─────────────────────────────────────────────
    // After every AI response, replace local optimistic state with the
    // authoritative active path from the server so that parentMessageId,
    // versionInfo, and _id are always correct — never stale from optimistic
    // renders. Fire-and-forget: never blocks the UI or shows a loading state.
    const resyncFromServer = (sid) => {
      api.messages.get(sid).then((data) => {
        if (data && data.messages) {
          setChatMessages((prev) => ({
            ...prev,
            [sid]: data.messages.map((m) => ({ ...m, id: m.id || String(m._id) }))
          }));
        }
      }).catch(() => { /* non-fatal, ignore */ });
    };
    // ──────────────────────────────────────────────────────────────

    const getTime = () => {
      return new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hourCycle: "h12"
      });
    };
    const time = getTime();

    const isImage = !!(file && file.mimeType?.startsWith("image/"));

    const userMessageObj = {
      message: trimmedInput,
      sender: "user",
      id: crypto.randomUUID(),
      time,
      image: isImage ? file.url : null,
      file: !isImage && file ? file : null,
      files: files
    };

    const loadingId = crypto.randomUUID();
    const loadingMessageObj = {
      message: "__LOADING__",
      sender: "robot",
      id: loadingId,
      time
    };

    const currentMsgs = chatMessages[activeSessionId] || chatMessages[sessionId] || [];
    let historyToSend = currentMsgs;
    if (skipAppend) {
      let lastUserIndex = -1;
      for (let i = currentMsgs.length - 1; i >= 0; i--) {
        if (currentMsgs[i].sender === "user") {
          lastUserIndex = i;
          break;
        }
      }
      if (lastUserIndex !== -1) {
        historyToSend = currentMsgs.slice(0, lastUserIndex);
      }
    }

    // ⚡ INSTANT OPTIMISTIC RENDERING (0ms) ⚡
    setChatMessages((prev) => {
      const msgs = prev[activeSessionId] || [];
      const newMsgs = skipAppend ? msgs : [...msgs, userMessageObj];
      return {
        ...prev,
        [activeSessionId]: [...newMsgs, loadingMessageObj]
      };
    });

    // Async non-blocking session creation
    const isLocal = !sessionsList.some((s) => s.id === sessionId);
    if (isLocal) {
      api.sessions.create({ sessionId: activeSessionId }).then((data) => {
        const createdId = data.sessionId || activeSessionId;
        const newSession = {
          id: createdId,
          name: "New Chat",
          createdAt: new Date().toISOString()
        };
        setSessionsList((prev) => {
          if (prev.some((s) => s.id === createdId)) return prev;
          return [newSession, ...prev];
        });
      }).catch((err) => {
        console.error("Failed to create session on server:", err);
      });
    }

    if (onSessionNamed) {
      if (currentMsgs.length === 0) {
        onSessionNamed(activeSessionId, "New Chat");
      }
    }

    abortControllerRef.current = new AbortController();

    const isPasswordCommand =
      trimmedInput.toLowerCase() === PASSWORD_COMMAND.toLowerCase();

    if (isPasswordCommand) {
      setChatMessages((prev) => {
        const currentMsgs = prev[activeSessionId] || [];
        return {
          ...prev,
          [activeSessionId]: [
            ...currentMsgs,
            {
              message: "__LOADING__",
              sender: "robot",
              id: loadingId,
              time
            }
          ]
        };
      });

      try {
        const data = await api.utils.password(12);
        setChatMessages((prev) => {
          const currentMsgs = prev[activeSessionId] || [];
          return {
            ...prev,
            [activeSessionId]: currentMsgs.map((msg) =>
              msg.id === loadingId
                ? { ...msg, message: `Here is your unique key: ${data.password}` }
                : msg
            )
          };
        });
      } catch (err) {
        if (err.status === 429) {
          setCountdown(err.data?.retryAfter || 900);
          setChatMessages((prev) => {
            const currentMsgs = prev[activeSessionId] || [];
            return {
              ...prev,
              [activeSessionId]: currentMsgs.filter((m) => m.id !== loadingId)
            };
          });
        } else {
          setChatMessages((prev) => {
            const currentMsgs = prev[activeSessionId] || [];
            return {
              ...prev,
              [activeSessionId]: currentMsgs.map((msg) =>
                msg.id === loadingId
                  ? { ...msg, message: "Failed to generate unique key. Please check your connection and try again." }
                  : msg
              )
            };
          });
        }
      }
      setIsLoading(false);
      return;
    }



    if (!isStreamEnabled) {

      try {
        const data = await api.chat.send({
          message: trimmedInput,
          sessionId: activeSessionId,
          language,
          contextLimit,
          model,
          history: historyToSend,
          isRagSession: isRagSession,
          file: file,
          files: files,
          parentMessageId: parentMessageId || undefined
        });

        if (data.model) {
          setActiveModel(data.model);
          if (data.model !== model) {
            setFallbackUsed(data.model);
            if (setSelectedModel) {
              setSelectedModel(data.model);
            }
          }
        }

        if (data.sessionName && onSessionNamed) {
          onSessionNamed(activeSessionId, data.sessionName);
        }

        setChatMessages((prev) => {
          const currentMsgs = prev[activeSessionId] || [];
          const updatedMsgs = currentMsgs.map((msg) =>
            msg.id === loadingId
              ? {
                  ...msg,
                  message: data.reply,
                  model: data.model,
                  suggestions: data.suggestions
                }
              : msg
          );
          return {
            ...prev,
            [activeSessionId]: updatedMsgs
          };
        });
        // Re-sync from server so parentMessageId and versionInfo are correct
        resyncFromServer(activeSessionId);
      } catch (err) {
        const status = err.status || 500;
        let errMsg = "Failed to get a response from the AI. Please try again.";
        if (status === 503) {
          errMsg = "The AI model is currently busy. Trying backup model... Please resend your message.";
        } else if (status === 429) {
          errMsg = "Daily limit reached for this model. Switch to Gemini 2.5 Flash Lite for 1500 requests/day.";
          setCountdown(err.data?.retryAfter || 900);
        }
        const errObj = {
          id: loadingId,
          sender: "robot",
          message: errMsg,
          isError: true,
          errStatus: status,
          time
        };

        setChatMessages((prev) => {
          const currentMsgs = prev[activeSessionId] || [];
          return {
            ...prev,
            [activeSessionId]: currentMsgs.map((msg) => (msg.id === loadingId ? errObj : msg))
          };
        });
        setModelStatus("error");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsStreaming(true);

    setChatMessages((prev) => {
      const currentMsgs = prev[activeSessionId] || [];
      return {
        ...prev,
        [activeSessionId]: currentMsgs.map((msg) =>
          msg.id === loadingId ? { ...msg, message: "", isStreaming: true } : msg
        )
      };
    });

    let streamedText = "";

    const flushBuffer = () => {
      if (!chunkBufferRef.current) {
        timerRef.current = null;
        return;
      }
      const buffered = chunkBufferRef.current;
      chunkBufferRef.current = "";
      setChatMessages((prev) => {
        const sessionMsgs = prev[activeSessionId] || [];
        return {
          ...prev,
          [activeSessionId]: sessionMsgs.map((msg) =>
            msg.id === loadingId ? { ...msg, message: msg.message + buffered } : msg
          )
        };
      });
      timerRef.current = null;
    };

    const onChunk = (chunk) => {
      streamedText += chunk;
      chunkBufferRef.current += chunk;
      if (!timerRef.current) {
        timerRef.current = setTimeout(flushBuffer, 80);
      }
    };

    const flushBufferSync = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (chunkBufferRef.current) {
        const buffered = chunkBufferRef.current;
        chunkBufferRef.current = "";
        setChatMessages((prev) => {
          const sessionMsgs = prev[activeSessionId] || [];
          return {
            ...prev,
            [activeSessionId]: sessionMsgs.map((msg) =>
              msg.id === loadingId ? { ...msg, message: msg.message + buffered } : msg
            )
          };
        });
      }
    };

    try {
      const response = await api.chat.stream({
        message: trimmedInput,
        sessionId: activeSessionId,
        language,
        contextLimit,
        model,
        history: historyToSend,
        isRagSession: isRagSession,
        file: file,
        files: files,
        parentMessageId: parentMessageId || undefined
      }, abortControllerRef.current.signal);

      const status = response.status;
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const err = new Error(data.error || "Failed to get response from server.");
        err.status = status;
        err.data = data;
        if (status === 429) {
          setCountdown(data.retryAfter || 900);
        }
        throw err;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          if (line === "data: [DONE]") {
            break;
          }
          if (line.includes("event: session_name")) {
            const dataMatch = line.match(/data:\s*(.*)/);
            if (dataMatch && onSessionNamed) {
              onSessionNamed(activeSessionId, dataMatch[1].trim());
            }
            continue;
          }
          if (line.startsWith("data: ")) {
            const dataStr = line.substring(6);
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                onChunk(parsed.text);
              }
              if (parsed.model) {
                setActiveModel(parsed.model);
                if (parsed.model !== model) {
                  setFallbackUsed(parsed.model);
                  if (setSelectedModel) {
                    setSelectedModel(parsed.model);
                  }
                }
                setChatMessages((prev) => {
                  const currentMsgs = prev[activeSessionId] || [];
                  return {
                    ...prev,
                    [activeSessionId]: currentMsgs.map((msg) =>
                      msg.id === loadingId ? { ...msg, model: parsed.model } : msg
                    )
                  };
                });
              }
              if (parsed.suggestions) {
                setChatMessages((prev) => {
                  const currentMsgs = prev[activeSessionId] || [];
                  return {
                    ...prev,
                    [activeSessionId]: currentMsgs.map((msg) =>
                      msg.id === loadingId ? { ...msg, suggestions: parsed.suggestions } : msg
                    )
                  };
                });
              }
              if (parsed.error) {
                const streamErr = new Error(parsed.error);
                streamErr.status = parsed.status || 500;
                streamErr.data = parsed;
                throw streamErr;
              }
            } catch (e) {
              if (e.status) throw e;
              if (dataStr && !dataStr.startsWith("{") && !dataStr.startsWith("[")) {
                onChunk(dataStr);
              }
            }
          }
        }
      }

      flushBufferSync();

      setChatMessages((prev) => {
        const currentMsgs = prev[activeSessionId] || [];
        const updatedMsgs = currentMsgs.map((msg) =>
          msg.id === loadingId ? { ...msg, isStreaming: false } : msg
        );
        return {
          ...prev,
          [activeSessionId]: updatedMsgs
        };
      });
      // Re-sync from server so parentMessageId and versionInfo are correct
      resyncFromServer(activeSessionId);
    } catch (err) {
      flushBufferSync();
      if (err.name === "AbortError") {
        setChatMessages((prev) => {
          const currentMsgs = prev[activeSessionId] || [];
          const updatedMsgs = currentMsgs.map((msg) =>
            msg.id === loadingId
              ? { ...msg, message: streamedText + " (Generation stopped)", isStreaming: false }
              : msg
          );
          return {
            ...prev,
            [activeSessionId]: updatedMsgs
          };
        });
      } else {
        const status = err.status || 500;
        let errMsg = "Failed to get a response from the AI. Please try again.";
        if (status === 503) {
          errMsg = "The AI model is currently busy. Trying backup model... Please resend your message.";
        } else if (status === 429) {
          errMsg = "Daily limit reached for this model. Switch to Gemini 3.1 Flash Lite for 500 requests/day.";
        }
        const errObj = {
          id: loadingId,
          sender: "robot",
          message: errMsg,
          isError: true,
          errStatus: status,
          time,
          isStreaming: false
        };

        setChatMessages((prev) => {
          const currentMsgs = prev[activeSessionId] || [];
          return {
            ...prev,
            [activeSessionId]: currentMsgs.map((msg) => (msg.id === loadingId ? errObj : msg))
          };
        });
        setModelStatus("error");
      }
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    isStreaming,
    countdown,
    setCountdown,
    sendMessage,
    stopGeneration
  };
}
