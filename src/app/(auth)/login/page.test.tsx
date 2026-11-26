// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signInWithOAuth: mocks.signInWithOAuth,
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/shared/i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

import LoginPage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LoginPage OAuth sign-in", () => {
  it("waits for session initialization before writing the PKCE verifier", async () => {
    let finishInit!: () => void;
    mocks.getSession.mockReturnValue(
      new Promise((resolve) => {
        finishInit = () => resolve({ data: { session: null }, error: null });
      }),
    );
    mocks.signInWithOAuth.mockResolvedValue({ data: {}, error: null });

    render(<LoginPage />);
    fireEvent.click(screen.getByText("googleLogin"));

    await act(async () => {});
    expect(mocks.getSession).toHaveBeenCalledTimes(1);
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();

    await act(async () => finishInit());
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" }),
    );
  });

  it("still starts sign-in when session initialization fails", async () => {
    mocks.getSession.mockRejectedValue(new Error("network down"));
    mocks.signInWithOAuth.mockResolvedValue({ data: {}, error: null });

    render(<LoginPage />);
    await act(async () => {
      fireEvent.click(screen.getByText("githubLogin"));
    });

    expect(mocks.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "github" }),
    );
  });
});
