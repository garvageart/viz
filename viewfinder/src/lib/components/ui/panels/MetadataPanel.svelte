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
        formatExifTag,
        formatExifVersion,
        formatFocalLengthInfo,
        formatMeteringMode,
        formatOrientation,
        getCameraName,
        getFlashInfo,
        getImageLabel,
        getImageMegapixels,
        getLensName,
        getLightSourceDescription,
        getShootingMode,
        getTakenAt,
        getWhiteBalanceInfo,
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

    let rawExifEntries = $derived.by(() => {
        const raw = currentAsset?.exif?.raw;
        if (!raw) {
            return [];
        }

        return Object.entries(raw)
            .map(([key, value]) => ({
                key,
                label: formatExifTag(key),
                value: String(value).trim()
            }))
            .filter((entry) => entry.value !== "")
            .sort((a, b) => a.label.localeCompare(b.label));
    });

    function copyExtendedValue(label: string, value: string) {
        copyToClipboard(value);
        toasts.add({
            type: "success",
            title: label,
            message: "Copied to clipboard",
            timeout: 2000
        });
    }

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

    function copyCoordinates() {
        if (!currentAsset?.exif?.latitude || !currentAsset?.exif?.longitude) {
            return;
        }

        const coords = `${currentAsset.exif.latitude}, ${currentAsset.exif.longitude}`;
        copyToClipboard(coords);
        toasts.add({
            type: "success",
            title: coords,
            message: "Coordinates copied to clipboard",
            timeout: 2000
        });
    }

    function copyChecksum() {
        if (!currentAsset?.image_metadata?.checksum) {
            return;
        }

        copyToClipboard(currentAsset.image_metadata.checksum);
        toasts.add({
            type: "success",
            title: "Checksum",
            message: "Checksum copied to clipboard",
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
    // others return the offset (GMT+2Let the user pick their preference.
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
                <!-- File Name & Date Card -->
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
                                    variant="ghost"
                                    size="mini"
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

                <!-- Camera & Optics Card -->
                <div class="exif-card">
                    <div class="card-row main-row">
                        <MaterialIcon iconName="photo_camera" class="exif-material-icon" />
                        <div class="card-values">
                            <div class="value-big">{getCameraName(currentAsset)}</div>
                            {#if getLensName(currentAsset)}
                                <div class="value-sub">{getLensName(currentAsset)}</div>
                            {/if}
                            {#if formatFocalLengthInfo(currentAsset).focalLength}
                                <div class="value-sub" title={formatFocalLengthInfo(currentAsset).focalLength}>
                                    {formatFocalLengthInfo(currentAsset).focalLength}
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- Exposure & Lighting Card -->
                <div class="exif-card">
                    <div class="card-row main-row">
                        <MaterialIcon iconName="camera" class="exif-material-icon" />
                        <div class="card-values">
                            <div class="value-big">
                                {[
                                    currentAsset.exif?.f_number ?? currentAsset.exif?.aperture,
                                    currentAsset.exif?.exposure_time,
                                    currentAsset.exif?.iso ? `ISO ${currentAsset.exif.iso}` : null,
                                    currentAsset.exif?.exposure_bias_value ?? currentAsset.exif?.exposure_value
                                ]
                                    .filter(Boolean)
                                    .join("  ·  ")}
                            </div>
                        </div>
                    </div>
                    {#if getShootingMode(currentAsset)}
                        <div class="card-row meta-row">
                            <MaterialIcon iconName="settings_photo_camera" class="exif-material-icon" />
                            <div class="card-values">
                                <div class="value-sub">
                                    {getShootingMode(currentAsset)}
                                </div>
                            </div>
                        </div>
                    {/if}
                    {#if formatMeteringMode(currentAsset.exif?.metering_mode)}
                        <div class="card-row meta-row">
                            <MaterialIcon iconName="hdr_auto" class="exif-material-icon" />
                            <div class="card-values">
                                <div class="value-sub">
                                    {formatMeteringMode(currentAsset.exif?.metering_mode)}
                                </div>
                            </div>
                        </div>
                    {/if}
                    {#if getFlashInfo(currentAsset)}
                        {@const flash = getFlashInfo(currentAsset)}
                        {#if flash}
                            <div class="card-row meta-row">
                                <MaterialIcon
                                    iconName={flash.fired ? "flash_on" : "flash_off"}
                                    class="exif-material-icon"
                                />
                                <div class="card-values">
                                    <div class="value-sub">
                                        {flash.label}
                                    </div>
                                </div>
                            </div>
                        {/if}
                    {/if}
                    {#if getWhiteBalanceInfo(currentAsset)}
                        {@const wb = getWhiteBalanceInfo(currentAsset)}
                        {#if wb}
                            <div class="card-row meta-row">
                                <MaterialIcon
                                    iconName={wb.isAuto ? "wb_auto" : "wb_sunny"}
                                    class="exif-material-icon"
                                />
                                <div class="card-values">
                                    <div class="value-sub">
                                        {wb.label}
                                    </div>
                                </div>
                            </div>
                        {/if}
                    {/if}
                    {#if getLightSourceDescription(currentAsset)}
                        <div class="card-row meta-row">
                            <MaterialIcon iconName="light_mode" class="exif-material-icon" />
                            <div class="card-values">
                                <div class="value-sub">
                                    {getLightSourceDescription(currentAsset)}
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Image & File Specifications Card -->
                <div class="exif-card">
                    <div class="card-row main-row">
                        <MaterialIcon iconName="aspect_ratio" class="exif-material-icon" />
                        <div class="card-values">
                            <div class="value-big">
                                {currentAsset?.width} × {currentAsset?.height}
                                &nbsp;· {getImageMegapixels(currentAsset)} MP &nbsp;· {formatBytes(
                                    currentAsset.image_metadata?.file_size
                                ) ?? "—"}
                            </div>
                        </div>
                    </div>
                    <div class="card-row meta-row">
                        <MaterialIcon iconName="palette" class="exif-material-icon" />
                        <div class="card-values">
                            <div class="value-sub">
                                {currentAsset?.image_metadata?.color_space ?? "sRGB"}
                                {#if currentAsset?.image_metadata?.has_icc_profile}
                                    &nbsp;(ICC Profile)
                                {/if}
                                {#if currentAsset?.exif?.resolution}
                                    &nbsp;· {currentAsset.exif.resolution}
                                {/if}
                                {#if currentAsset?.exif?.orientation}
                                    &nbsp;· {formatOrientation(currentAsset.exif.orientation)}
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Ratings & Labels Toolbar -->
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

                <!-- GPS / Geolocation Card (if present) -->
                {#if currentAsset?.exif?.latitude && currentAsset?.exif?.longitude}
                    <div class="exif-card">
                        <div class="card-row main-row">
                            <MaterialIcon iconName="location_on" class="exif-material-icon" />
                            <div class="card-values">
                                <div class="name-row">
                                    <div class="value-big">
                                        {currentAsset.exif.latitude}, {currentAsset.exif.longitude}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="mini"
                                        class="copy-filename-btn"
                                        title="Copy coordinates"
                                        iconName="content_copy"
                                        onclick={copyCoordinates}
                                    />
                                </div>
                                {#if currentAsset.exif.gps_altitude || currentAsset.exif.gps_img_direction || currentAsset.exif.gps_speed}
                                    <div class="value-sub">
                                        {[
                                            currentAsset.exif.gps_altitude
                                                ? `Altitude: ${currentAsset.exif.gps_altitude}`
                                                : null,
                                            currentAsset.exif.gps_img_direction
                                                ? `Direction: ${currentAsset.exif.gps_img_direction}° ${currentAsset.exif.gps_img_direction_ref ?? ""}`.trim()
                                                : null,
                                            currentAsset.exif.gps_speed
                                                ? `Speed: ${currentAsset.exif.gps_speed} ${currentAsset.exif.gps_speed_ref ?? "km/h"}`.trim()
                                                : null
                                        ]
                                            .filter(Boolean)
                                            .join("  ·  ")}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Keywords / Tags (if present) -->
                {#if currentAsset?.image_metadata?.keywords && currentAsset.image_metadata.keywords.length > 0}
                    <div class="exif-card keywords-card">
                        <div class="card-row main-row">
                            <MaterialIcon iconName="sell" class="exif-material-icon" />
                            <div class="keywords-list">
                                {#each currentAsset.image_metadata.keywords as keyword}
                                    <Badge variant="neutral" size="small" class="keyword-badge">{keyword}</Badge>
                                {/each}
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Software, Copyright & Integrity Card -->
                {#if currentAsset?.exif?.software || currentAsset?.exif?.copyright || currentAsset?.exif?.exif_version || currentAsset?.image_metadata?.checksum}
                    <div class="exif-card">
                        {#if currentAsset.exif?.software || currentAsset.exif?.exif_version}
                            <div class="card-row meta-row">
                                <MaterialIcon iconName="desktop_landscape" class="exif-material-icon" />
                                <div class="card-values">
                                    <div class="value-sub" title={currentAsset.exif?.software}>
                                        {[
                                            currentAsset.exif?.software,
                                            formatExifVersion(currentAsset.exif?.exif_version)
                                        ]
                                            .filter(Boolean)
                                            .join("  ·  ")}
                                    </div>
                                </div>
                            </div>
                        {/if}
                        {#if currentAsset.exif?.copyright}
                            <div class="card-row meta-row">
                                <MaterialIcon iconName="copyright" class="exif-material-icon" />
                                <div class="card-values">
                                    <div class="value-sub" title={currentAsset.exif.copyright}>
                                        {currentAsset.exif.copyright}
                                    </div>
                                </div>
                            </div>
                        {/if}
                        {#if currentAsset.image_metadata?.checksum}
                            <div class="card-row meta-row">
                                <MaterialIcon iconName="tag" class="exif-material-icon" />
                                <div class="card-values">
                                    <div class="name-row">
                                        <div class="value-sub mono-text" title={currentAsset.image_metadata.checksum}>
                                            {currentAsset.image_metadata.checksum.slice(0, 16)}…
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="mini"
                                            class="copy-filename-btn"
                                            title="Copy checksum"
                                            iconName="content_copy"
                                            onclick={copyChecksum}
                                        />
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}

                <!-- Description Card -->
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
                <!-- Extended EXIF Card (if raw map present) -->
                {#if rawExifEntries.length > 0}
                    <div class="exif-card extended-exif-card">
                        <div class="card-row main-row">
                            <MaterialIcon iconName="list_alt" class="exif-material-icon" />
                            <div class="card-values">
                                <div class="value-big">EXIF</div>
                            </div>
                        </div>
                        <div class="extended-exif-list">
                            {#each rawExifEntries as item (item.key)}
                                <div
                                    class="extended-exif-row"
                                    role="button"
                                    tabindex="0"
                                    title="Click to copy"
                                    onclick={() => copyExtendedValue(item.label, item.value)}
                                    onkeydown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            copyExtendedValue(item.label, item.value);
                                        }
                                    }}
                                >
                                    <span class="extended-label" title={item.label}>{item.label}</span>
                                    <div class="extended-value-wrapper">
                                        <span class="extended-value">{item.value}</span>
                                        <span class="copy-overlay">Copy</span>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
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
        align-items: flex-start;
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
        flex-shrink: 0;
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

    .keywords-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--viz-spacing-xs);
        align-items: center;
        min-width: 0;
    }

    :global(.keyword-badge) {
        font-size: var(--viz-font-size-sm);
        padding: 0.15em 0.5em;
    }

    .mono-text {
        font-family: var(--viz-mono-font);
    }

    .extended-exif-list {
        display: flex;
        flex-direction: column;
        gap: 0.35em;
        padding-top: 0.4em;
        border-top: 1px solid var(--viz-border-subtle);
        margin-top: 0.2em;
    }

    .extended-exif-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75em;
        padding: 0.25em 0.4em;
        border-radius: var(--viz-border-radius-sm);
        cursor: pointer;
        user-select: none;
        transition:
            background-color 0.15s ease,
            transform 0.05s ease;

        &:hover {
            background-color: var(--viz-surface-hover);

            .copy-overlay {
                opacity: 1;
            }

            .extended-value {
                opacity: 0;
            }
        }

        &:focus-visible {
            outline: 1px solid var(--viz-border-strong, var(--viz-text-primary));
        }

        &:active {
            transform: scale(0.99);
        }
    }

    .extended-label {
        color: var(--viz-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-shrink: 0;
        max-width: 45%;
    }

    .extended-value-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.35em;
        min-width: 0;
        flex: 1 1 auto;
    }

    .extended-value {
        font-weight: 500;
        color: var(--viz-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: right;
        transition: opacity 0.15s ease;
    }

    .copy-overlay {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        font-size: var(--viz-font-size-xs);
        font-weight: 600;
        color: var(--viz-text-primary);
        background: var(--viz-surface-card);
        padding: 0.1em 0.5em;
        border-radius: var(--viz-border-radius-xs);
        border: 1px solid var(--viz-border-subtle);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease;
    }
</style>
