<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { type UserSetting, doUserOnboarding, getUserSettings, setupSuperadmin } from "$lib/api";
    import Button from "$lib/components/ui/Button.svelte";
    import InputPassword from "$lib/components/ui/InputPassword.svelte";
    import InputSelect from "$lib/components/ui/InputSelect.svelte";
    import InputText from "$lib/components/ui/InputText.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import ProgressBar from "$lib/components/ui/ProgressBar.svelte";
    import { formatLabel } from "$lib/settings/utils";
    import { getTheme, system, toggleTheme, user } from "$lib/states/index.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import { getSafeRedirectUrl } from "$lib/utils/url";

    let isLoading = $state(false);
    let currentStep = $state(0);

    // Redirect Logic
    $effect(() => {
        if (
            system.fetched &&
            !system.loading &&
            !system.data?.needs_superadmin &&
            !system.data?.user_onboarding_required
        ) {
            const continueUrl = page.url.searchParams.get("continue");
            goto(getSafeRedirectUrl(continueUrl, "/"));
        }
    });

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

    let userSettings = $state<UserSetting[]>([]);
    let userSettingsValues = $state<Record<string, string>>({});

    // Group settings by their 'group' field
    let settingsGroups = $derived.by(() => {
        const groups: Record<string, UserSetting[]> = {};
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
                    toastState.addToast({
                        message: res.data.error || "Failed to load settings.",
                        type: "error"
                    });
                }
            } catch (e) {
                console.error(e);
                toastState.addToast({
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
            toastState.addToast({
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
                toastState.addToast({
                    message: "Superadmin setup complete!",
                    type: "success"
                });

                // Invalidate system state to force re-fetch of status flags
                system.fetched = false;
                system.data = null;

                goto("/");
            } else {
                toastState.addToast({
                    message: res.data.error || "Setup failed.",
                    type: "error"
                });
            }
        } catch (err) {
            console.error(err);
            toastState.addToast({
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
                    description: setting.description
                }))
            });

            if (res.status === 200) {
                toastState.addToast({ message: "Welcome aboard!", type: "success" });

                // Invalidate system state to force re-fetch of status flags
                // This ensures the router knows onboarding is complete
                system.fetched = false;
                system.data = null;

                user.data = res.data;

                const continueUrl = page.url.searchParams.get("continue");
                goto(getSafeRedirectUrl(continueUrl, "/"));
            } else {
                toastState.addToast({
                    message: res.data.error || "Onboarding failed.",
                    type: "error"
                });
            }
        } catch (err) {
            console.error(err);
            toastState.addToast({
                message: "An unexpected error occurred.",
                type: "error"
            });
        } finally {
            isLoading = false;
        }
    }

    let totalSteps = $derived(2 + groupNames.length);
    let progressBarWidth = $derived(((currentStep + 1) / totalSteps) * 100);
</script>

