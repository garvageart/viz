import type { ImageAsset } from "@viz/api";
import { DateTime } from "luxon";
import { getTakenAt } from "$lib/utils/images";

export type ImageWithDateLabel = ImageAsset & {
    dateLabel?: string;
    isFirstOfDate?: boolean;
    isFirstOfConsolidatedGroup?: boolean;
    isHeaderItem?: boolean;
    headerLabel?: string;
};

// Consolidated groups: merge small consecutive date groups into visual sections
export type ConsolidatedGroup = {
    label: string; // Combined label like "8 Mar - 26 Aug 2025"
    totalCount: number;
    allImages: ImageWithDateLabel[]; // All images merged together with date labels and in-flow headers
    isConsolidated: boolean; // true if multiple date groups merged
    startDate: DateTime; // newest date in this consolidated block
    endDate: DateTime; // oldest date in this consolidated block
};

export interface DateGroup {
    key: string;
    date: DateTime;
    label: string;
    items: ImageAsset[];
}

export function groupImagesByDate(list: ImageAsset[]) {
    const map = new Map<string, ImageAsset[]>();
    const keys: string[] = []; // Used to preserve the order of groups as they appear in the list

    for (const img of list) {
        const taken = getTakenAt(img);
        const dt = DateTime.fromJSDate(taken);
        const key = dt.toISODate()!;
        if (!map.has(key)) {
            map.set(key, []);
            keys.push(key);
        }

        map.get(key)!.push(img);
    }

    // Map the keys back to DateGroup objects, preserving the order they first appeared.
    // We assume the items within each group should also maintain their relative order from the input list.
    const labelled = keys.map((key) => {
        const items = map.get(key)!;
        const date = DateTime.fromISO(key);
        const today = DateTime.now().startOf("day");
        const diff = today.diff(date.startOf("day"), "days").days;
        let label = date.toLocaleString(DateTime.DATE_MED);

        if (diff === 0) {
            label = "Today";
        } else if (diff === 1) {
            label = "Yesterday";
        }

        return { key, date, label, items };
    });

    return labelled;
}

export function getConsolidatedGroups(groups: DateGroup[]) {
    // We no longer consolidate small groups. Each DateGroup becomes its own ConsolidatedGroup.
    // We also do NOT inject in-flow header items anymore; headers will be handled by the virtualizer as separate rows.

    const consolidated: ConsolidatedGroup[] = groups.map((group) => {
        // Prepare images with their individual date labels
        // No header item injection here.
        const imagesWithLabels: ImageWithDateLabel[] = group.items.map((img, idx) => ({
            ...img,
            dateLabel: group.label,
            isFirstOfDate: idx === 0
        }));

        return {
            label: group.label,
            totalCount: group.items.length,
            allImages: imagesWithLabels,
            isConsolidated: false,
            startDate: group.date,
            endDate: group.date
        };
    });

    return consolidated;
}
