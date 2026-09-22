import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "../../app/page";

describe("Ekphrasis upload surface", () => {
  it("renders the English upload surface without invoking providers", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /identify your artwork/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /choose a photo/i })).toBeTruthy();
  });
});