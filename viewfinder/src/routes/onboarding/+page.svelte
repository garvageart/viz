<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { type Setting, doUserOnboarding, getUserSettings, setupSuperadmin } from "@viz/api";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import Button from "$lib/components/ui/Button.svelte";
    import InputPassword from "$lib/components/ui/InputPassword.svelte";
    import InputSelect from "$lib/components/ui/InputSelect.svelte";
    import InputText from "$lib/components/ui/InputText.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import ProgressBar from "$lib/components/ui/ProgressBar.svelte";
    import { formatLabel } from "$lib/settings/utils";
    import { system, user } from "$lib/states/index.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import { getSafeRedirectUrl } from "$lib/utils/url";

    let isLoading = $state(false);
    let currentStep = $state(0);

    // Superadmin State
    let superadminForm = $state({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: ""
    });

    // User Onboarding State
    let userForm = $state({
        firstName: "",
        lastName: ""
    });

    let userSettings = $state<Setting[]>([]);
    let userSettingsValues = $state<Record<string, string>>({});

    // Group settings by their 'group' field
    let settingsGroups = $derived.by(() => {
        const groups: Record<string, Setting[]> = {};
        for (const s of userSettings) {
            const g = s.group || "General";
            if (!groups[g]) {
                groups[g] = [];
            }

            groups[g].push(s);
        }
        return groups;
    });

    let groupNames = $derived(Object.keys(settingsGroups).sort());

    // Logic

    async function loadUserSettings() {
        if (system.data?.user_onboarding_required) {
            isLoading = true;
            try {
                const res = await getUserSettings();
                if (res.status === 200) {
                    userSettings = res.data.filter((s) => s.is_user_editable);

                    // Pre-fill values
                    userSettings.forEach((s) => {
                        // Special handling for theme setting if it exists to match current UI state
                        if (s.name === "theme" || s.name === "default_theme") {
                            // If the user hasn't explicitly set it yet (it's using default),
                            // we might want to propose the one they are currently viewing.
                            // However, s.value might already be set from DB default.
                            userSettingsValues[s.name] = s.value || s.default_value;
                        } else {
                            userSettingsValues[s.name] = s.value || s.default_value;
                        }
                    });

                    if (user.data) {
                        userForm.firstName = user.data.first_name || "";
                        userForm.lastName = user.data.last_name || "";
                    }
                } else {
                    toasts.add({
                        message: res.data.error || "Failed to load settings.",
                        type: "error"
                    });
                }
            } catch (e) {
                console.error(e);
                toasts.add({
                    message: "An unexpected error occurred while loading settings.",
                    type: "error"
                });
            } finally {
                isLoading = false;
            }
        }
    }

    onMount(() => {
        if (system.data?.user_onboarding_required && !system.data?.needs_superadmin) {
            loadUserSettings();
        }
    });

    // Navigation Helpers
    function nextStep() {
        currentStep++;
    }

    function prevStep() {
        if (currentStep > 0) {
            currentStep--;
        }
    }

    // Actions
    async function handleSuperadminSubmit() {
        if (superadminForm.password !== superadminForm.confirmPassword) {
            toasts.add({
                message: "Passwords do not match.",
                type: "error"
            });
            return;
        }

        isLoading = true;
        try {
            const res = await setupSuperadmin({
                name: superadminForm.name.trim(),
                email: superadminForm.email.trim(),
                password: superadminForm.password,
                firstName: superadminForm.firstName.trim(),
                lastName: superadminForm.lastName.trim()
            });

            if (res.status === 201) {
                toasts.add({
                    message: "Superadmin setup complete!",
                    type: "success"
                });

                // Invalidate system state to force re-fetch of status flags
                system.fetched = false;
                system.data = null;

                goto("/");
            } else {
                toasts.add({
                    message: res.data.error || "Setup failed.",
                    type: "error"
                });
            }
        } catch (err) {
            console.error(err);
            toasts.add({
                message: "An unexpected error occurred.",
                type: "error"
            });
        } finally {
            isLoading = false;
        }
    }

    async function handleUserOnboardingSubmit() {
        isLoading = true;
        try {
            const res = await doUserOnboarding({
                first_name: userForm.firstName.trim(),
                last_name: userForm.lastName.trim(),
                settings: userSettings.map((setting) => ({
                    name: setting.name,
                    display_name: setting.display_name,
                    value: userSettingsValues[setting.name] || setting.default_value,
                    default_value: setting.default_value,
                    value_type: setting.value_type,
                    allowed_values: setting.allowed_values,
                    is_user_editable: setting.is_user_editable,
                    group: setting.group,
                    description: setting.description,
                    is_overridden:
                        userSettingsValues[setting.name] !== undefined &&
                        userSettingsValues[setting.name] !== setting.default_value
                }))
            });

            if (res.status === 200) {
                toasts.add({ message: "Welcome aboard!", type: "success" });

                // Invalidate system state to force re-fetch of status flags
                // This ensures the router knows onboarding is complete
                system.fetched = false;
                system.data = null;

                user.data = res.data;

                const continueUrl = page.url.searchParams.get("continue");
                goto(getSafeRedirectUrl(continueUrl, "/"));
            } else {
                toasts.add({
                    message: res.data.error || "Onboarding failed.",
                    type: "error"
                });
            }
        } catch (err) {
            console.error(err);
            toasts.add({
                message: "An unexpected error occurred.",
                type: "error"
            });
        } finally {
            isLoading = false;
        }
    }

    let totalSuperadminSteps = 3;
    let superadminProgressBarWidth = $derived(((currentStep + 1) / totalSuperadminSteps) * 100);

    let totalUserSteps = $derived(2 + groupNames.length);
    let userProgressBarWidth = $derived(((currentStep + 1) / totalUserSteps) * 100);
