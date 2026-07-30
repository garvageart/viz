<script lang="ts">
    import { DateTime } from "luxon";
    import type { MouseEventHandler } from "svelte/elements";
    import type { ImageAsset } from "$lib/api";
    import Badge from "$lib/components/ui/Badge.svelte";
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { formatBytes, getImageLabel, getImageMegapixels, getTakenAt } from "$lib/utils/images";
    import ImageLabelViewer from "../image-tools/ImageLabelViewer.svelte";

    interface Props {
        asset: ImageAsset;
        clickHandler?: MouseEventHandler<HTMLElement>;
    }

    let { asset, clickHandler }: Props = $props();
    let takenAt = $derived(getTakenAt(asset));
    let displayName = $derived(asset.name || asset.image_metadata?.file_name);

    let fileExtension = $derived.by(() => {
        if (!displayName) {
            return "";
        }

        const parts = displayName.split(".");
        if (parts.length > 1) {
            return parts.pop()?.toUpperCase() || "";
        }

        return "";
    });

    let megapixel = $derived(getImageMegapixels(asset));

    let fileSizeStr = $derived.by(() => {
        const size = asset.image_metadata?.file_size;
        if (size !== undefined && size !== null) {
            return formatBytes(size);
        }

        return null;
    });

    let cameraModel = $derived.by(() => {
        const exif = asset.exif;
        if (!exif?.model) {
            return null;
        }

        const make = exif.make || "";
        if (make && exif.model.startsWith(make)) {
            return exif.model.replace(new RegExp(`^${make}\\s+`, "i"), "");
        }

        return `${exif.make} ${exif.model}`;
    });

    let rawAperture = $derived(asset.exif?.f_number ?? asset.exif?.aperture);
    let apertureVal = $derived.by(() => {
        if (rawAperture === undefined || rawAperture === null) {
            return null;
        }
        const str = String(rawAperture).trim();
        if (str.startsWith("f/") || str.startsWith("ƒ/")) {
            return str;
        }

        return `f/${str}`;
    });

    let focalLengthVal = $derived.by(() => {
        const val = asset.exif?.focal_length;
        if (!val) {
            return null;
        }

        const str = String(val).trim();
        if (str.endsWith("mm") || str.endsWith("MM")) {
            return str;
        }

        return `${str}mm`;
    });

    let shutterSpeedVal = $derived.by(() => {
        const val = asset.exif?.exposure_time;
        if (!val) {
            return null;
        }

        return String(val).trim();
    });

    let isoVal = $derived.by(() => {
        const val = asset.exif?.iso;
        if (val === undefined || val === null) {
            return null;
        }

        const str = String(val).trim();
        if (str.toUpperCase().startsWith("ISO")) {
            return str.toUpperCase();
        }

        return `ISO ${str}`;
    });

    let hasExif = $derived(
        !!(
            asset.exif?.make ||
            asset.exif?.model ||
            asset.exif?.lens_model ||
            focalLengthVal ||
            apertureVal ||
            shutterSpeedVal ||
            isoVal
        )
    );

    let hasExposure = $derived(!!(focalLengthVal || apertureVal || shutterSpeedVal || isoVal));
</script>

