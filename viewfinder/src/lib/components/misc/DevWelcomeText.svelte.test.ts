import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import DevWelcomeText from "./DevWelcomeText.svelte";

describe("DevWelcomeText", () => {
    it("renders the welcome heading", () => {
        render(DevWelcomeText);

        const heading = screen.getByRole("heading", { level: 1 });
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent("Welcome to viz");
    });

    it("links to the viz repository", () => {
        render(DevWelcomeText);

        expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
            "href",
            "https://github.com/garvageart/viz"
        );
    });

    it("describes the project", () => {
        render(DevWelcomeText);

        expect(screen.getByText(/in-browser GUI/i)).toBeInTheDocument();
    });
});
