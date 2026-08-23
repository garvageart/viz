import { DateTime } from "luxon";

export function createZipExportName(base: string) {
    return `${base}-${DateTime.now().toFormat("yyyyLLdd_HHmmss")}.zip`;
}
