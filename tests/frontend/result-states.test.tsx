import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "../../app/page";

describe("result states", () => {
  it("shows the processing copy without provider-specific stages", () => {
    render(<Home initialState="PROCESSING" />);
    expect(screen.getByText("Identifying your artwork…")).toBeInTheDocument();
    expect(screen.queryByText(/searching museums/i)).not.toBeInTheDocument();
  });

  it("shows medium with artist and year and hides style when absent", () => {
    render(<Home initialState="MATCH" result={{
      state: "MATCH",
      confidence: "high",
      artwork: { title: "Example", artist: "Artist", year: "1900", medium: "Oil on canvas", style: null },
      source: { id: "met", name: "The Met", image_url: "https://example.com/art.jpg", url: "https://example.com" },
      context: "Context.",
      detail: "Detail.",
      related_reading: [],
      degraded: false,
      unavailable_sources: []
    }} />);
    expect(screen.getByText("Artist")).toBeInTheDocument();
    expect(screen.getByText("1900")).toBeInTheDocument();
    expect(screen.getByText("Oil on canvas")).toBeInTheDocument();
    expect(screen.queryByText("Style")).not.toBeInTheDocument();
  });
});