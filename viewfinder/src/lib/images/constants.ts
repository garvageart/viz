import type { ImageAsset } from "@viz/api";
import { DateTime } from "luxon";
import type { TableColumn } from "$lib/components/ui/Table.svelte";

export enum LabelColours {
    Red = "#eb1717",
    Orange = "#f17a18",
    Yellow = "#f5e615",
    Purple = "#9355f7",
    Pink = "#f755a1",
    Green = "#19dd61",
    Blue = "#106ea5"
}

export const DEFAULT_IMAGE_COLUMNS: TableColumn<ImageAsset>[] = [
    { key: "name", header: "Name" },
    {
        key: "created_at",
        header: "Created At",
        formatter: (r) => {
            const dt = DateTime.fromISO(r.created_at);
            return dt.setZone("local").toLocaleString(DateTime.DATETIME_SHORT);
        }
    },
    {
        key: "updated_at",
        header: "Updated At",
        formatter: (r) => {
            const dt = DateTime.fromISO(r.updated_at);
            return dt.setZone("local").toLocaleString(DateTime.DATETIME_SHORT);
        }
    },
    {
        key: "taken_at",
        header: "Taken At",
        formatter: (r) => {
            const dt = DateTime.fromISO(r.taken_at);
            return dt.setZone("local").toLocaleString(DateTime.DATETIME_SHORT);
        }
    },
    { key: "width", header: "Width" },
    { key: "height", header: "Height" },
    { key: "description", header: "Description" },
    {
        key: "camera",
        header: "Camera",
        getValue: (row) =>
            row.exif?.make && row.exif?.model
                ? `${row.exif.make} ${row.exif.model}`
                : (row.exif?.model ?? row.exif?.make)
    },
    { key: "lens", header: "Lens", getValue: (row) => row.exif?.lens_model },
    { key: "focal_length", header: "Focal Length", getValue: (row) => row.exif?.focal_length },
    { key: "iso", header: "ISO", getValue: (row) => row.exif?.iso },
    { key: "aperture", header: "Aperture", getValue: (row) => row.exif?.aperture },
    { key: "shutter_speed", header: "Shutter Speed", getValue: (row) => row.exif?.exposure_time },
    { key: "rating", header: "Rating", getValue: (row) => row.image_metadata?.rating }
];

export const flashModes: Record<number, string> = {
    0x0: "Did not fire",
    0x1: "Fired",
    0x5: "Fired, return not detected",
    0x7: "Fired, return detected",
    0x8: "On, did not fire",
    0x9: "On, fired",
    0xd: "On, return not detected",
    0xf: "On, return detected",
    0x10: "Off, did not fire",
    0x14: "Off, did not fire, return not detected",
    0x18: "Auto, did not fire",
    0x19: "Auto, fired",
    0x1d: "Auto, fired, return not detected",
    0x1f: "Auto, fired, return detected",
    0x20: "No flash function",
    0x41: "Fired, red-eye reduction",
    0x45: "Fired, red-eye reduction, return not detected",
    0x47: "Fired, red-eye reduction, return detected",
    0x49: "On, red-eye reduction",
    0x4d: "On, red-eye reduction, fired",
    0x4f: "On, red-eye reduction, return not detected",
    0x50: "Off, red-eye reduction",
    0x58: "Auto, did not fire, red-eye reduction",
    0x59: "Auto, fired, red-eye reduction",
    0x5d: "Auto, fired, return not detected",
    0x5f: "Auto, fired, return detected"
};
