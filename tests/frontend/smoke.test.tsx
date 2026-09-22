import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Home } from "../../components/home";

describe("Ekphrasis upload surface", () => {
  it("renders the English upload surface without invoking providers", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /identify your artwork/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /choose a photo/i })).toBeTruthy();
  });

  it("uses the standard mobile file picker instead of forcing the camera", () => {
    render(<Home />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeTruthy();
    expect(input).not.toHaveAttribute("capture");
  });
});
