import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/test/utils";

import NotFound from "./not-found";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => {
      const {
        initial: _initial,
        animate: _animate,
        transition: _transition,
        ...htmlProps
      } = props;

      return <div {...htmlProps}>{children}</div>;
    },
    span: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => {
      const {
        initial: _initial,
        animate: _animate,
        transition: _transition,
        ...htmlProps
      } = props;

      return <span {...htmlProps}>{children}</span>;
    },
  },
}));

describe("NotFound page i18n", () => {
  it("renders localized title instead of unresolved key", () => {
    render(<NotFound />);

    expect(screen.getByText("Page Not Found")).toBeInTheDocument();
    expect(screen.queryByText("common.notFound.title")).not.toBeInTheDocument();
  });
});
