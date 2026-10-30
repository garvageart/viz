<script lang="ts">
    import ImageLabelViewer from "#lib/components/image-tools/ImageLabelViewer.svelte";
    import StarRating from "#lib/components/image-tools/StarRating.svelte";
    import Badge from "#lib/components/ui/Badge.svelte";
    import Button from "#lib/components/ui/Button.svelte";
    import DatePicker from "#lib/components/ui/DatePicker.svelte";
    import EditableText from "#lib/components/ui/EditableText.svelte";
    import Favourite from "#lib/components/ui/Favourite.svelte";
    import InputText from "#lib/components/ui/InputText.svelte";
    import MaterialIcon from "#lib/components/ui/MaterialIcon.svelte";
    import TextArea from "#lib/components/ui/TextArea.svelte";
    import NoImageSelected from "#lib/components/ui/misc/NoImageSelected.svelte";
    import { LabelColours } from "#lib/images/constants.js";
    import { setRating } from "#lib/images/exif.js";
    import { selectionManager } from "#lib/states/selection.svelte.js";
    import { toasts } from "#lib/toast-notifcations/toasts.svelte.js";
    import {
        formatBytes,
        formatExifTag,
        formatExifVersion,
        formatFocalLengthInfo,
        formatMeteringMode,
        formatOrientation,
        getCameraName,
        getCommonValue,
        getFlashInfo,
        getImageLabel,
        getImageMegapixels,
        getLensName,
        getLightSourceDescription,
        getSelectionKeywords,
        getShootingMode,
        getTakenAt,
        getWhiteBalanceInfo,
        isAssetImage
    } from "#lib/utils/images.js";
    import { copyToClipboard } from "#lib/utils/misc.js";
    import { type ImageAsset, type Label, batchUpdateImages, updateImage } from "@viz/api";

    const MIXED_VALUES = "Mixed Values";

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

    let activeScope = $derived(selectionManager.getActiveScope());
    let selectedImages = $derived.by(() => {
        if (asset) {
            return [asset];
        }
        const items = activeScope?.selectedItems ?? [];
        return items.filter(isAssetImage);
    });
    let isMultiSelection = $derived(selectedImages.length > 1);
    // Only actual images count as the current asset; a selected collection must
    // not be rendered as image metadata (which caused a flicker).
    //
    // fucking hell
    let currentAsset = $derived(
        asset ??
            (isAssetImage(activeScope?.anchor) && selectedImages.includes(activeScope.anchor)
                ? activeScope.anchor
                : isAssetImage(activeScope?.active) && selectedImages.includes(activeScope.active)
                  ? activeScope.active
                  : selectedImages[0])
    );

    let displayName = $derived(
        isMultiSelection
            ? `${selectedImages.length} images selected`
            : currentAsset?.name || currentAsset?.image_metadata.file_name || ""
    );
    let calendarOpen = $state(false);

    let activeMetadata = $derived({
        artist: getCommonValue(selectedImages, (img) => img.exif?.artist?.trim() || ""),
        copyright: getCommonValue(selectedImages, (img) => img.exif?.copyright?.trim() || ""),
        description: getCommonValue(selectedImages, (img) => img.description?.trim() || "")
    });

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

    async function saveArtist(newArtist: string) {
        if (!currentAsset) {
            return;
        }

        const trimmed = newArtist.trim();
        if (isMultiSelection) {
            const uids = selectedImages.map((img) => img.uid);
            try {
                await batchUpdateImages({
                    uids,
                    update: { exif: { artist: trimmed } }
                });
                for (const img of selectedImages) {
                    if (!img.exif) {
                        img.exif = {};
                    }
                    img.exif.artist = trimmed;
                    onImageUpdated?.(img);
                }
            } catch (err) {
                const artistErr = err as Error;
                toasts.add({
                    type: "error",
                    title: "Failed to update artist",
                    message: artistErr.message
                });
            }
            return;
        }

        if (!currentAsset.exif) {
            currentAsset.exif = {};
        }

        if (trimmed !== (currentAsset.exif.artist ?? "")) {
            currentAsset.exif.artist = trimmed;
            onImageUpdated?.(currentAsset);

            try {
                await updateImage(currentAsset.uid, { exif: currentAsset.exif });
            } catch (err) {
                const artistErr = err as Error;
                toasts.add({
                    type: "error",
                    title: "Failed to update artist",
                    message: artistErr.message
                });
            }
        }
    }

    async function saveCopyright(newCopyright: string) {
        if (!currentAsset) {
            return;
        }

        const trimmed = newCopyright.trim();
        if (isMultiSelection) {
            const uids = selectedImages.map((img) => img.uid);
            try {
                await batchUpdateImages({
                    uids,
                    update: { exif: { copyright: trimmed } }
                });
                for (const img of selectedImages) {
                    if (!img.exif) {
                        img.exif = {};
                    }
                    img.exif.copyright = trimmed;
                    onImageUpdated?.(img);
                }
            } catch (err) {
                const copyErr = err as Error;
                toasts.add({
                    type: "error",
                    title: "Failed to update copyright",
                    message: copyErr.message
                });
            }
            return;
        }

        if (!currentAsset.exif) {
            currentAsset.exif = {};
        }

        if (trimmed !== (currentAsset.exif.copyright ?? "")) {
            currentAsset.exif.copyright = trimmed;
            onImageUpdated?.(currentAsset);

            try {
                await updateImage(currentAsset.uid, { exif: currentAsset.exif });
            } catch (err) {
                const copyErr = err as Error;
                toasts.add({
                    type: "error",
                    title: "Failed to update copyright",
                    message: copyErr.message
                });
            }
        }
    }

    async function saveDescription() {
        if (!currentAsset) {
            return;
        }

        const trimmed = (currentAsset.description ?? "").trim();
        if (isMultiSelection) {
            const uids = selectedImages.map((img) => img.uid);
            try {
                await batchUpdateImages({
                    uids,
                    update: { description: trimmed }
                });
                for (const img of selectedImages) {
                    img.description = trimmed;
                    onImageUpdated?.(img);
                }
            } catch (err) {
                const descErr = err as Error;
                toasts.add({
                    type: "error",
                    title: "Failed to update description",
                    message: descErr.message
                });
            }
            return;
        }

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

    let starRating = $derived<number | null>(currentAsset?.image_metadata.rating ?? null);
    let updatingRating = $state(false);

    let isAddingKeyword = $state(false);
    let newKeywordInput = $state("");

    let currentKeywords = $derived.by(() => {
        if (!isMultiSelection) {
            return currentAsset?.image_metadata.keywords ?? [];
        }

        return getSelectionKeywords(selectedImages, currentAsset);
    });

    $effect(() => {
        // Track current asset UID to reset keyword input state on image switch
        void currentAsset?.uid;
        isAddingKeyword = false;
        newKeywordInput = "";
    });

    async function saveKeywords(newKeywords: string[]) {
        if (!currentAsset) {
            return;
        }

        if (isMultiSelection) {
            const uids = selectedImages.map((img) => img.uid);
            const prevKeywordsMap = new Map(selectedImages.map((img) => [img.uid, img.image_metadata?.keywords ?? []]));

            for (const img of selectedImages) {
                if (img.image_metadata) {
                    img.image_metadata.keywords = newKeywords;
                    onImageUpdated?.(img);
                }
            }

            try {
                await batchUpdateImages({
                    uids,
                    update: {
                        image_metadata: {
                            keywords: newKeywords
                        }
                    }
                });
            } catch (err) {
                for (const img of selectedImages) {
                    if (img.image_metadata) {
                        img.image_metadata.keywords = prevKeywordsMap.get(img.uid) ?? [];
                        onImageUpdated?.(img);
                    }
                }
                const keywordErr = err as Error;
                toasts.add({
                    type: "error",
                    title: "Failed to update keywords",
                    message: keywordErr.message
                });
            }
            return;
        }

        const previousKeywords = currentAsset.image_metadata.keywords ?? [];
        currentAsset.image_metadata.keywords = newKeywords;
        onImageUpdated?.(currentAsset);

        try {
            await updateImage(currentAsset.uid, {
                image_metadata: {
                    keywords: newKeywords,
                    label: currentAsset.image_metadata.label
                }
            });
        } catch (err) {
            currentAsset.image_metadata.keywords = previousKeywords;
            onImageUpdated?.(currentAsset);

            const keywordErr = err as Error;
            toasts.add({
                type: "error",
                title: "Failed to update keywords",
                message: keywordErr.message
            });
        }
    }

    async function addKeywordsFromInput(keepOpen = false) {
        if (!currentAsset) {
            return;
        }

        const trimmed = newKeywordInput.trim();
        if (!trimmed) {
            newKeywordInput = "";
            isAddingKeyword = false;
            return;
        }

        const parts = trimmed
            .split(",")
            .map((k) => {
                return k.trim();
            })
            .filter((k) => {
                return k.length > 0;
            });

        if (parts.length === 0) {
            newKeywordInput = "";
            isAddingKeyword = false;
            return;
        }

        const existing = currentKeywords;
        const lowerExisting = new Set(
            existing.map((k) => {
                return k.toLowerCase();
            })
        );

        const toAdd = parts.filter((k) => {
            return !lowerExisting.has(k.toLowerCase());
        });

        newKeywordInput = "";
        if (!keepOpen) {
            isAddingKeyword = false;
        }

        if (toAdd.length > 0) {
            const updatedKeywords = [...existing, ...toAdd];
            await saveKeywords(updatedKeywords);
        }
    }

    async function removeKeyword(keywordToRemove: string) {
        if (!currentAsset) {
            return;
        }

        const existing = currentKeywords;
        const updatedKeywords = existing.filter((k) => {
            return k !== keywordToRemove;
        });

        await saveKeywords(updatedKeywords);
    }

    function handleKeywordKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            addKeywordsFromInput(true);
        } else if (e.key === ",") {
            e.preventDefault();
            addKeywordsFromInput(true);
        } else if (e.key === "Escape") {
            e.preventDefault();
            newKeywordInput = "";
            isAddingKeyword = false;
        }
    }

    function handleKeywordBlur() {
        addKeywordsFromInput(false);
    }

    async function saveLabel(labelToSend: Label | null) {
        if (!currentAsset) {
            return;
        }

        if (isMultiSelection) {
            const uids = selectedImages.map((img) => img.uid);
            try {
                await batchUpdateImages({
                    uids,
                    update: { image_metadata: { label: labelToSend } }
                });

                for (const img of selectedImages) {
                    if (img.image_metadata) {
                        img.image_metadata.label = labelToSend;
                        onImageUpdated?.(img);
                    }
                }
            } catch (err) {
                const labelErr = err as Error;
                toasts.add({
                    type: "error",
                    title: "Failed to update label",
                    message: labelErr.message
                });
            }
            return;
        }

        if (currentAsset.image_metadata) {
            currentAsset.image_metadata.label = labelToSend;
            onImageUpdated?.(currentAsset);

            try {
                await updateImage(currentAsset.uid, {
                    image_metadata: {
                        label: labelToSend,
                        keywords: currentAsset.image_metadata.keywords
                    }
                });
            } catch (err) {
                const labelErr = err as Error;
                toasts.add({
                    type: "error",
                    title: "Failed to update label",
                    message: labelErr.message
                });
            }
        }
    }

    async function setImageRating(newRating: number | null) {
        if (updatingRating || !currentAsset) {
            return;
        }

        updatingRating = true;
        const prev = starRating;

        try {
            if (isMultiSelection) {
                const uids = selectedImages.map((img) => img.uid);
                await batchUpdateImages({
                    uids,
                    update: { image_metadata: { rating: newRating } }
                });

                for (const img of selectedImages) {
                    if (img.image_metadata) {
                        img.image_metadata.rating = newRating;
                        onImageUpdated?.(img);
                    }
                }
            } else {
                const newSuccessfulRating = await setRating(currentAsset, prev, newRating);

                if (currentAsset.image_metadata) {
                    currentAsset.image_metadata = {
                        ...currentAsset.image_metadata,
                        rating: newSuccessfulRating
                    };

                    onImageUpdated?.(currentAsset);
                }
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
                <h3>
                    Metadata
                    {#if isMultiSelection}
                        <span class="selection-count">({selectedImages.length} selected)</span>
                    {/if}
                </h3>
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
                {#snippet metaValue(
                    getter: (img: ImageAsset) => string | number | null | undefined,
                    size: "big" | "sub" = "sub"
                )}
                    {@const result = getCommonValue(selectedImages, (img) => {
                        const val = getter(img);
                        return val != null ? String(val).trim() : "";
                    })}
                    {#if result.isMixed}
                        <div class="value-{size} multiple-values">{MIXED_VALUES}</div>
                    {:else if result.value}
                        <div class="value-{size}">{result.value}</div>
                    {/if}
                {/snippet}

                <!-- File Name & Date Card -->
                <div class="exif-card">
                    <div class="card-row main-row center">
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
                                    class="copy-filename-btn"
                                    title="Copy filename"
                                    iconName="content_copy"
                                    onclick={() => {
                                        copyToClipboard(displayName);
                                        toasts.add({
                                            type: "success",
                                            title: displayName,
                                            message: "Name copied to clipboard",
                                            timeout: 2000
                                        });
                                    }}
                                />
                                {#if currentAsset?.image_metadata.file_type}
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
                            {@const dateResult = getCommonValue(selectedImages, (img) =>
                                getTakenAt(img).toDateString()
                            )}
                            <div class="card-row meta-row" role="button">
                                <MaterialIcon iconName="calendar_today" class="exif-material-icon" />
                                <div class="card-values">
                                    {#if dateResult.isMixed}
                                        <div class="value-big multiple-values">{MIXED_VALUES}</div>
                                    {:else}
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
                                    {/if}
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
                            {@render metaValue(getCameraName, "big")}
                            {@render metaValue(getLensName, "sub")}
                            {@render metaValue(
                                (img) =>
                                    [img.exif?.f_number ?? img.exif?.aperture, formatFocalLengthInfo(img).focalLength]
                                        .filter(Boolean)
                                        .join("  ·  "),
                                "big"
                            )}
                        </div>
                    </div>
                </div>

                <!-- Exposure & Lighting Card -->
                <div class="exif-card">
                    <div class="card-row main-row">
                        <MaterialIcon iconName="camera" class="exif-material-icon" />
                        <div class="card-values">
                            {@render metaValue(
                                (img) =>
                                    [
                                        img.exif?.exposure_time,
                                        img.exif?.iso ? `ISO ${img.exif.iso}` : null,
                                        img.exif?.exposure_bias_value ?? img.exif?.exposure_value
                                    ]
                                        .filter(Boolean)
                                        .join("  ·  "),
                                "big"
                            )}
                        </div>
                    </div>
                    {#if selectedImages.some((img) => getShootingMode(img))}
                        <div class="card-row meta-row">
                            <MaterialIcon iconName="settings_photo_camera" class="exif-material-icon" />
                            <div class="card-values">
                                {@render metaValue(getShootingMode, "sub")}
                            </div>
                        </div>
                    {/if}
                    {#if selectedImages.some((img) => formatMeteringMode(img.exif?.metering_mode))}
                        <div class="card-row meta-row">
                            <MaterialIcon iconName="hdr_auto" class="exif-material-icon" />
                            <div class="card-values">
                                {@render metaValue((img) => formatMeteringMode(img.exif?.metering_mode), "sub")}
                            </div>
                        </div>
                    {/if}
                    {#if selectedImages.some((img) => getFlashInfo(img))}
                        {@const flash = getFlashInfo(currentAsset)}
                        <div class="card-row meta-row">
                            <MaterialIcon
                                iconName={flash?.fired ? "flash_on" : "flash_off"}
                                class="exif-material-icon"
                            />
                            <div class="card-values">
                                {@render metaValue((img) => getFlashInfo(img)?.label, "sub")}
                            </div>
                        </div>
                    {/if}
                    {#if selectedImages.some((img) => getWhiteBalanceInfo(img))}
                        {@const wb = getWhiteBalanceInfo(currentAsset)}
                        <div class="card-row meta-row">
                            <MaterialIcon iconName={wb?.isAuto ? "wb_auto" : "wb_sunny"} class="exif-material-icon" />
                            <div class="card-values">
                                {@render metaValue((img) => getWhiteBalanceInfo(img)?.label, "sub")}
                            </div>
                        </div>
                    {/if}
                    {#if selectedImages.some((img) => getLightSourceDescription(img))}
                        <div class="card-row meta-row">
                            <MaterialIcon iconName="light_mode" class="exif-material-icon" />
                            <div class="card-values">
                                {@render metaValue(getLightSourceDescription, "sub")}
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Image & File Specifications Card -->
                <div class="exif-card">
                    <div class="card-row main-row">
                        <MaterialIcon iconName="aspect_ratio" class="exif-material-icon" />
                        <div class="card-values">
                            {@render metaValue(
                                (img) =>
                                    [
                                        img.width && img.height ? `${img.width} × ${img.height}` : null,
                                        getImageMegapixels(img) ? `${getImageMegapixels(img)} MP` : null,
                                        formatBytes(img.image_metadata.file_size)
                                    ]
                                        .filter(Boolean)
                                        .join("  ·  "),
                                "big"
                            )}
                        </div>
                    </div>
                    <div class="card-row meta-row">
                        <MaterialIcon iconName="palette" class="exif-material-icon" />
                        <div class="card-values">
                            {@render metaValue(
                                (img) =>
                                    [
                                        img.image_metadata.color_space,
                                        img.exif?.resolution,
                                        img.exif?.orientation ? formatOrientation(img.exif.orientation) : null
                                    ]
                                        .filter(Boolean)
                                        .join("  ·  "),
                                "sub"
                            )}
                        </div>
                    </div>
                </div>

                <!-- Ratings & Labels Toolbar -->
                <div class="rating-container">
                    <ImageLabelViewer
                        variant="compact"
                        label={getImageLabel(currentAsset)}
                        onSelect={(selectedLabel) => {
                            const entry = Object.entries(LabelColours).find(([_, colour]) => {
                                return colour === selectedLabel;
                            });
                            const labelToSend = entry ? (entry[0] as Label) : null;
                            saveLabel(labelToSend);
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
                        <div class="card-row main-row center">
                            <MaterialIcon iconName="location_on" class="exif-material-icon" />
                            <div class="card-values">
                                <div class="name-row">
                                    <div class="value-big">
                                        {currentAsset.exif.latitude}, {currentAsset.exif.longitude}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        class="copy-filename-btn"
                                        title="Copy coordinates"
                                        iconName="content_copy"
                                        onclick={() => {
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
                                        }}
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

                <!-- Keywords / Tags -->
                <div class="exif-card keywords-card">
                    <div class="card-row main-row center">
                        <MaterialIcon iconName="sell" class="exif-material-icon" />
                        <div class="keywords-list">
                            {#each currentKeywords as keyword (keyword)}
                                <Badge size="small" class="keyword-badge">
                                    <Button
                                        variant="ghost"
                                        size="mini"
                                        iconName="close"
                                        class="keyword-remove-btn"
                                        title="Remove Keyword"
                                        aria-label="Remove Keyword"
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            removeKeyword(keyword);
                                        }}
                                    />
                                    <span class="keyword-text">{keyword}</span>
                                </Badge>
                            {/each}
                            <div class="keyword-action-slot">
                                {#if isAddingKeyword}
                                    <InputText
                                        bind:value={newKeywordInput}
                                        focused={isAddingKeyword}
                                        placeholder="Add Keyword..."
                                        class="keyword-input"
                                        onkeydown={handleKeywordKeydown}
                                        onblur={handleKeywordBlur}
                                    />
                                {:else}
                                    <Button
                                        variant="primary"
                                        size="small"
                                        iconName="add"
                                        iconSize="1rem"
                                        class="add-keyword-btn"
                                        title="Add Keyword"
                                        onclick={() => {
                                            isAddingKeyword = true;
                                        }}
                                    >
                                        {currentKeywords.length === 0 ? "Add Keyword" : "Add"}
                                    </Button>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Software & Integrity Card -->
                {#if selectedImages.some((img) => img.exif?.software || img.exif?.exif_version || img.image_metadata?.checksum)}
                    <div class="exif-card horizontal">
                        {#if selectedImages.some((img) => img.exif?.software || img.exif?.exif_version)}
                            <div class="card-row meta-row center">
                                <MaterialIcon iconName="desktop_landscape" class="exif-material-icon" />
                                <div class="card-values">
                                    {@render metaValue(
                                        (img) =>
                                            [img.exif?.software, formatExifVersion(img.exif?.exif_version)]
                                                .filter(Boolean)
                                                .join("  ·  "),
                                        "sub"
                                    )}
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}

                <!-- Artist, Copyright & Description / Comments Card -->
                <div class="exif-card">
                    <div class="card-row main-row">
                        <MaterialIcon iconName="person" class="exif-material-icon" />
                        <div class="card-values">
                            <div class="name-row">
                                <EditableText
                                    value={activeMetadata.artist.isMixed ? "" : (activeMetadata.artist.value ?? "")}
                                    placeholder={activeMetadata.artist.isMixed ? MIXED_VALUES : "Add artist"}
                                    class="value-big-wrapper"
                                    inputClass="value-big"
                                    textClass="value-big"
                                    onsave={saveArtist}
                                />
                            </div>
                        </div>
                    </div>
                    <div class="card-row main-row">
                        <MaterialIcon iconName="copyright" class="exif-material-icon" />
                        <div class="card-values">
                            <div class="name-row">
                                <EditableText
                                    value={activeMetadata.copyright.isMixed
                                        ? ""
                                        : (activeMetadata.copyright.value ?? "")}
                                    placeholder={activeMetadata.copyright.isMixed ? MIXED_VALUES : "Add copyright"}
                                    class="value-big-wrapper"
                                    inputClass="value-big"
                                    textClass="value-big"
                                    onsave={saveCopyright}
                                />
                            </div>
                        </div>
                    </div>
                    <div class="card-row main-row">
                        <MaterialIcon iconName="description" class="exif-material-icon" />
                        <div class="card-values">
                            <div class="name-row">
                                <TextArea
                                    class="exif-description"
                                    placeholder={activeMetadata.description.isMixed
                                        ? MIXED_VALUES
                                        : "Add a description"}
                                    title={activeMetadata.description.value ?? ""}
                                    value={activeMetadata.description.isMixed
                                        ? ""
                                        : (activeMetadata.description.value ?? "")}
                                    spellcheck="false"
                                    rows={3}
                                    minHeight="3.5rem"
                                    maxHeight="16rem"
                                    resize="none"
                                    onblur={(e) => {
                                        const newVal = (e.currentTarget as HTMLTextAreaElement).value.trim();
                                        if (activeMetadata.description.isMixed && newVal === "") {
                                            return;
                                        }
                                        currentAsset.description = newVal;
                                        saveDescription();
                                    }}
                                    onkeydown={handleDescriptionKeydown}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {#snippet extendedMetadataItem(item: { key: string; label: string; value: string })}
                    <div
                        class="extended-exif-row"
                        role="button"
                        tabindex="0"
                        title="Click to copy"
                        onclick={() => {
                            copyToClipboard(item.value);
                            toasts.add({
                                type: "success",
                                title: item.label,
                                message: "Copied to clipboard",
                                timeout: 2000
                            });
                        }}
                        onkeydown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                copyToClipboard(item.value);
                                toasts.add({
                                    type: "success",
                                    title: item.label,
                                    message: "Copied to clipboard",
                                    timeout: 2000
                                });
                            }
                        }}
                    >
                        <span class="extended-label" title={item.label}>{item.label}</span>
                        <div class="extended-value-wrapper">
                            <span class="extended-value">{item.value}</span>
                            <span class="copy-overlay">Copy</span>
                        </div>
                    </div>
                {/snippet}
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
                                {@render extendedMetadataItem(item)}
                            {/each}
                        </div>
                    </div>
                {/if}

                <div class="exif-card">
                    {@render extendedMetadataItem({
                        key: "checksum",
                        value: currentAsset?.image_metadata.checksum,
                        label: "Checksum"
                    })}
                </div>
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
        gap: var(--viz-spacing-sm);

        h3 {
            display: inline-flex;
            align-items: baseline;
            gap: var(--viz-spacing-xs);
            margin: 0;
            padding: 0;
        }

        .selection-count {
            font-size: var(--viz-font-size-sm);
            font-weight: 400;
            color: var(--viz-text-secondary);
        }
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

        &.horizontal {
            flex-direction: row;
            align-items: center;
        }

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

        &.center {
            align-items: center;
        }
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

    .multiple-values {
        color: var(--viz-text-secondary);
        font-style: italic;
    }

    .rating-container {
        padding: var(--viz-spacing-sm) var(--viz-spacing-std) var(--viz-spacing-sm) var(--viz-spacing-std);
        background: var(--viz-surface-card);
        border-radius: var(--viz-border-radius-md);
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        border: 1px solid var(--viz-border-subtle);
    }

    /* Not a big fan of these large ass overides but I can live with it for now */
    .keywords-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--viz-spacing-sm);
        align-items: center;

        :global(.keyword-badge) {
            display: inline-flex;
            align-items: center;
            flex-shrink: 0;
        }

        :global(.keyword-remove-btn) {
            line-height: 1;
        }

        .keyword-action-slot {
            display: inline-flex;
            align-items: center;
            flex: 1 1 40%;
            min-width: 40%;

            :global(.add-keyword-btn) {
                font-size: var(--viz-font-size-sm);
                line-height: 1;
                border-radius: var(--viz-border-radius-md);
                padding: var(--viz-spacing-xxs) var(--viz-spacing-xs);
                gap: var(--viz-spacing-xs);
                box-sizing: border-box;
            }

            :global(.input-container) {
                width: 100%;
            }

            :global(.input-container input:not([type="submit"])) {
                min-height: 0;
                font-size: var(--viz-font-size-sm);
                line-height: 1;
                padding: var(--viz-spacing-xxs) var(--viz-spacing-xs);
                box-sizing: border-box;
            }
        }
    }

    .keyword-text {
        user-select: text;
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
        top: 0;
        bottom: 0;
        margin: auto 0;
        height: fit-content;
        font-size: var(--viz-font-size-sm);
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