<div class="onboarding-container">
    <div class="card">
        {#if system.loading}
            <div class="loading">Loading...</div>
        {:else if system.data?.needs_superadmin}
            <!-- SUPERADMIN FLOW -->
            <div class="step-container" in:fade={{ duration: 200 }}>
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
                            <h1>Welcome to Viz</h1>
                            <div class="info-box">
                                <p>
                                    <strong>You are the first user!</strong>
                                </p>
                                <p>
                                    As the first user, you will be granted <strong>Superadmin</strong>
                                    privileges. This gives you full control over the system, including managing other users,
                                    system settings, and more.
                                </p>
                                <p>Let's get your account set up.</p>
                            </div>
                        </div>
                        <div class="actions centered">
                            <Button type="submit">Get Started</Button>
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
                        <div class="step-content">
                            <h2>Account Details</h2>
                            <p class="subtitle">Set your login credentials.</p>
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
                            <Button type="button" onclick={prevStep}>Back</Button>
                            <Button
                                type="submit"
                                disabled={!superadminForm.name || !superadminForm.email || !superadminForm.password}
                                >Next</Button
                            >
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
                        <div class="step-content">
                            <h2>Your Profile</h2>
                            <p class="subtitle">Tell us a bit about yourself.</p>
                            <InputText label="First Name" bind:value={superadminForm.firstName} />
                            <InputText label="Last Name" bind:value={superadminForm.lastName} />
                        </div>
                        <div class="actions">
                            <Button type="button" onclick={prevStep}>Back</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Creating Account..." : "Finish Setup"}
                            </Button>
                        </div>
                    </form>
                {/if}
            </div>
        {:else if system.data?.user_onboarding_required}
            <!-- USER ONBOARDING FLOW -->
            <!-- 0:Intro, 1:Profile, 2..N:Settings -->

            <div class="step-container" in:fade={{ duration: 200 }}>
                <ProgressBar bind:width={progressBarWidth} />

                {#if currentStep === 0}
                    <form
                        onsubmit={(e) => {
                            e.preventDefault();
                            nextStep();
                        }}
                        class="step-form"
                    >
                        <div class="step-content center-text">
                            <h1>Welcome, {user.data?.name || "Traveler"}!</h1>
                            <p>We're glad you're here.</p>
                            <p>Before you dive in, we need to gather a few details to personalize your experience.</p>
                        </div>
                        <div class="actions centered">
                            <Button type="submit">Let's Go</Button>
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
                        <div class="step-content">
                            <h2>Personal Details</h2>
                            <p class="subtitle">How should we address you?</p>
                            <InputText label="First Name" bind:value={userForm.firstName} required />
                            <InputText label="Last Name" bind:value={userForm.lastName} required />
                        </div>
                        <div class="actions">
                            <Button type="button" onclick={prevStep}>Back</Button>
                            <Button type="submit" disabled={!userForm.firstName || !userForm.lastName}>Next</Button>
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
                            if (currentStep === totalSteps - 1) {
                                handleUserOnboardingSubmit();
                            } else {
                                nextStep();
                            }
                        }}
                        class="step-form"
                    >
                        <div class="step-content">
                            <h2>{groupName.replace(/_/g, " ")} Settings</h2>
                            <p class="subtitle">Customize your experience.</p>

                            <div class="settings-list">
                                {#each settings as setting}
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
                            <Button type="button" onclick={prevStep}>Back</Button>
                            {#if currentStep === totalSteps - 1}
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "Finishing..." : "Complete Setup"}
                                </Button>
                            {:else}
                                <Button type="submit">Next</Button>
                            {/if}
                        </div>
                    </form>
                {/if}
            </div>
        {:else}
            <div class="loading">Redirecting...</div>
        {/if}
    </div>
</div>

<style lang="scss">
    .onboarding-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background-color: var(--viz-bg-color);
        padding: 1rem;
        position: relative;
    }

    .card {
        background: var(--viz-bg-color);
        border-radius: 1rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        width: 100%;
        max-width: 40%;
        border: 1px solid var(--viz-primary);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 50%;
        position: relative;
    }

    .step-container {
        padding: 2.5rem;
        display: flex;
        flex-direction: column;
        flex: 1;
        height: 100%;
    }

    .step-form {
        display: flex;
        flex-direction: column;
        flex: 1;
        height: 100%;
    }

    .step-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;

        &.center-text {
            text-align: center;
            justify-content: center;
        }
    }

    h1 {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
        color: var(--viz-text-color);
    }

    h2 {
        font-size: 1.5rem;
        color: var(--viz-text-color);
        margin-bottom: 0.25rem;
        text-transform: capitalize;
    }

    .subtitle {
        color: var(--viz-40);
        margin-bottom: 1rem;
    }

    .info-box {
        background: var(--viz-100);
        border: 1px solid var(--viz-primary);
        padding: 1rem;
        border-radius: 0.5rem;
        color: var(--viz-text-color);
        font-size: 0.95rem;
        line-height: 1.5;

        p {
            margin-bottom: 0.5rem;
            &:last-child {
                margin-bottom: 0;
            }
        }
    }

    .actions {
        display: flex;
        justify-content: space-between;
        margin-top: 2rem;
        padding-top: 1rem;

        &.centered {
            justify-content: center;
            border-top: none;
        }
    }

    .settings-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        max-height: 350px;
        overflow-y: auto;
        padding-right: 0.5rem;
    }

    .setting-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        color: var(--viz-40);
    }
</style>