</script>

<div class="onboarding-container">
    <div class="card">
        {#if system.loading}
            <div class="loading">Loading...</div>
        {:else if !system.data?.needs_superadmin}
            <!-- SUPERADMIN FLOW -->
            <ProgressBar bind:width={superadminProgressBarWidth} />

            <div class="step-container" in:fade={{ duration: 150 }}>
                <!-- Step 0: Welcome -->
                {#if currentStep === 0}
                    <form
                        onsubmit={(e) => {
                            e.preventDefault();
                            nextStep();
                        }}
                        class="step-form"
                    >
                        <div class="step-content">
                            <div class="brand-header">
                                <span class="viz-title">viz</span>
                                <span class="brand-subtitle">digital asset manager</span>
                            </div>

                            <div class="info-box">
                                <div class="info-header">
                                    <MaterialIcon iconName="shield_person" size="1.25rem" />
                                    <span class="info-title">First User Setup</span>
                                </div>
                                <span class="info-text">
                                    As the first user, you will be granted <strong>Superadmin</strong> privileges.
                                    <br /><br />This gives you full control over system settings, libraries, and user
                                    management.
                                </span>
                                <span class="info-footer">Let's set up your administrator account.</span>
                            </div>
                        </div>
                        <div class="actions centered">
                            <Button variant="info" type="submit" iconName="arrow_forward">
                                <span>Get Started</span>
                            </Button>
                        </div>
                    </form>

                    <!-- Step 1: Account Info -->
                {:else if currentStep === 1}
                    <form
                        onsubmit={(e) => {
                            e.preventDefault();
                            if (superadminForm.name && superadminForm.email && superadminForm.password) {
                                nextStep();
                            }
                        }}
                        class="step-form"
                    >
                        <div class="step-header">
                            <span class="step-counter">Step 2 of 3</span>
                        </div>
                        <div class="step-content">
                            <div>
                                <h2 class="step-title">Account Details</h2>
                                <span class="step-subtitle">Set your administrator credentials.</span>
                            </div>
                            <InputText label="Name" bind:value={superadminForm.name} required />
                            <InputText label="Email" type="email" bind:value={superadminForm.email} required />
                            <InputPassword label="Password" bind:value={superadminForm.password} required />
                            <InputPassword
                                label="Confirm Password"
                                bind:value={superadminForm.confirmPassword}
                                required
                            />
                        </div>
                        <div class="actions">
                            <Button variant="secondary" type="button" iconName="arrow_back" onclick={prevStep}>
                                <span>Back</span>
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                iconName="arrow_forward"
                                disabled={!superadminForm.name || !superadminForm.email || !superadminForm.password}
                            >
                                <span>Next</span>
                            </Button>
                        </div>
                    </form>

                    <!-- Step 2: Profile Info -->
                {:else if currentStep === 2}
                    <form
                        onsubmit={(e) => {
                            e.preventDefault();
                            handleSuperadminSubmit();
                        }}
                        class="step-form"
                    >
                        <div class="step-header">
                            <span class="step-counter">Step 3 of 3</span>
                        </div>
                        <div class="step-content">
                            <div>
                                <h2 class="step-title">Your Profile</h2>
                                <span class="step-subtitle">Tell us a bit about yourself (optional).</span>
                            </div>
                            <InputText label="First Name" bind:value={superadminForm.firstName} />
                            <InputText label="Last Name" bind:value={superadminForm.lastName} />
                        </div>
                        <div class="actions">
                            <Button variant="secondary" type="button" iconName="arrow_back" onclick={prevStep}>
                                <span>Back</span>
                            </Button>
                            <Button variant="primary" type="submit" iconName="check" disabled={isLoading}>
                                <span>{isLoading ? "Creating Account..." : "Finish Setup"}</span>
                            </Button>
                        </div>
                    </form>
                {/if}
            </div>
        {:else if system.data?.user_onboarding_required}
            <!-- USER ONBOARDING FLOW -->
            <ProgressBar bind:width={userProgressBarWidth} />

            <div class="step-container" in:fade={{ duration: 150 }}>
                {#if currentStep === 0}
                    <form
                        onsubmit={(e) => {
                            e.preventDefault();
                            nextStep();
                        }}
                        class="step-form"
                    >
                        <div class="step-content center-text">
                            <div class="brand-header">
                                <span class="viz-title">viz</span>
                                <span class="brand-subtitle">digital asset manager</span>
                            </div>
                            <h1 class="welcome-heading">
                                Welcome, {user.data?.first_name || user.data?.name || "Traveler"}!
                            </h1>
                            <span class="welcome-text">
                                We're glad you're here. Let's customize a few personal details to personalize your
                                workspace.
                            </span>
                        </div>
                        <div class="actions centered">
                            <Button variant="primary" type="submit" iconName="arrow_forward">
                                <span>Let's Go</span>
                            </Button>
                        </div>
                    </form>
                {:else if currentStep === 1}
                    <form
                        onsubmit={(e) => {
                            e.preventDefault();
                            if (userForm.firstName && userForm.lastName) {
                                nextStep();
                            }
                        }}
                        class="step-form"
                    >
                        <div class="step-header">
                            <span class="step-counter">Step {currentStep + 1} of {totalUserSteps}</span>
                        </div>
                        <div class="step-content">
                            <div>
                                <h2 class="step-title">Personal Details</h2>
                                <span class="step-subtitle">How should we address you?</span>
                            </div>
                            <InputText label="First Name" bind:value={userForm.firstName} required />
                            <InputText label="Last Name" bind:value={userForm.lastName} required />
                        </div>
                        <div class="actions">
                            <Button variant="secondary" type="button" iconName="arrow_back" onclick={prevStep}>
                                <span>Back</span>
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                iconName="arrow_forward"
                                disabled={!userForm.firstName || !userForm.lastName}
                            >
                                <span>Next</span>
                            </Button>
                        </div>
                    </form>

                    <!-- Steps 2...N: Settings Groups -->
                {:else if currentStep >= 2 && currentStep < 2 + groupNames.length}
                    {@const groupIndex = currentStep - 2}
                    {@const groupName = groupNames[groupIndex]}
                    {@const settings = settingsGroups[groupName]}

                    <form
                        onsubmit={(e) => {
                            e.preventDefault();
                            if (currentStep === totalUserSteps - 1) {
                                handleUserOnboardingSubmit();
                            } else {
                                nextStep();
                            }
                        }}
                        class="step-form"
                    >
                        <div class="step-header">
                            <span class="step-counter">Step {currentStep + 1} of {totalUserSteps}</span>
                        </div>
                        <div class="step-content">
                            <div>
                                <h2 class="step-title">{groupName.replace(/_/g, " ")} Settings</h2>
                                <span class="step-subtitle"
                                    >Customize your preferences for {groupName.toLowerCase().replace(/_/g, " ")}.</span
                                >
                            </div>

                            <div class="settings-list">
                                {#each settings as setting (setting.name)}
                                    <div class="setting-item">
                                        {#if setting.value_type === "enum" && setting.allowed_values}
                                            <InputSelect
                                                label={setting.name.trim() ? setting.name : formatLabel(setting.name)}
                                                description={setting.description}
                                                bind:value={userSettingsValues[setting.name]}
                                                options={setting.allowed_values}
                                            />
                                        {:else if setting.value_type === "boolean"}
                                            <InputSelect
                                                label={setting.name.trim() ? setting.name : formatLabel(setting.name)}
                                                description={setting.description}
                                                bind:value={userSettingsValues[setting.name]}
                                                options={[
                                                    { value: "true", label: "Yes" },
                                                    { value: "false", label: "No" }
                                                ]}
                                            />
                                        {:else}
                                            <InputText
                                                label={setting.name.trim() ? setting.name : formatLabel(setting.name)}
                                                description={setting.description}
                                                bind:value={userSettingsValues[setting.name]}
                                            />
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        </div>
                        <div class="actions">
                            <Button variant="secondary" type="button" iconName="arrow_back" onclick={prevStep}>
                                <span>Back</span>
                            </Button>
                            {#if currentStep === totalUserSteps - 1}
                                <Button variant="primary" type="submit" iconName="check" disabled={isLoading}>
                                    <span>{isLoading ? "Finishing..." : "Complete Setup"}</span>
                                </Button>
                            {:else}
                                <Button variant="primary" type="submit" iconName="arrow_forward">
                                    <span>Next</span>
                                </Button>
                            {/if}
                        </div>
                    </form>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .onboarding-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        width: 100%;
        background-color: var(--viz-surface-base);
        padding: var(--viz-spacing-md);
        position: relative;
        overflow-y: auto;
    }

    /* Structured editorial grid background overlay */
    .onboarding-container::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image:
            linear-gradient(color-mix(in srgb, var(--viz-border-subtle) 25%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--viz-border-subtle) 25%, transparent) 1px, transparent 1px);
        background-size: 2rem 2rem;
        background-position: center;
        pointer-events: none;
        z-index: 1;
    }

    .card {
        background-color: var(--viz-surface-card);
        border-radius: var(--viz-border-radius-md);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
        width: 100%;
        max-width: 25%;
        border: var(--viz-border-thin);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        z-index: 2;
    }

    .step-container {
        padding: var(--viz-spacing-xl) var(--viz-spacing-lg);
        display: flex;
        flex-direction: column;
        flex: 1;
    }

    .step-form {
        display: flex;
        flex-direction: column;
        flex: 1;
    }

    .step-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--viz-spacing-sm);
    }

    .step-counter {
        font-family: var(--viz-mono-font);
        color: var(--viz-text-muted);
    }

    .brand-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--viz-spacing-xxs);
        margin-bottom: var(--viz-spacing-xs);
    }

    .viz-title {
        font-family: var(--viz-mono-font);
        font-weight: 700;
        font-size: var(--viz-font-size-4xl);
        color: var(--viz-text-primary);
        letter-spacing: -0.05em;
        line-height: 1;
    }

    .brand-subtitle {
        font-family: var(--viz-mono-font);
        color: var(--viz-text-secondary);
        text-transform: lowercase;
    }

    .step-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);

        &.center-text {
            text-align: center;
            align-items: center;
            justify-content: center;
        }
    }

    .step-title {
        font-size: var(--viz-font-size-xl);
        font-weight: 600;
        color: var(--viz-text-primary);
        line-height: 1.2;
        margin-bottom: var(--viz-spacing-xxs);
    }

    .step-subtitle {
        color: var(--viz-text-secondary);
        line-height: 1.4;
        display: block;
    }

    .welcome-heading {
        font-size: var(--viz-font-size-2xl);
        font-weight: 700;
        color: var(--viz-text-primary);
        line-height: 1.2;
        margin-top: var(--viz-spacing-xs);
    }

    .welcome-text {
        color: var(--viz-text-secondary);
        line-height: 1.5;
        max-width: 20rem;
        margin: 0;
    }

    .info-box {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-lg);
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-left: 3px solid var(--viz-primary);
        padding: var(--viz-spacing-md);
        border-radius: var(--viz-border-radius-sm);
        line-height: 1.5;
        color: var(--viz-text-primary);

        .info-header {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-xs);
            color: var(--viz-primary);
        }

        .info-title {
            font-weight: 600;
            color: var(--viz-text-primary);
            font-size: var(--viz-font-size-std);
        }

        .info-text {
            color: var(--viz-text-secondary);
            margin: 0;
        }

        .info-footer {
            color: var(--viz-text-muted);
        }
    }

    .actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viz-spacing-sm);
        margin-top: var(--viz-spacing-lg);
        padding-top: var(--viz-spacing-md);
        border-top: var(--viz-border-thin);

        &.centered {
            justify-content: center;
            border-top: none;
            padding-top: 0;
            margin-top: var(--viz-spacing-md);
        }
    }

    .settings-list {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
        max-height: 20rem;
        overflow-y: auto;
        padding-right: var(--viz-spacing-xs);
    }

    .setting-item {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
    }

    .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: var(--viz-spacing-2xl);
        color: var(--viz-text-secondary);
    }
</style>
