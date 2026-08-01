<script lang="ts">
    import type { Setting } from "$lib/api";
    import JsonInput from "./inputs/JsonInput.svelte";
    import SelectInput from "./inputs/SelectInput.svelte";
    import SliderToggleInput from "./inputs/SliderToggleInput.svelte";
    import TextInput from "./inputs/TextInput.svelte";

    interface Props {
        settings: Setting[];
        dirtySettings: Record<string, string>;
        saving: boolean;
        saveStatus: "idle" | "success" | "error";
    }

    let {
        settings,
        dirtySettings = $bindable(),
        saving = $bindable(false),
        saveStatus = $bindable("idle")
    }: Props = $props();

    function formatLabel(name: string): string {
        return name
            .replace(/^[a-z]+_/, "")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    function getToggleValue(settingName: string, originalValue: string): "on" | "off" {
        const val = dirtySettings[settingName] ?? originalValue;
        return val === "true" ? "on" : "off";
    }

    function handleSettingChange(setting: Setting, newValue: any) {
        // If the new value matches the original value, remove from dirty list
        if (String(newValue) === setting.value) {
            const newDirty = { ...dirtySettings };
            delete newDirty[setting.name];
            dirtySettings = newDirty;
        } else {
            dirtySettings = {
                ...dirtySettings,
                [setting.name]: String(newValue)
            };
        }

        saveStatus = "idle";
    }
</script>

{#if settings.length === 0}
    <div class="empty-state">No settings available in this group.</div>
{:else}
    <div class="settings-card">
        {#each settings as setting, i (setting.name)}
            <div class="setting-item" class:last-item={i === settings.length - 1}>
                {#if setting.value_type === "boolean"}
                    {@const currentVal = getToggleValue(setting.name, setting.value)}
                    <SliderToggleInput
                        label={setting.display_name?.trim() ? setting.display_name : formatLabel(setting.name)}
                        description={setting.description}
                        value={currentVal}
                        disabled={!setting.is_user_editable || saving}
                        onchange={(val) => {
                            const newVal = val === "on" ? "true" : "false";
                            handleSettingChange(setting, newVal);
                        }}
                    />
                {:else if setting.value_type === "enum"}
                    <SelectInput
                        label={setting.display_name?.trim() ? setting.display_name : formatLabel(setting.name)}
                        description={setting.description}
                        value={dirtySettings[setting.name] ?? setting.value}
                        options={setting.allowed_values || []}
                        disabled={!setting.is_user_editable || saving}
                        onchange={(val) => handleSettingChange(setting, val)}
                    />
                {:else if setting.value_type === "integer"}
                    <TextInput
                        type="number"
                        label={setting.display_name?.trim() ? setting.display_name : formatLabel(setting.name)}
                        description={setting.description}
                        value={dirtySettings[setting.name] ?? setting.value}
                        disabled={!setting.is_user_editable || saving}
                        onchange={(val) => handleSettingChange(setting, val)}
                    />
                {:else if setting.value_type === "json"}
                    <JsonInput
                        label={setting.display_name?.trim() ? setting.display_name : formatLabel(setting.name)}
                        description={setting.description}
                        value={dirtySettings[setting.name] ?? setting.value}
                        disabled={!setting.is_user_editable || saving}
                        onchange={(val) => handleSettingChange(setting, val)}
                    />
                {:else}
                    <TextInput
                        type="text"
                        label={setting.display_name?.trim() ? setting.display_name : formatLabel(setting.name)}
                        description={setting.description}
                        value={dirtySettings[setting.name] ?? setting.value}
                        disabled={!setting.is_user_editable || saving}
                        onchange={(val) => handleSettingChange(setting, val)}
                    />
                {/if}
            </div>
        {/each}
    </div>
{/if}

<style lang="scss">
    .settings-card {
        display: flex;
        flex-direction: column;
        width: 100%;
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        overflow: hidden;
    }

    .setting-item {
        width: 100%;
        border-bottom: var(--viz-border-thin);

        &.last-item {
            border-bottom: none;
        }
    }

    .empty-state {
        padding: var(--viz-spacing-xxl);
        text-align: center;
        color: var(--viz-text-secondary);
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        font-family: var(--viz-display-font);
    }
</style>
