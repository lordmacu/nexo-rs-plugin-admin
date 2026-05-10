import { describe, expect, it } from "vitest";
import { act } from "react";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { useUrlState } from "../../src/shell/useUrlState";

function withRouter(initialPath: string) {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
  );
}

describe("useUrlState", () => {
  it("returns the fallback when the param is missing", () => {
    const { result } = renderHook(() => useUrlState("search", ""), {
      wrapper: withRouter("/m/chats"),
    });
    expect(result.current[0]).toBe("");
  });

  it("parses a JSON value from the URL", () => {
    const { result } = renderHook(() => useUrlState("search", ""), {
      wrapper: withRouter('/m/chats?search="hola"'),
    });
    expect(result.current[0]).toBe("hola");
  });

  it("falls back when the param is malformed JSON", () => {
    const { result } = renderHook(() => useUrlState("count", 0), {
      wrapper: withRouter("/m/chats?count=not-json"),
    });
    expect(result.current[0]).toBe(0);
  });

  it("setValue('') removes the param from the URL", () => {
    const { result } = renderHook(() => useUrlState("search", ""), {
      wrapper: withRouter('/m/chats?search="hola"'),
    });
    act(() => result.current[1](""));
    expect(result.current[0]).toBe("");
  });

  it("setValue(null) removes the param", () => {
    const { result } = renderHook(
      () => useUrlState<string | null>("label", null),
      { wrapper: withRouter('/m/chats?label="vip"') },
    );
    act(() => result.current[1](null));
    expect(result.current[0]).toBeNull();
  });

  it("supports number values via JSON serialisation", () => {
    const { result } = renderHook(() => useUrlState("page", 0), {
      wrapper: withRouter("/m/chats"),
    });
    act(() => result.current[1](7));
    expect(result.current[0]).toBe(7);
  });
});
