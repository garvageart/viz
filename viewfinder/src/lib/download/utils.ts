import { DateTime } from "luxon";

export function createZipExportName(base: string = "viz-bulk_export") {
    return `${base}-${DateTime.now().toFormat("yyyyLLdd_HHmmss")}.zip`;
}
