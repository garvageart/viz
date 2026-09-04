<script lang="ts">
    import type { ImageAsset, Label } from "@viz/api";
    import { updateImage } from "@viz/api";
    import ImageLabelViewer from "$lib/components/image-tools/ImageLabelViewer.svelte";
    import StarRating from "$lib/components/image-tools/StarRating.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import DatePicker from "$lib/components/ui/DatePicker.svelte";
    import EditableText from "$lib/components/ui/EditableText.svelte";
    import Favourite from "$lib/components/ui/Favourite.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import TextArea from "$lib/components/ui/TextArea.svelte";
    import NoImageSelected from "$lib/components/ui/misc/NoImageSelected.svelte";
    import { LabelColours } from "$lib/images/constants";
    import { setRating } from "$lib/images/exif";
    import { SelectionScope, selectionManager } from "$lib/states/selection.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import {
        formatBytes,
        getFlashMode,
        getImageLabel,
        getImageMegapixels,
        getTakenAt,
        getWhiteBalance,
        isAssetImage
    } from "$lib/utils/images";
    import { copyToClipboard } from "$lib/utils/misc";

    interface Props {
        asset?: ImageAsset;
        show?: boolean;
        showCloseIcon?: boolean;
        showTitle?: boolean;
        onImageUpdated?: (updatedAsset: ImageAsset) => void;
    }

    let {
        asset,
        show = $bindable(false),
        showCloseIcon = $bindable(false),
        showTitle = $bindable(true),
        onImageUpdated
    }: Props = $props();

    let activeScope = $derived(selectionManager.activeScope as SelectionScope<ImageAsset>);
    // Only actual images count as the current asset; a selected collection must
    // not be rendered as image metadata (which caused a flicker).
    let currentAsset = $derived(asset ?? (isAssetImage(activeScope?.active) ? activeScope.active : undefined));

    let displayName = $derived(currentAsset?.name || currentAsset?.image_metadata?.file_name || "");
    let calendarOpen = $state(false);

    async function saveName(newName: string) {
        if (!currentAsset) {
            return;
        }

        const trimmed = newName.trim();

        if (trimmed !== (currentAsset.name ?? "")) {
            currentAsset.name = trimmed;
            onImageUpdated?.(currentAsset);

            try {
                await updateImage(currentAsset.uid, { name: trimmed });
            } catch (err) {
                const nameErr = err as Error;
                toasts.add({
                    type: "error",
                    title: "Failed to update name",
                    message: nameErr.message
                });
            }
        }
    }

    function copyFilename() {
        copyToClipboard(displayName);
        toasts.add({
            type: "success",
            title: displayName,
            message: "Name copied to clipboard",
            timeout: 2000
        });
    }

    async function saveDescription() {
        if (!currentAsset) {
            return;
        }

        const trimmed = (currentAsset.description ?? "").trim();
        onImageUpdated?.(currentAsset);

        try {
            await updateImage(currentAsset.uid, { description: trimmed });
        } catch (err) {
            const descErr = err as Error;
            toasts.add({
                type: "error",
                title: "Failed to update description",
                message: descErr.message
            });
        }
    }

    function handleDescriptionKeydown(e: KeyboardEvent) {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLTextAreaElement)?.blur();
            saveDescription();
        }
    }

    // TODO(user-setting): Make timezone display configurable (IANA name vs abbreviation vs offset).
    // `timeZoneName: "short"` varies by locale — some return the abbreviation (SAST),
    // others return the offset (GMT+2). Let the user pick their preference.
    function getTimezoneAbbreviation(): string {
        const parts = new Intl.DateTimeFormat("en", { timeZoneName: "short" }).formatToParts();
        return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    }

    // TODO(backend): Add taken_at / file_created_at to ImageUpdate so the
    // calendar date+time picker can persist changes to the server.
    function handleDateChange(newDate: Date) {
        if (!currentAsset) {
            return;
        }

        currentAsset.taken_at = newDate.toISOString();
    }

    let starRating = $derived<number | null>(currentAsset?.image_metadata?.rating ?? null);
    let updatingRating = $state(false);

    async function setImageRating(newRating: number | null) {
        if (updatingRating || !currentAsset) {
            return;
        }

        updatingRating = true;
        const prev = starRating;
        try {
            const newSuccessfulRating = await setRating(currentAsset, prev, newRating);

            if (currentAsset.image_metadata) {
                currentAsset.image_metadata = {
                    ...currentAsset.image_metadata,
                    rating: newSuccessfulRating
                };

                onImageUpdated?.(currentAsset);
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

<div class="metadata-editor">
    {#if showTitle || showCloseIcon}
        <div class="metadata-header">
            {#if showTitle}
                <h3>Metadata</h3>
            {/if}
            {#if showCloseIcon}
                <Button iconName="close" class="metadata-close-btn" title="Close" onclick={() => (show = false)} />
            {/if}
        </div>
    {/if}
    {#if currentAsset}
        <!-- 
            NOTE (Table Option 4): In the future, for comprehensive technical EXIF / IPTC / XMP raw inspection tabs, 
            consider rendering key-value technical metadata using <Table name="asset-exif-metadata" density="compact"> 
            with sortable tags, search filtering, and copy-to-clipboard actions.
        -->
        <div class="metadata-exif-container">
            <div class="exif-cards">
                <div class="exif-card">
                    <div class="card-row main-row">
                        <MaterialIcon iconName="image" class="exif-material-icon" />
                        <div class="card-values">
                            <div class="name-row">
                                <EditableText
                                    value={displayName}
                                    class="value-big-wrapper"
                                    inputClass="value-big"
                                    textClass="value-big"
                                    onsave={saveName}
                                />
                                <Button
                                    class="copy-filename-btn"
                                    title="Copy filename"
                                    iconName="content_copy"
                                    onclick={copyFilename}
                                />
                                {#if currentAsset?.image_metadata?.file_type}
                                    <Badge variant="default" class="file-type-badge">
                                        {currentAsset.image_metadata.file_type.replace("image/", "").toUpperCase()}
                                    </Badge>
                                {/if}
                            </div>
                        </div>
                    </div>
                    <DatePicker
                        value={getTakenAt(currentAsset)}
                        bind:open={calendarOpen}
                        onchange={(d) => handleDateChange(d)}
                    >
                        {#snippet children()}
                            <div class="card-row meta-row" role="button">
                                <MaterialIcon iconName="calendar_today" class="exif-material-icon" />
                                <div class="card-values">
                                    <div class="value-big">
                                        {getTakenAt(currentAsset).toLocaleDateString(undefined, {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric"
                                        })}
                                    </div>
                                    <div class="value-sub">
                                        {getTakenAt(currentAsset).toLocaleTimeString(undefined, {
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
                <!-- Camera/Exposure card -->
                <div class="exif-card">
                    <div class="card-row main-row">
                        <div class="card-values">
                            {#if currentAsset?.exif?.model && currentAsset?.exif?.make}
                                <div class="value-big">
                                    {currentAsset.exif.make}
                                    {currentAsset.exif.model.replace(new RegExp(`^${currentAsset.exif.make} `), "")}
                                </div>
                            {:else}
                                <div class="value-big">Unknown Camera</div>
                            {/if}

                            {#if currentAsset?.exif?.lens_model}
                                <div class="value-sub">
                                    {currentAsset.exif.lens_model}
                                </div>
                            {:else}
                                <div class="value-sub">Unknown Lens Make</div>
                            {/if}

                            {#if currentAsset?.exif?.focal_length}
                                <div class="value-sub">
                                    {currentAsset.exif.focal_length}
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
                                    {currentAsset?.exif?.f_number ?? currentAsset?.exif?.aperture ?? "—"}
                                </div>
                                <div class="value-sub">
                                    {currentAsset?.exif?.exposure_time ?? "—"}
                                </div>
                            </div>
                        </div>
                        <div class="card-row meta-row">
                            <MaterialIcon iconName="tune" class="exif-material-icon" />
                            <div class="card-values">
                                <div class="value-sub">
                                    ISO {currentAsset?.exif?.iso ?? "—"}
                                </div>
                                <div class="value-sub">
                                    {currentAsset?.exif?.exposure_value ?? "—"}
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
                                    Flash {getFlashMode(currentAsset?.exif?.flash) ?? "—"}
                                </div>
                            </div>
                        </div>
                        {#if currentAsset?.exif?.white_balance}
                            <div class="card-row meta-row">
                                <MaterialIcon iconName="light_mode" class="exif-material-icon" />
                                <div class="card-values">
                                    <div class="value-sub">
                                        {getWhiteBalance(currentAsset.exif.white_balance)}
                                        {#if currentAsset?.exif?.color_temperature}
                                            &nbsp;· {currentAsset.exif.color_temperature}K
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
                                    {currentAsset?.width} x {currentAsset?.height}
                                </div>
                            </div>
                        </div>
                        <div class="card-row main-row">
                            <MaterialIcon iconName="aspect_ratio" class="exif-material-icon" />
                            <div class="card-values">
                                <div class="value-sub">
                                    {getImageMegapixels(currentAsset)} MP
                                </div>
                                <div class="value-sub">
                                    {formatBytes(currentAsset.image_metadata?.file_size) ?? "—"}
                                </div>
                            </div>
                        </div>
                        <div class="card-row meta-row">
                            <MaterialIcon iconName="palette" class="exif-material-icon" />
                            <div class="card-values">
                                <div class="value-sub">
                                    {currentAsset?.image_metadata?.color_space ?? "—"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="rating-container">
                <ImageLabelViewer
                    variant="compact"
                    label={getImageLabel(currentAsset)}
                    onSelect={(selectedLabel) => {
                        const entry = Object.entries(LabelColours).find(([_, colour]) => colour === selectedLabel);
                        const labelToSend = entry ? (entry[0] as Label) : null;
                        if (currentAsset.image_metadata) {
                            currentAsset.image_metadata = {
                                ...currentAsset.image_metadata,
                                label: labelToSend
                            };
                        }
                    }}
                />
                <StarRating value={starRating} onChange={setImageRating} />
                {#if currentAsset.favourited}
                    <Favourite size="1.3rem" />
                {/if}
            </div>
            <!-- Description -->
            <div class="exif-card description">
                <TextArea
                    class="exif-description"
                    placeholder="Add a description"
                    title={currentAsset.description}
                    bind:value={currentAsset.description}
                    spellcheck="false"
                    rows={5}
                    minHeight="5rem"
                    maxHeight="16rem"
                    resize="none"
                    onblur={saveDescription}
                    onkeydown={handleDescriptionKeydown}
                />
            </div>
        </div>
    {:else}
        <NoImageSelected message="No image selected" />
    {/if}
</div>

<style lang="scss">
    .metadata-editor {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
        padding: var(--viz-spacing-std);
        color: var(--viz-text-primary);
        height: 100%;
        width: auto;
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
        padding-bottom: var(--viz-spacing-sm);
        border-bottom: 1px solid var(--viz-border-subtle);
        gap: 0.5em;
    }

    .metadata-exif-container {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
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

    .name-row > :global(.value-big-wrapper),
    .name-row > :global(.value-big) {
        flex: 1 1 auto;
        min-width: 0;
        padding: 0.25rem 0;
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
        padding: var(--viz-spacing-sm) var(--viz-spacing-std) var(--viz-spacing-sm) var(--viz-spacing-std);
        background: var(--viz-surface-card);
        border-radius: var(--viz-border-radius-md);
        display: flex;
        align-items: center;
        gap: 0.5em;
        border: 1px solid var(--viz-border-subtle);
    }
</style>
