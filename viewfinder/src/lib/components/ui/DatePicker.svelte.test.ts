import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import DatePicker from "./DatePicker.svelte";

describe("DatePicker", () => {
    it("renders trigger button and opens popover on click", async () => {
        const testDate = new Date(2026, 4, 15, 12, 0, 0);
        render(DatePicker, { value: testDate, open: false });

        const trigger = document.querySelector<HTMLElement>(".calendar-trigger");
        expect(trigger).toBeInTheDocument();
        expect(document.querySelector(".calendar-popover")).not.toBeInTheDocument();

        if (trigger) {
            await fireEvent.click(trigger);
        }

        expect(document.querySelector(".calendar-popover")).toBeInTheDocument();
    });

    it("renders month and year in dropdown matching initial value", () => {
        const testDate = new Date(2026, 4, 15, 12, 0, 0); // Month index 4
        render(DatePicker, { value: testDate, open: true });

        const expectedMonth = new Date(0, 4).toLocaleString(undefined, { month: "long" });
        const expectedYear = "2026";

        const monthValue = document.querySelector(".calendar-select-trigger.month .select-value");
        const yearValue = document.querySelector(".calendar-select-trigger.year .select-value");

        expect(monthValue).toBeInTheDocument();
        expect(yearValue).toBeInTheDocument();
        expect(monthValue?.textContent?.trim()).toBe(expectedMonth);
        expect(yearValue?.textContent?.trim()).toBe(expectedYear);
    });

    it("closes popover when close button is clicked", async () => {
        const testDate = new Date(2026, 4, 15, 12, 0, 0);
        const onclose = vi.fn();
        render(DatePicker, { value: testDate, open: true, onclose });

        const closeBtn = document.querySelector<HTMLElement>(".popover-close-btn");
        expect(closeBtn).toBeInTheDocument();

        if (closeBtn) {
            await fireEvent.click(closeBtn);
        }

        expect(onclose).toHaveBeenCalled();
    });

    it("hides time picker section when showTime is false", () => {
        const testDate = new Date(2026, 4, 15, 12, 0, 0);
        render(DatePicker, { value: testDate, open: true, showTime: false });

        expect(document.querySelector(".time-picker-section")).not.toBeInTheDocument();
    });

    it("navigates months using previous and next buttons", async () => {
        const testDate = new Date(2026, 4, 15, 12, 0, 0); // Month index 4
        render(DatePicker, { value: testDate, open: true });

        const initialMonth = new Date(0, 4).toLocaleString(undefined, { month: "long" });
        const nextMonth = new Date(0, 5).toLocaleString(undefined, { month: "long" });
        const prevMonth = new Date(0, 3).toLocaleString(undefined, { month: "long" });

        const monthValue = document.querySelector(".calendar-select-trigger.month .select-value");
        expect(monthValue?.textContent?.trim()).toBe(initialMonth);

        const nextBtn = document.querySelector<HTMLElement>(".calendar-header .calendar-nav-btn:last-child");
        expect(nextBtn).toBeInTheDocument();
        if (nextBtn) {
            await fireEvent.click(nextBtn);
        }
        expect(monthValue?.textContent?.trim()).toBe(nextMonth);

        const prevBtn = document.querySelector<HTMLElement>(".calendar-header .calendar-nav-btn:first-child");
        expect(prevBtn).toBeInTheDocument();
        if (prevBtn) {
            await fireEvent.click(prevBtn);
            await fireEvent.click(prevBtn);
        }
        expect(monthValue?.textContent?.trim()).toBe(prevMonth);
    });

    it("updates month dropdown when arrow keys navigate across months", async () => {
        const testDate = new Date(2026, 4, 31, 12, 0, 0); // Month index 4 (last day)
        render(DatePicker, { value: testDate, open: true });

        const initialMonth = new Date(0, 4).toLocaleString(undefined, { month: "long" });
        const nextMonth = new Date(0, 5).toLocaleString(undefined, { month: "long" });

        const monthValue = document.querySelector(".calendar-select-trigger.month .select-value");
        expect(monthValue?.textContent?.trim()).toBe(initialMonth);

        // Find the day button for the date
        const day31 = document.querySelector<HTMLElement>('[data-value^="2026-05-31"] .calendar-day');
        expect(day31).toBeInTheDocument();

        // Focus and press ArrowRight to navigate across month boundary
        if (day31) {
            day31.focus();
            await fireEvent.keyDown(day31, { key: "ArrowRight", code: "ArrowRight" });
        }

        expect(monthValue?.textContent?.trim()).toBe(nextMonth);
    });

    it("selects a date cell and triggers onchange", async () => {
        const testDate = new Date(2026, 4, 15, 12, 0, 0);
        const onchange = vi.fn();
        render(DatePicker, { value: testDate, open: true, onchange });

        const day20 = document.querySelector<HTMLElement>('[data-value^="2026-05-20"] .calendar-day');
        expect(day20).toBeInTheDocument();

        if (day20) {
            await fireEvent.click(day20);
        }

        expect(onchange).toHaveBeenCalled();
        const calledDate = onchange.mock.calls[0][0] as Date;
        expect(calledDate.getFullYear()).toBe(2026);
        expect(calledDate.getMonth()).toBe(4);
        expect(calledDate.getDate()).toBe(20);
    });
});
