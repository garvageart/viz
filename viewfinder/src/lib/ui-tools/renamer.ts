import Handlebars from "handlebars";
import { DateTime } from "luxon";
import type { ImageAsset } from "$lib/api";
import { buildDateTokens, cleanFilenameSegment } from "./template";

export function getFilenameBasenameAndExtension(filename: string): { basename: string; ext: string } {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot === -1) {
        return { basename: filename, ext: "" };
    }

    return {
        basename: filename.substring(0, lastDot),
        ext: filename.substring(lastDot + 1)
    };
}

export interface RenameOptions {
    sequenceStart?: number; // default: 1
    sequencePadding?: number; // default: 4 (e.g., 0001)
    customName?: string;
}

export function buildRenameContext(asset: ImageAsset, index: number, options: RenameOptions = {}) {
    const seqStart = options.sequenceStart ?? 1;
    const seqPad = options.sequencePadding ?? 4;
    const customText = options.customName ?? "";

    const seqVal = seqStart + index;
    const seqStr = String(seqVal).padStart(seqPad, "0");

    const fullFilename =
        asset.image_metadata?.original_file_name || asset.image_metadata?.file_name || asset.name || "unknown.jpg";
    const { basename, ext } = getFilenameBasenameAndExtension(fullFilename);

    const dateSource = asset.taken_at || asset.created_at;
    const dt = dateSource ? DateTime.fromISO(dateSource) : DateTime.now();

    return {
        ...buildDateTokens(dt),
        seq: seqStr,
        filename: cleanFilenameSegment(fullFilename),
        basename: cleanFilenameSegment(basename),
        ext: ext.toLowerCase(),
        customName: cleanFilenameSegment(customText),
        make: cleanFilenameSegment(asset.exif?.make || ""),
        model: cleanFilenameSegment(asset.exif?.model || ""),
        lensModel: cleanFilenameSegment(asset.exif?.lens_model || "")
    };
}

export function renderRenameTemplate(
    templateStr: string,
    asset: ImageAsset,
    index: number,
    options: RenameOptions = {}
): string {
    const ctx = buildRenameContext(asset, index, options);
    const templateFn = Handlebars.compile(templateStr);
    return templateFn(ctx);
}

export function safeRenderRenameTemplate(
    templateStr: string,
    asset: ImageAsset,
    index: number,
    options: RenameOptions = {}
): { name: string; error: string | null } {
    try {
        const name = renderRenameTemplate(templateStr, asset, index, options);
        return { name, error: null };
    } catch (e) {
        return { name: "", error: (e as Error).message || "Template error" };
    }
}
