// NovaMind — ChatInput.test.jsx — File Upload Bug Fix
// Frontend unit tests for ChatInput component using Vitest and React Testing Library.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatInput from "../src/features/chat/components/ChatInput.jsx";
import { useChatContext } from "../src/features/chat/context/ChatContext.jsx";
import { useStream } from "../src/features/chat/hooks/useStream.js";

// ─── Mocks ───────────────────────────────────────────────────────────────────
vi.mock("../src/features/chat/context/ChatContext.jsx", () => ({
  useChatContext: vi.fn(),
}));

vi.mock("../src/features/chat/hooks/useStream.js", () => ({
  useStream: vi.fn(),
}));

vi.mock("../src/features/chat/hooks/useVoiceInput.js", () => ({
  useVoiceInput: () => ({
    isRecording: false,
    hasVoiceSupport: true,
    toggleRecording: vi.fn(),
  }),
}));

vi.mock("../src/features/chat/components/ModelSelector.jsx", () => ({
  default: () => <div data-testid="model-selector">ModelSelector</div>,
}));

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }) => <span data-testid={`icon-${icon}`} />,
}));

describe("🎨 ChatInput Component Tests", () => {
  const mockSendMessage = vi.fn();
  const mockSetSessionDrafts = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for ChatContext
    useChatContext.mockReturnValue({
      currentSessionId:   "session-123",
      sessionsList:       [{ id: "session-123", name: "New Chat" }],
      chatMessages:       {},
      sessionDrafts:      {},
      setSessionDrafts:   mockSetSessionDrafts,
      selectedLanguage:   "English",
      contextLimit:       20,
      selectedModel:      "gemini-2.5-flash",
      setIsTemplatesOpen: vi.fn(),
      isStreamEnabled:    true,
      editingMessageId:   null,
    });

    // Default mock implementation for useStream
    useStream.mockReturnValue({
      isLoading:      false,
      isStreaming:    false,
      countdown:      0,
      sendMessage:    mockSendMessage,
      stopGeneration: vi.fn(),
    });
  });

  it("should render chat textarea and helper buttons correctly", () => {
    render(<ChatInput />);

    // Check textarea presence
    const textarea = screen.getByPlaceholderText(/Message NovaMind/i);
    expect(textarea).toBeInTheDocument();

    // Check send button is disabled when input is empty
    const sendBtn = screen.getByTitle(/Send message/i);
    expect(sendBtn).toBeDisabled();

    // Check ModelSelector is rendered
    expect(screen.getAllByTestId("model-selector").length).toBeGreaterThan(0);
  });

  it("should enable the send button when the user types a message", () => {
    render(<ChatInput />);

    const textarea = screen.getByPlaceholderText(/Message NovaMind/i);
    fireEvent.change(textarea, { target: { value: "Hello, this is a test message" } });

    const sendBtn = screen.getByTitle(/Send message/i);
    expect(sendBtn).toBeEnabled();
  });

  it("should invoke sendMessage when form is submitted", () => {
    render(<ChatInput />);

    const textarea = screen.getByPlaceholderText(/Message NovaMind/i);
    fireEvent.change(textarea, { target: { value: "Hello AI!" } });

    const sendBtn = screen.getByTitle(/Send message/i);
    fireEvent.click(sendBtn);

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: "Hello AI!",
      file: null,
      files: [],
      isRagSession: false,
    });
    
    // Input should be cleared after submit
    expect(textarea.value).toBe("");
  });

  it("should display a character counter when text is close to the limit", () => {
    render(<ChatInput />);

    const textarea = screen.getByPlaceholderText(/Message NovaMind/i);
    
    // Generate a string of 7500 characters
    const longText = "a".repeat(7500);
    fireEvent.change(textarea, { target: { value: longText } });

    // Counter should appear (e.g. 7500/8000)
    const counter = screen.getByRole("status");
    expect(counter).toBeInTheDocument();
    expect(counter.textContent).toBe("7500/8000");
  });
});
