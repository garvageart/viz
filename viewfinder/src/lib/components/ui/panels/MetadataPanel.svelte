<script lang="ts">
    import { slide } from "svelte/transition";
    import type { ImageAsset, Label } from "$lib/api";
    import ImageLabelViewer from "$lib/components/image-tools/ImageLabelViewer.svelte";
    import StarRating from "$lib/components/image-tools/StarRating.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import DatePicker from "$lib/components/ui/DatePicker.svelte";
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import InputText from "$lib/components/ui/InputText.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import TextArea from "$lib/components/ui/TextArea.svelte";
    import { LabelColours } from "$lib/images/constants";
    import { setRating } from "$lib/images/exif";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import { formatBytes, getFlashMode, getImageLabel, getTakenAt, getWhiteBalance } from "$lib/utils/images";
    import { copyToClipboard } from "$lib/utils/misc";

    interface Props {
        asset: ImageAsset;
        show: boolean;
        showCloseIcon?: boolean;
        onImageUpdated?: (updatedAsset: ImageAsset) => void;
    }

    let { asset, show = $bindable(false), showCloseIcon = $bindable(false), onImageUpdated }: Props = $props();

    let editingState = $state({
        isEditing: false,
        name: ""
    });
    let calendarOpen = $state(false);

    function getTimezoneAbbreviation(): string {
        const parts = new Intl.DateTimeFormat("en", { timeZoneName: "short" }).formatToParts();
        return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    }

    function handleDateChange(newDate: Date) {
        asset.taken_at = newDate.toISOString();
    }

    let starRating = $derived<number | null>(asset?.image_metadata?.rating ?? null);
    let updatingRating = $state(false);

    async function setImageRating(newRating: number | null) {
        if (updatingRating) {
            return;
        }

        updatingRating = true;
        const prev = starRating;
        try {
            const newSuccessfulRating = await setRating(asset, prev, newRating);

            if (asset && asset.image_metadata) {
                asset.image_metadata = {
                    ...asset.image_metadata,
                    rating: newSuccessfulRating
                };

                onImageUpdated?.(asset);
            }
        } catch (err) {
            const ratingErr = err as Error;
            toasts.add({
                type: "error",
                title: "Failed to update rating",
                message: ratingErr.message
            });
        } finally {
            updatingRating = false;
        }
    }
</script>

