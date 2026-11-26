import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { frameStopper, pauseVideosWhenHidden, type StoppableFrame } from "@/hooks/use-stop-when-hidden";

// Back/Forward hides the watch page (Next.js keeps it in <Activity>); React then detaches refs.
// In development, Strict Mode also detaches and re-attaches every new ref straight away.

function fakeFrame() {
  const replace = vi.fn();
  const frame: StoppableFrame = { dataset: {}, contentWindow: { location: { replace } } };
  return { frame, replace };
}

describe("iframe player stops when the page is hidden", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("Strict Mode's detach + re-attach keeps the player and asks for no new frame (no loop)", () => {
    const shownAgain = vi.fn();
    const attach = frameStopper(shownAgain);
    const { frame, replace } = fakeFrame();
    const cleanup = attach(frame);
    cleanup?.();
    const cleanup2 = attach(frame);
    vi.runAllTimers();
    expect(replace).not.toHaveBeenCalled();
    expect(shownAgain).not.toHaveBeenCalled();
    expect(typeof cleanup2).toBe("function");
  });

  it("a real hide blanks the frame without a history entry (location.replace)", () => {
    const { frame, replace } = fakeFrame();
    frameStopper(vi.fn())(frame)?.();
    vi.runAllTimers();
    expect(replace).toHaveBeenCalledWith("about:blank");
  });

  it("shown again after a hide: asks for exactly one fresh frame", () => {
    const shownAgain = vi.fn();
    const attach = frameStopper(shownAgain);
    const { frame } = fakeFrame();
    attach(frame)?.();
    vi.runAllTimers();
    expect(attach(frame)).toBeUndefined();
    expect(shownAgain).toHaveBeenCalledTimes(1);
    // The fresh frame then goes through Strict Mode's double attach without another request.
    const fresh = fakeFrame().frame;
    attach(fresh)?.();
    attach(fresh);
    vi.runAllTimers();
    expect(shownAgain).toHaveBeenCalledTimes(1);
  });

  it("keeps frameRef on the live frame only", () => {
    const frameRef: { current: StoppableFrame | null } = { current: null };
    const { frame } = fakeFrame();
    const cleanup = frameStopper(vi.fn(), frameRef)(frame);
    expect(frameRef.current).toBe(frame);
    cleanup?.();
    expect(frameRef.current).toBeNull();
  });
});

describe("site player pauses when the page is hidden", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const fakeWrapper = () => {
    const pause = vi.fn();
    const el = { querySelectorAll: () => [{ pause }] } as unknown as HTMLElement;
    return { el, pause };
  };

  it("doesn't pause on Strict Mode's detach + re-attach", () => {
    const { el, pause } = fakeWrapper();
    pauseVideosWhenHidden(el)?.();
    pauseVideosWhenHidden(el);
    vi.runAllTimers();
    expect(pause).not.toHaveBeenCalled();
  });

  it("pauses on a real hide", () => {
    const { el, pause } = fakeWrapper();
    pauseVideosWhenHidden(el)?.();
    vi.runAllTimers();
    expect(pause).toHaveBeenCalledTimes(1);
  });
});
