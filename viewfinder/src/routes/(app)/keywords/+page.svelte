<script lang="ts">
    import EntityView from "#lib/components/grid/EntityView.svelte";
    import ConfirmationModal from "#lib/components/modals/ConfirmationModal.svelte";
    import KeywordModal from "#lib/components/modals/KeywordModal.svelte";
    import { modalsManager } from "#lib/components/modals/manager/ModalManager.svelte.js";
    import Badge from "#lib/components/ui/Badge.svelte";
    import Button from "#lib/components/ui/Button.svelte";
    import SearchInput from "#lib/components/ui/SearchInput.svelte";
    import { MAX_MOBILE_WIDTH } from "#lib/constants.ts";
    import { isLayoutPage, isMobile } from "#lib/states/index.svelte.js";
    import { SelectionScopeNames } from "#lib/states/selection.svelte.ts";
    import { toasts } from "#lib/toast-notifcations/toasts.svelte.js";
    import { tryParseDate } from "#lib/utils/dates.js";
    import { invalidateViz } from "#lib/views/views.svelte.ts";
    import { type Keyword, type KeywordUpdate, createKeyword, deleteKeyword, updateKeyword } from "@viz/api";
    import { DateTime } from "luxon";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    let keywords = $derived(data.keywords);
    let searchQuery = $state("");
    let keywordToDelete = $state<Keyword>();

    let keywordMap = $derived(new Map(keywords.map((k) => [k.uid, k])));

    let filteredKeywords = $derived.by(() => {
        const query = searchQuery.trim().toLowerCase();
        let list = keywords;

        if (query) {
            list = keywords.filter((k) => {
                const matchesName = k.name.toLowerCase().includes(query);
                const parentName = k.parent ? keywordMap.get(k.parent)?.name?.toLowerCase() : "";
                const matchesParent = parentName ? parentName.includes(query) : false;
                return matchesName || matchesParent;
            });
        }

        return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    });

    let keywordPageWidth: number | undefined = $state();
    let columnCount = $derived(keywordPageWidth && keywordPageWidth <= MAX_MOBILE_WIDTH ? 2 : undefined);

    function formatDate(dateStr?: string): string {
        if (!dateStr) {
            return "—";
        }

        const dt = tryParseDate(dateStr);
        if (dt && dt.isValid) {
            return dt.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
        }

        return dateStr;
    }

    function openCreateModal() {
        modalsManager.open(
            KeywordModal,
            {
                heading: "Create Keyword",
                buttonText: "Create Keyword",
                keywords,
                modalAction: async (formData: KeywordUpdate) => {
                    const exists = keywords.some((k) => k.name.toLowerCase() === formData.name.toLowerCase());
                    if (exists) {
                        toasts.add({
                            title: "Duplicate keyword",
                            message: `A keyword named **${formData.name}** already exists`,
                            type: "warning"
                        });
                        return;
                    }

                    const res = await createKeyword({
                        name: formData.name,
                        colour: formData.colour,
                        parent: formData.parent
                    });

                    if (res.status === 201) {
                        toasts.add({
                            title: res.data.name,
                            message: "Created keyword successfully",
                            type: "success"
                        });
                        modalsManager.pop();
                        invalidateViz();
                    } else {
                        const err = res.data.error ?? "Failed to create keyword";
                        toasts.add({
                            title: "Error",
                            message: err,
                            type: "error"
                        });
                    }
                }
            },
            { heading: "Create Keyword" }
        );
    }

    function openEditModal(keyword: Keyword) {
        modalsManager.open(
            KeywordModal,
            {
                heading: "Edit Keyword",
                buttonText: "Save Changes",
                data: keyword,
                keywords,
                modalAction: async (formData: KeywordUpdate) => {
                    const exists = keywords.some(
                        (k) => k.uid !== keyword.uid && k.name.toLowerCase() === formData.name.toLowerCase()
                    );

                    if (exists) {
                        toasts.add({
                            title: "Duplicate keyword",
                            message: `A keyword named **${formData.name}** already exists`,
                            type: "warning"
                        });

                        return;
                    }

                    const res = await updateKeyword(keyword.uid, {
                        name: formData.name,
                        colour: formData.colour,
                        parent: formData.parent
                    });

                    if (res.status === 200) {
                        toasts.add({
                            title: res.data.name,
                            message: "Updated keyword successfully",
                            type: "success"
                        });

                        modalsManager.pop();
                        invalidateViz();
                    } else {
                        const err = (res.data as { error?: string })?.error ?? "Failed to update keyword";
                        toasts.add({
                            title: "Error",
                            message: err,
                            type: "error"
                        });
                    }
                }
            },
            { heading: "Edit Keyword" }
        );
    }

    function openDeleteModal(keyword: Keyword) {
        keywordToDelete = keyword;

        modalsManager.open(
            ConfirmationModal,
            {
                title: "Delete Keyword",
                confirmText: "Delete",
                buttonVariant: "danger",
                onConfirm: async () => {
                    if (!keywordToDelete) {
                        return;
                    }

                    const res = await deleteKeyword(keywordToDelete.uid);
                    if (res.status === 204) {
                        toasts.add({
                            title: keywordToDelete.name,
                            message: "Deleted keyword successfully",
                            type: "success"
                        });

                        invalidateViz();
                    } else if (res.status === 404) {
                        toasts.add({
                            message: "Keyword not found. It may have already been deleted.",
                            type: "info"
                        });

                        invalidateViz();
                    }
                },
                children: deleteConfirmSnippet
            },
            { heading: "Delete Keyword" }
        );
    }
