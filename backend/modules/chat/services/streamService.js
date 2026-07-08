// NovaMind — backend/services/streamService.js

import { logger } from "../../../core/utils/logger.js";

export const handleSSEStream = async ({
  req,
  res,
  streamIterable,
  onComplete,
  onError,
  initialPayload
}) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  if (initialPayload) {
    res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);
    if (typeof res.flush === "function") res.flush();
  }

  let completeReply = "";
  let isAborted = false;

  req.on("close", () => {
    isAborted = true;
  });

  try {
    for await (const chunk of streamIterable.stream) {
      if (isAborted) {
        logger.info("[Stream] Client aborted connection.");
        break;
      }
      const chunkText = chunk.text();
      completeReply += chunkText;
      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      if (typeof res.flush === "function") res.flush();
    }

    if (!isAborted && onComplete) {
      await onComplete(completeReply, false);
    } else if (isAborted && onComplete) {
      await onComplete(completeReply, true);
    }
  } catch (error) {
    logger.error("[Stream Service Error]", { error: error.message });
    if (onError) {
      await onError(error);
    }
  } finally {
    if (!res.writableEnded) {
      res.write("data: [DONE]\n\n");
      if (typeof res.flush === "function") res.flush();
      res.end();
    }
  }
};
