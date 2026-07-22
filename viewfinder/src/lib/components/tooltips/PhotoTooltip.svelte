<script lang="ts">
    import type { ImageAsset } from "$lib/api";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { getImageLabel, getTakenAt, formatBytes, getImageMegapixels } from "$lib/utils/images";
    import { DateTime } from "luxon";
    import ImageLabelViewer from "../image-tools/ImageLabelViewer.svelte";
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import type { MouseEventHandler } from "svelte/elements";

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
        return exif.model;
    });

    let apertureVal = $derived(asset.exif?.f_number ?? asset.exif?.aperture);

    let hasExif = $derived(
        !!(
            asset.exif?.make ||
            asset.exif?.model ||
            asset.exif?.lens_model ||
            asset.exif?.focal_length ||
            apertureVal ||
            asset.exif?.exposure_time ||
            asset.exif?.iso
        )
    );

    let hasExposure = $derived(
        !!(asset.exif?.focal_length || apertureVal || asset.exif?.exposure_time || asset.exif?.iso)
    );
</script>

<div class="photo-tooltip-content">
    <div class="tooltip-row top-row">
        <span class="tooltip-label name" title={displayName}>{displayName}</span>

        {#if clickHandler}
            <IconButton
                iconName="edit"
                class="edit-button"
                size="1.25rem"
                onclick={(e) => {
                    clickHandler?.(e);
                }}
            />
        {/if}
    </div>

    {#if asset.private || asset.favourited || fileExtension}
        <div class="metadata-row">
            {#if asset.private}
                <div class="badge private-badge" title="Private">
                    <MaterialIcon iconName="lock" size="0.8rem" />
                    <span>Private</span>
                </div>
            {/if}
            {#if asset.favourited}
                <div class="badge favorite-badge" title="Favourited">
                    <MaterialIcon iconName="star" fill={true} size="0.8rem" />
                    <span>Favourited</span>
                </div>
            {/if}
            {#if fileExtension}
                <div class="badge ext-badge">
                    <span>{fileExtension}</span>
                </div>
            {/if}
        </div>
    {/if}

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

        {#if asset.image_metadata?.label}
            <div class="metadata-item">
                <span class="meta-label">Label</span>
                <span class="meta-value">
                    <ImageLabelViewer label={getImageLabel(asset)} variant="compact" enableSelection={false} />
                </span>
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
                    {#if asset.exif?.focal_length}
                        <div class="dial-item" title="Focal Length">
                            <span class="dial-value font-mono">{asset.exif.focal_length}</span>
                        </div>
                    {/if}
                    {#if apertureVal}
                        <div class="dial-item" title="Aperture">
                            <span class="dial-value font-mono">{apertureVal}</span>
                        </div>
                    {/if}
                    {#if asset.exif?.exposure_time}
                        <div class="dial-item" title="Shutter Speed">
                            <span class="dial-value font-mono">{asset.exif.exposure_time}</span>
                        </div>
                    {/if}
                    {#if asset.exif?.iso}
                        <div class="dial-item" title="ISO">
                            <span class="dial-value font-mono">ISO {asset.exif.iso}</span>
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
        width: 20rem;
        background-color: var(--viz-100);
        padding: var(--viz-spacing-std);
        gap: var(--viz-spacing-md);
        overflow: hidden;
    }

    .metadata-row {
        display: flex;
        flex-wrap: wrap;
        gap: var(--viz-spacing-xs);
        margin-top: calc(-1 * var(--viz-spacing-xs));
    }

    .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: var(--viz-80);
        color: var(--viz-text-color);
        padding: var(--viz-spacing-xxs) var(--viz-spacing-xs);
        border-radius: var(--viz-border-radius-sm);
        font-size: var(--viz-font-size-sm);
        font-family: var(--viz-mono-font);
        font-weight: 600;
        gap: var(--viz-spacing-xs);
        border: var(--viz-border-thin);

        &.favorite-badge {
            background-color: color-mix(in srgb, var(--viz-warning-color) 15%, var(--viz-95));
            border-color: color-mix(in srgb, var(--viz-warning-color) 35%, var(--viz-80));
            color: var(--viz-warning-color);
        }

        &.private-badge {
            background-color: color-mix(in srgb, var(--viz-error-color) 15%, var(--viz-95));
            border-color: color-mix(in srgb, var(--viz-error-color) 35%, var(--viz-80));
            color: var(--viz-error-color);
        }
    }

    .tooltip-row {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);

        :global(.edit-button) {
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
        color: var(--viz-text-color);
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
        background-color: var(--viz-60);
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
        color: var(--viz-40);
        font-family: var(--viz-display-font);
        font-weight: 500;
    }

    .meta-value {
        color: var(--viz-text-color);
        font-family: var(--viz-display-font);
        font-weight: 500;
        text-align: right;

        &.font-mono {
            font-family: var(--viz-mono-font);
            letter-spacing: -0.02em;
        }
    }

    .meta-sub {
        color: var(--viz-40);
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
        color: var(--viz-30);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        :global(.viz-material-icon) {
            color: var(--viz-40);
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
        display: flex;
        justify-content: space-between;
        background-color: var(--viz-95);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-sm);
        gap: var(--viz-spacing-xs);
        margin-top: var(--viz-spacing-xs);
    }

    .dial-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        border-right: var(--viz-border-thin);
        padding: var(--viz-spacing-xs);

        &:last-child {
            border-right: none;
        }
    }

    .dial-value {
        font-family: var(--viz-mono-font);
        font-size: var(--viz-font-size-sm);
        color: var(--viz-text-color);
        font-weight: 600;
    }
</style>