</script>

{#snippet deleteConfirmSnippet()}
    {#if keywordToDelete}
        <div class="delete-confirm-content">
            <span>
                Are you sure you want to delete keyword <strong>{keywordToDelete.name}</strong>? This cannot be undone.
            </span>
        </div>
    {/if}
{/snippet}

<svelte:head>
    {#if !isLayoutPage()}
        <title>Keywords</title>
    {/if}
</svelte:head>

{#snippet keywordSnippet(keyword: Keyword)}
    <div class="keyword-card" data-keyword-name={keyword.name}>
        <div class="card-header">
            <div class="keyword-title-wrap">
                <span class="keyword-name">{keyword.name}</span>
            </div>
            <div class="card-actions">
                <Button
                    class="keyword-edit-btn"
                    iconName="edit"
                    size="small"
                    variant="ghost"
                    onclick={() => openEditModal(keyword)}
                    title="Edit Keyword"
                    aria-label="Edit Keyword"
                />
                <Button
                    class="keyword-delete-btn"
                    iconName="delete"
                    size="small"
                    variant="ghost"
                    onclick={() => openDeleteModal(keyword)}
                    title="Delete Keyword"
                    aria-label="Delete Keyword"
                />
            </div>
        </div>

        <div class="card-body">
            <div class="parent-chip">
                <Badge variant="info" size="small" weight="regular" title="Parent Keyword" aria-label="Parent Keyword">
                    <span>{!keyword.parent ? "Root" : keywordMap.get(keyword.parent)?.name}</span>
                </Badge>
            </div>
        </div>

        <div class="card-footer">
            <span class="created-date">{formatDate(keyword.created_at)}</span>
            {#if keyword.colour}
                <span class="colour-dot" style="background-color: {keyword.colour};"></span>
            {/if}
        </div>
    </div>
{/snippet}

<div class="keywords-page" bind:clientWidth={keywordPageWidth}>
    <div id="viz-info-container" class:std-route={!isLayoutPage()}>
        <div id="keywords-header-row">
            <div id="keywords-name-container">
                <span id="keywords-title">Keywords</span>
            </div>
            <div id="keywords-meta-chips">
                <Badge pill={true} iconFill={true} weight="regular" variant="info" iconName="label" iconSize="1.5rem">
                    <span>{keywords.length} {keywords.length === 1 ? "keyword" : "keywords"}</span>
                </Badge>
            </div>
        </div>
    </div>

    <div class="keywords-toolbar">
        <div class="toolbar-search">
            <SearchInput
                inputId="keywords-search"
                placeholder="Search keywords..."
                bind:value={searchQuery}
                autocomplete="off"
            />
        </div>
        <div class="toolbar-actions">
            <Button
                id="keywords-create-btn"
                iconName="add"
                variant="primary"
                onclick={openCreateModal}
                title="Create Keyword"
                aria-label="Create Keyword"
            >
                {#if !isMobile}
                    <span class="create-btn-text">Create Keyword</span>
                {/if}
            </Button>
        </div>
    </div>

    {#if filteredKeywords.length === 0}
        <div class="empty-state-box">
            {#if keywords.length === 0}
                <div class="empty-state-text">
                    <div class="empty-state-row">
                        <h3>Create your first keyword</h3>
                        <span>Keywords help organise and filter your image library.</span>
                    </div>
                </div>
                <Button
                    id="keywords-empty-create-btn"
                    iconName="add"
                    variant="primary"
                    onclick={openCreateModal}
                    title="Create Keyword"
                    aria-label="Create Keyword"
                >
                    <span>Create Keyword</span>
                </Button>
            {:else}
                <div class="empty-state-row">
                    <h3>No keywords found</h3>
                    <span>No keywords match <strong>{searchQuery}</strong>.</span>
                </div>
            {/if}
        </div>
    {:else}
        <EntityView
            data={filteredKeywords}
            type="grid"
            rowHeight={100}
            bind:columnCount
            scopeId={SelectionScopeNames.KEYWORDS}
            entitySnippet={keywordSnippet}
            entityGridDisplayProps={{
                style: "padding: 0;"
            }}
        />
    {/if}
</div>

<style lang="scss">
    .keywords-page {
        display: flex;
        flex-direction: column;
        flex: 1 0 auto;
        min-height: 100%;
        width: 100%;
        box-sizing: border-box;
        padding: var(--viz-spacing-lg);
        gap: var(--viz-spacing-lg);
        container-type: inline-size;
    }

    #viz-info-container {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
        width: 100%;
    }

    #keywords-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viz-spacing-md);
        flex-wrap: wrap;
    }

    #keywords-name-container {
        display: flex;
        align-items: center;
    }

    #keywords-title {
        font-size: var(--viz-font-size-5xl);
        font-family: var(--viz-display-font);
        font-weight: 700;
        color: var(--viz-text-primary);
        line-height: 1.2;
    }

    #keywords-meta-chips {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
    }

    .keywords-toolbar {
        position: sticky;
        top: 0;
        z-index: var(--viz-z-local);
        background-color: var(--viz-surface-base);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viz-spacing-md);
        flex-wrap: nowrap;
        width: 100%;
        box-sizing: border-box;
        padding: var(--viz-spacing-sm) 0;
        border-bottom: var(--viz-border-thin);
    }

    .toolbar-search {
        flex: 1;
        min-width: 0;

        :global(.search-input) {
            width: 100%;
        }
    }

    .toolbar-actions {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        flex-shrink: 0;
    }

    .keyword-card {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-sizing: border-box;
        height: 100%;
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-md);
        gap: var(--viz-spacing-sm);
        transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;

        &:hover {
            border-color: var(--viz-primary);
        }
    }

    .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viz-spacing-sm);
    }

    .keyword-title-wrap {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        min-width: 0;
    }

    .colour-dot {
        width: 1rem;
        height: 1rem;
        border-radius: var(--viz-border-radius-pill);
        border: var(--viz-border-thin);
        flex-shrink: 0;
    }

    .keyword-name {
        font-size: var(--viz-font-size-lg);
        font-weight: 600;
        color: var(--viz-text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .card-actions {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        flex-shrink: 0;
    }

    .card-body {
        display: flex;
        align-items: center;
    }

    .parent-chip {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
    }

    .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: var(--viz-border-thin);
        padding: var(--viz-spacing-xs) 0;
    }

    .created-date {
        font-size: var(--viz-font-size-xs);
        color: var(--viz-text-secondary);
    }

    .delete-confirm-content {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
    }

    .empty-state-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: var(--viz-spacing-xl) var(--viz-spacing-md);
        gap: var(--viz-spacing-md);
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);

        h3 {
            color: var(--viz-text-primary);
            margin: 0;
            font-size: var(--viz-font-size-xl);
            font-weight: 600;
        }

        .empty-state-text {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: var(--viz-spacing-sm);
        }

        .empty-state-row {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--viz-spacing-xs);
            color: var(--viz-text-secondary);

            :global(.material-symbols) {
                color: var(--viz-text-muted);
            }

            span {
                color: var(--viz-text-secondary);
                margin: 0;
            }
        }
    }

    @container (max-width: 40rem) {
        .create-btn-text {
            display: none;
        }
    }
</style>