<div class="metadata-editor" transition:slide={{ duration: 200, axis: "x" }}>
    <div class="metadata-header">
        <h3>Metadata</h3>
        {#if showCloseIcon}
            <IconButton iconName="close" class="metadata-close-btn" title="Close" onclick={() => (show = false)} />
        {/if}
    </div>
    <div class="metadata-exif-box">
        <div class="exif-cards">
            <div class="exif-card">
                <div class="card-row main-row">
                    <MaterialIcon iconName="image" class="exif-material-icon" />
                    <div class="card-values">
                        <div class="name-row">
                            {#if editingState.isEditing}
                                <InputText
                                    bind:value={editingState.name}
                                    class="value-big"
                                    spellcheck="false"
                                    autofocus={true}
                                    onblur={() => {
                                        if (editingState.isEditing && asset) {
                                            asset.name = editingState.name.trim();
                                            editingState.isEditing = false;
                                        }
                                    }}
                                    onkeydown={(e) => {
                                        if (e.key === "Enter") {
                                            e.currentTarget.blur();
                                        } else if (e.key === "Escape") {
                                            editingState.isEditing = false;
                                        }
                                    }}
                                />
                            {:else}
                                <div
                                    role="button"
                                    tabindex="0"
                                    title={asset?.name || asset?.image_metadata?.file_name || "Untitled"}
                                    onclick={() => {
                                        editingState.name = asset?.name || asset?.image_metadata?.file_name || "";
                                        editingState.isEditing = true;
                                    }}
                                    onkeydown={() => {
                                        editingState.name = asset?.name || asset?.image_metadata?.file_name || "";
                                        editingState.isEditing = true;
                                    }}
                                    class="value-big"
                                >
                                    {asset?.name || asset?.image_metadata?.file_name || "Untitled"}
                                </div>
                                <button
                                    class="copy-filename-btn"
                                    title="Copy filename"
                                    onclick={() => {
                                        const nameToCopy = asset?.name || asset?.image_metadata?.file_name;
                                        if (nameToCopy) {
                                            copyToClipboard(nameToCopy);
                                            toasts.add({
                                                type: "success",
                                                title: nameToCopy,
                                                message: "Filename copied to clipboard",
                                                timeout: 2000
                                            });
                                        }
                                    }}
                                >
                                    <MaterialIcon iconName="content_copy" class="exif-material-icon" />
                                </button>
                            {/if}
                            {#if asset?.image_metadata?.file_type}
                                <Badge variant="default" class="file-type-badge">
                                    {asset.image_metadata.file_type.replace("image/", "").toUpperCase()}
                                </Badge>
                            {/if}
                        </div>
                    </div>
                </div>
                <DatePicker value={getTakenAt(asset)} bind:open={calendarOpen} onchange={(d) => handleDateChange(d)}>
                    {#snippet children()}
                        <div class="card-row meta-row" role="button">
                            <MaterialIcon iconName="calendar_today" class="exif-material-icon" />
                            <div class="card-values">
                                <div class="value-big">
                                    {getTakenAt(asset).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric"
                                    })}
                                </div>
                                <div class="value-sub">
                                    {getTakenAt(asset).toLocaleTimeString(undefined, {
                                        hour: "numeric",
                                        minute: "numeric"
                                    })}
                                    {getTimezoneAbbreviation()}
                                </div>
                            </div>
                        </div>
                    {/snippet}
                </DatePicker>
            </div>
            <!-- Description -->
            <div class="exif-card description">
                <TextArea
                    class="exif-description"
                    placeholder="Add a description"
                    rows={3}
                    maxHeight="2rem"
                    resize="none"
                />
            </div>
            <!-- Camera/Exposure card -->
            <div class="exif-card">
                <div class="card-row main-row">
                    <div class="card-values">
                        {#if asset?.exif?.model && asset?.exif?.make}
                            <div class="value-big">
                                {asset.exif.make}
                                {asset.exif.model.replace(new RegExp(`^${asset.exif.make} `), "")}
                            </div>
                        {:else}
                            <div class="value-big">Unknown Camera</div>
                        {/if}

                        {#if asset?.exif?.lens_model}
                            <div class="value-sub">
                                {asset.exif.lens_model}
                            </div>
                        {:else}
                            <div class="value-sub">Unknown Lens Make</div>
                        {/if}

                        {#if asset?.exif?.focal_length}
                            <div class="value-sub">
                                {asset.exif.focal_length}
                            </div>
                        {:else}
                            <div class="value-sub">Unknown Focal Length</div>
                        {/if}
                    </div>
                </div>
            </div>
            <div class="exif-card-group">
                <div class="exif-card">
                    <div class="card-row main-row">
                        <MaterialIcon iconName="camera" class="exif-material-icon" />
                        <div class="card-values">
                            <div class="value-sub">
                                {asset?.exif?.f_number ?? asset?.exif?.aperture ?? "—"}
                            </div>
                            <div class="value-sub">
                                {asset?.exif?.exposure_time ?? "—"}
                            </div>
                        </div>
                    </div>
                    <div class="card-row meta-row">
                        <MaterialIcon iconName="tune" class="exif-material-icon" />
                        <div class="card-values">
                            <div class="value-sub">
                                ISO {asset?.exif?.iso ?? "—"}
                            </div>
                            <div class="value-sub">
                                {asset?.exif?.exposure_value ?? "—"}
                            </div>
                        </div>
                    </div>
                    <div class="card-row meta-row">
                        <MaterialIcon
                            iconName="flash_on"
                            fill={true}
                            style="color: #FFC107; fill: #FFC107;"
                            class="exif-material-icon"
                        />
                        <div class="card-values">
                            <div class="value-sub">
                                Flash {getFlashMode(asset?.exif?.flash) ?? "—"}
                            </div>
                        </div>
                    </div>
                    {#if asset?.exif?.white_balance}
                        <div class="card-row meta-row">
                            <MaterialIcon iconName="light_mode" class="exif-material-icon" />
                            <div class="card-values">
                                <div class="value-sub">
                                    {getWhiteBalance(asset.exif.white_balance)}
                                    {#if asset?.exif?.color_temperature}
                                        &nbsp;· {asset.exif.color_temperature}K
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>

                <div class="exif-card">
                    <div class="card-row main-row">
                        <div class="card-values">
                            <div class="value-sub">
                                {asset?.width} x {asset?.height}
                            </div>
                        </div>
                    </div>
                    <div class="card-row main-row">
                        <MaterialIcon iconName="aspect_ratio" class="exif-material-icon" />
                        <div class="card-values">
                            <div class="value-sub">
                                {Math.floor((asset?.width! * asset?.height!) / 1_000_000)} MP
                            </div>
                            <div class="value-sub">{formatBytes(asset.image_metadata?.file_size) ?? "—"}</div>
                        </div>
                    </div>
                    <div class="card-row meta-row">
                        <MaterialIcon iconName="palette" class="exif-material-icon" />
                        <div class="card-values">
                            <div class="value-sub">
                                {asset?.image_metadata?.color_space ?? "—"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="rating-container">
            <ImageLabelViewer
                variant="compact"
                label={getImageLabel(asset)}
                onSelect={(selectedLabel) => {
                    const entry = Object.entries(LabelColours).find(([_, colour]) => colour === selectedLabel);
                    const labelToSend = entry ? (entry[0] as Label) : null;
                    if (asset.image_metadata) {
                        asset.image_metadata = {
                            ...asset.image_metadata,
                            label: labelToSend
                        };
                    }
                }}
            />
            <StarRating value={starRating} onChange={setImageRating} />
        </div>
    </div>
</div>

<style lang="scss">
    .metadata-editor {
        background-color: var(--viz-surface-panel);
        padding: var(--viz-spacing-std);
        border-radius: var(--viz-border-radius-lg);
        border-left: 1px solid var(--viz-border-subtle);
        color: var(--viz-text-primary);
        height: 100%;
        width: auto;
        max-width: 20vw;
        min-width: 20vw;
        pointer-events: auto;
        box-sizing: border-box;
        overflow-y: auto;
    }

    @media (max-width: 40rem) {
        .metadata-editor {
            position: fixed;
            top: 0;
            right: 0;
            transform: none;
            width: 95%;
            max-width: none;
            min-width: 0;
            height: 100%;
            border-radius: 0;
            border-left: 1px solid var(--viz-border-subtle);
            border-top: none;
            z-index: 10000;
            box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
        }
    }

    .metadata-header {
        font-size: var(--viz-font-size-lg);
        font-weight: 700;
        color: var(--viz-text-primary);
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--viz-spacing-sm);
        padding-bottom: var(--viz-spacing-sm);
        border-bottom: 1px solid var(--viz-border-subtle);
        gap: 0.5em;
    }

    .metadata-exif-box {
        display: block;
    }

    .exif-card-group {
        display: flex;
        gap: 0;
    }

    .exif-card-group > .exif-card:first-child {
        border-right: none;
        border-radius: var(--viz-border-radius-md) 0 0 var(--viz-border-radius-md);
    }

    .exif-card-group > .exif-card:last-child {
        border-radius: 0 var(--viz-border-radius-md) var(--viz-border-radius-md) 0;
    }

    .exif-cards {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
    }

    .exif-card {
        background: var(--viz-surface-card);
        color: var(--viz-text-primary);
        box-sizing: border-box;
        width: 100%;
        padding: 0.55em 0.75em;
        border-radius: var(--viz-border-radius-md);
        border: 1px solid var(--viz-border-subtle);
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 0.35em;

        :global(.exif-description) {
            background-color: var(--viz-surface-card);
            padding: 0;
        }
    }

    .card-row {
        display: flex;
        align-items: center;
        gap: 0.6em;
        /* Allow nested flex children to shrink when content is long */
        min-width: 0;
    }

    :global(.exif-material-icon) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        vertical-align: middle;
        font-size: 1.5em;
    }

    .card-values {
        display: flex;
        flex-direction: column;
        gap: 0.1em;
        justify-content: center;

        /* Flex items inside a row often need a min-width:0 so long text can
		   be ellipsized instead of forcing the container to overflow */
        min-width: 0;
        flex: 1 1 auto;
    }

    .name-row {
        display: flex;
        align-items: center;
        gap: 0.4em;
        min-width: 0;
    }

    .name-row > :global(.value-big) {
        flex: 1 1 auto;
        min-width: 0;
        padding: 0.25rem 0;
    }

    .name-row > :global(.input-container) {
        flex: 1 1 auto;
        min-width: 0;
        padding: 0;
        width: auto;
    }

    .name-row :global(input.value-big) {
        width: auto;
        max-width: 100%;
        field-sizing: content;
        min-height: 0;
        height: auto;
        padding: 0.25rem 0;
        background-color: var(--viz-surface-panel);
        box-shadow: inset 0 -1px 0 0 var(--viz-primary);
        border: none;
    }

    .copy-filename-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.15em;
        border-radius: var(--viz-border-radius-sm);
        opacity: 0;
        transition: opacity 120ms ease;
        flex-shrink: 0;
        color: var(--viz-text-muted);
    }

    .card-row:hover .copy-filename-btn {
        opacity: 1;
    }

    .copy-filename-btn:hover {
        color: var(--viz-text-primary);
        background: var(--viz-surface-hover);
    }

    :global(.file-type-badge) {
        display: inline-block;
        font-size: var(--viz-font-size-sm);
        font-weight: 600;
        font-family: var(--viz-mono-font);
        letter-spacing: 0.04em;
        padding: 0.1em 0.45em;
        border-radius: var(--viz-border-radius-sm);
        background: var(--viz-surface-hover);
        color: var(--viz-text-primary);
        border: 1px solid var(--viz-border-subtle);
    }

    .value-sub {
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    :global(.value-big) {
        font-size: var(--viz-font-size-std);
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--viz-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .rating-container {
        margin-top: var(--viz-spacing-std);
        padding: var(--viz-spacing-sm) var(--viz-spacing-std) var(--viz-spacing-sm) var(--viz-spacing-std);
        background: var(--viz-surface-card);
        border-radius: var(--viz-border-radius-md);
        display: flex;
        align-items: center;
        gap: 0.5em;
        border: 1px solid var(--viz-border-subtle);
    }
</style>
