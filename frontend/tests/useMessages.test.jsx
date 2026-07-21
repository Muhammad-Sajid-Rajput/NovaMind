import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "../src/core/hooks/useLocalStorage.js";
import { useMessages } from "../src/features/chat/hooks/useMessages.js";
import { STORAGE_KEYS } from "../src/core/constants/index.js";

describe("Cross-Tab & Safe Persistence Tests", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should synchronize state across tabs via storage event in useLocalStorage", () => {
    const { result } = renderHook(() => useLocalStorage("test_key", { a: 1 }));

    expect(result.current[0]).toEqual({ a: 1 });

    act(() => {
      // Simulate another tab updating localStorage
      const updatedValue = JSON.stringify({ a: 1, b: 2 });
      localStorage.setItem("test_key", updatedValue);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "test_key",
          newValue: updatedValue,
        })
      );
    });

    expect(result.current[0]).toEqual({ a: 1, b: 2 });
  });

  it("should perform disk-fresh session key merging in useMessages setChatMessages", () => {
    // Seed localStorage with Tab 2's session
    localStorage.setItem(
      STORAGE_KEYS.MESSAGES,
      JSON.stringify({
        sessionB: [{ id: "msg_B1", message: "Hello from Tab 2" }]
      })
    );

    const { result } = renderHook(() => useMessages());

    // Tab 1 updates Session A
    act(() => {
      result.current.setChatMessages((prev) => ({
        ...prev,
        sessionA: [{ id: "msg_A1", message: "Hello from Tab 1" }]
      }));
    });

    // Check that both sessionA and sessionB are present in localStorage
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES));
    expect(stored.sessionA).toBeDefined();
    expect(stored.sessionB).toBeDefined();
    expect(stored.sessionA[0].message).toBe("Hello from Tab 1");
    expect(stored.sessionB[0].message).toBe("Hello from Tab 2");
  });
});
