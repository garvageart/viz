import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TokenChip from "./TokenChip.svelte";

describe("TokenChip", () => {
    it("renders the token as the button label", () => {
        render(TokenChip, { token: "y" });

        expect(screen.getByRole("button", { name: "y" })).toBeInTheDocument();
    });

    it("renders the value next to the token when provided", () => {
        render(TokenChip, { token: "MM", value: "06" });

        expect(screen.getByText("MM")).toBeInTheDocument();
        expect(screen.getByText("06")).toBeInTheDocument();
    });

    it("omits the value when not provided", () => {
        render(TokenChip, { token: "MM" });

        expect(screen.queryByText("06")).not.toBeInTheDocument();
    });

    it("defaults the title hint to the token template", () => {
        render(TokenChip, { token: "y" });

        expect(screen.getByTitle("Click to insert {{y}}")).toBeInTheDocument();
    });

    it("calls onclick when clicked", async () => {
        const onclick = vi.fn();
        render(TokenChip, { token: "y", onclick });

        await fireEvent.click(screen.getByRole("button"));

        expect(onclick).toHaveBeenCalledTimes(1);
    });
});