<div class="photo-tooltip-content">
    <div class="tooltip-row top-row">
        <span class="tooltip-label name" title={displayName}>{displayName}</span>

        {#if clickHandler}
            <IconButton
                iconName="open_in_full"
                title="Open"
                class="info-button"
                size="1.25rem"
                onclick={(e) => {
                    clickHandler?.(e);
                }}
            />
        {/if}
    </div>

    <div class="metadata-row">
        {#if asset.private || asset.favourited || fileExtension}
            {#if asset.private}
                <Badge variant="error" iconName="lock" iconSize="0.8rem" title="Private">
                    <span>Private</span>
                </Badge>
            {/if}
            {#if asset.favourited}
                <Badge variant="warning" iconName="star" iconFill={true} iconSize="0.8rem" title="Favourited">
                    <span>Favourited</span>
                </Badge>
            {/if}
            {#if fileExtension}
                <Badge variant="default">
                    <span>{fileExtension}</span>
                </Badge>
            {/if}
        {/if}
        <span class="label">
            <ImageLabelViewer label={getImageLabel(asset)} variant="compact" enableSelection={false} />
        </span>
    </div>

    {#if asset.description}
        <div class="tooltip-description">{asset.description}</div>
    {/if}

    <div class="divider"></div>

    <div class="metadata-grid">
        {#if takenAt}
            <div class="metadata-item">
                <span class="meta-label">Captured</span>
                <span class="meta-value font-mono">{DateTime.fromJSDate(takenAt).toFormat("dd LLL yyyy • HH:mm")}</span>
            </div>
        {/if}

        <div class="metadata-item">
            <span class="meta-label">Dimensions</span>
            <span class="meta-value font-mono">
                {asset.width} × {asset.height}
                <span class="meta-sub">({megapixel} MP)</span>
            </span>
        </div>

        {#if fileSizeStr}
            <div class="metadata-item">
                <span class="meta-label">File Size</span>
                <span class="meta-value font-mono">{fileSizeStr}</span>
            </div>
        {/if}

        {#if asset.owner?.name}
            <div class="metadata-item">
                <span class="meta-label">Owner</span>
                <span class="meta-value">{asset.owner.name}</span>
            </div>
        {/if}
    </div>

    {#if hasExif}
        <div class="divider"></div>
        <div class="exif-section">
            {#if cameraModel}
                <div class="exif-camera-model" title={cameraModel}>
                    <MaterialIcon iconName="photo_camera" size="1.1rem" />
                    <span class="camera-text">{cameraModel}</span>
                </div>
            {/if}
            {#if asset.exif?.lens_model}
                <div class="exif-lens-model" title={asset.exif.lens_model}>
                    <MaterialIcon iconName="adjust" size="1.1rem" />
                    <span class="lens-text">{asset.exif.lens_model}</span>
                </div>
            {/if}

            {#if hasExposure}
                <div class="exif-dials">
                    {#if focalLengthVal}
                        <div class="dial-item" title="Focal Length">
                            <span class="dial-value font-mono">{focalLengthVal}</span>
                            <span class="dial-label">Focal</span>
                        </div>
                    {/if}
                    {#if apertureVal}
                        <div class="dial-item" title="Aperture">
                            <span class="dial-value font-mono">{apertureVal}</span>
                            <span class="dial-label">Aperture</span>
                        </div>
                    {/if}
                    {#if shutterSpeedVal}
                        <div class="dial-item" title="Shutter Speed">
                            <span class="dial-value font-mono">{shutterSpeedVal}</span>
                            <span class="dial-label">Shutter</span>
                        </div>
                    {/if}
                    {#if isoVal}
                        <div class="dial-item" title="ISO">
                            <span class="dial-value font-mono">{isoVal}</span>
                            <span class="dial-label">ISO</span>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
</div>

<style lang="scss">
    /* Apply border-radius to tippy box when it contains the photo tooltip content */
    :global(.tippy-box[data-theme~="viz"]:has(.photo-tooltip-content)) {
        border-radius: var(--viz-border-radius-lg);
        overflow: hidden;
    }

    .photo-tooltip-content {
        display: flex;
        flex-direction: column;
        text-align: left;
        width: 25rem;
        background-color: var(--viz-surface-panel);
        padding: var(--viz-spacing-std);
        gap: var(--viz-spacing-md);
        overflow: hidden;
    }

    .metadata-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--viz-spacing-xs);
        margin-top: calc(-1 * var(--viz-spacing-xs));
    }

    .tooltip-row {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);

        :global(.info-button) {
            padding: var(--viz-spacing-xs);
        }
    }

    .top-row {
        justify-content: space-between;
    }

    .tooltip-label {
        font-family: var(--viz-display-font);
        font-size: var(--viz-font-size-std);
        font-weight: 600;
        color: var(--viz-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-grow: 1;

        &.name {
            font-size: var(--viz-font-size-lg);
        }
    }

    .tooltip-description {
        line-height: 1.4;
        word-break: break-word;
        margin-top: calc(-1 * var(--viz-spacing-xs));
    }

    .divider {
        height: 1px;
        background-color: var(--viz-border-subtle);
        margin: 0;
    }

    .metadata-grid {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
    }

    .metadata-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--viz-spacing-md);
    }

    .meta-label {
        color: var(--viz-text-secondary);
        font-family: var(--viz-display-font);
        font-weight: 500;
    }

    .meta-value {
        color: var(--viz-text-primary);
        font-family: var(--viz-display-font);
        font-weight: 500;
        text-align: right;

        &.font-mono {
            font-family: var(--viz-mono-font);
            letter-spacing: -0.02em;
        }
    }

    .meta-sub {
        color: var(--viz-text-secondary);
        margin-left: var(--viz-spacing-xs);
    }

    .exif-section {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
    }

    .exif-camera-model,
    .exif-lens-model {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        color: var(--viz-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        :global(.viz-material-icon) {
            flex-shrink: 0;
        }
    }

    .camera-text,
    .lens-text {
        font-family: var(--viz-mono-font);
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .exif-dials {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
        background-color: var(--viz-surface-popover);
        border: 1px solid var(--viz-border-subtle);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-xs) 0;
        margin-top: var(--viz-spacing-xs);
        box-sizing: border-box;
    }

    .dial-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: var(--viz-spacing-xs) var(--viz-spacing-xxs);
        border-right: 1px solid var(--viz-border-subtle);
        min-width: 0;
        box-sizing: border-box;

        &:last-child {
            border-right: none;
        }
    }

    .dial-value {
        font-family: var(--viz-mono-font);
        font-size: var(--viz-font-size-sm);
        color: var(--viz-text-primary);
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        line-height: 1.2;
    }

    .dial-label {
        font-size: var(--viz-font-size-xs);
        color: var(--viz-text-secondary);
        font-weight: 500;
        margin-top: 2px;
        line-height: 1;
    }
</style>
