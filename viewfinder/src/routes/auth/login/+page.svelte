<script lang="ts">
    import { goto } from "$app/navigation";
    import { login } from "$lib/api";
    import { fetchCurrentUser } from "$lib/auth/auth_methods";
    import Button from "$lib/components/ui/Button.svelte";
    import InputPassword from "$lib/components/ui/InputPassword.svelte";
    import InputText from "$lib/components/ui/InputText.svelte";
    import { system } from "$lib/states/index.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";

    let loginData = $state({
        email: "",
        password: ""
    });

    let notifMessage = $state("");

    const bgImageIndex = Math.floor(Math.random() * 300);
    const bgImageUrl = `url('https://picsum.photos/1920/1080/?random=${bgImageIndex}')`;

    function showLoginNotif(message: string, level: "success" | "info" | "warning" | "error") {
        notifMessage = message;
        toasts.add({
            message,
            type: level
        });
    }

    async function handleLogin(event: Event) {
        event.preventDefault();

        if (!loginData.email || !loginData.password) {
            showLoginNotif("Please fill in all fields", "error");
            return;
        }

        try {
            const response = await login({
                email: loginData.email,
                password: loginData.password
            });

            if (response.status === 200) {
                showLoginNotif("Login successful!", "success");

                // Invalidate system state to force re-fetch of 'user_onboarding_required'
                // with the new authenticated session.
                system.fetched = false;
                system.data = null;

                await fetchCurrentUser();
                goto("/");
            } else if (response.status === 401) {
                showLoginNotif("Invalid email or password", "error");
            } else if (response.status === 404) {
                showLoginNotif("User not found", "error");
            } else {
                showLoginNotif("Login failed. Please try again.", "error");
            }
        } catch (error: any) {
            showLoginNotif("Login failed. Please try again.", "error");
            console.error("Login error:", error);
        }
    }
</script>

<main style:background-image={bgImageUrl}>
    <div class="auth-card">
        <div class="auth-header">
            <span class="viz-title">viz</span>
            <span class="auth-subtitle">digital asset manager</span>
        </div>
        <h1 class="auth-heading">Login</h1>
        <form id="login-form" class="auth-form" onsubmit={handleLogin}>
            <InputText
                id="login-email"
                label="Email"
                name="email"
                placeholder="photos@{location.hostname}"
                type="email"
                required
                bind:value={loginData.email}
            />
            <InputPassword
                id="login-password"
                label="Password"
                name="password"
                placeholder="••••••••"
                required
                bind:value={loginData.password}
            />
            <div class="auth-submit-btn-wrapper">
                <Button id="login-submit" class="auth-submit-btn" type="submit">Login</Button>
            </div>
        </form>
        <p class="auth-footer">
            Don't have an account? <a href="/auth/register">Register</a>
        </p>
    </div>
</main>

<style lang="scss">
    main {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background-size: cover;
        background-position: center;
        position: relative;
        overflow: hidden;
    }

    /* Grid and tint overlay on top of the background image */
    main::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        /* Use a color-mix to blend the theme's background color with transparency */
        background-color: color-mix(in srgb, var(--viz-surface-panel) 65%, transparent);
        /* Grid pattern mapping to structured editorial grid lines */
        background-image:
            linear-gradient(color-mix(in srgb, var(--viz-border-subtle) 20%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--viz-border-subtle) 20%, transparent) 1px, transparent 1px);
        background-size: 32px 32px;
        background-position: center;
        backdrop-filter: blur(12px);
        z-index: 1;
    }

    .auth-card {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 24rem;
        background-color: var(--viz-surface-card);
        border: var(--viz-border-thin);
        border-top: 3px solid var(--viz-primary);
        padding: var(--viz-spacing-xl) var(--viz-spacing-lg);
        z-index: 2;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
    }

    .auth-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--viz-spacing-xs);
        margin-bottom: var(--viz-spacing-xl);
    }

    .viz-title {
        font-family: var(--viz-mono-font);
        font-weight: 700;
        font-size: var(--viz-font-size-5xl);
        color: var(--viz-text-primary);
        letter-spacing: -0.05em;
    }

    .auth-subtitle {
        font-size: var(--viz-font-size-std);
        font-family: var(--viz-mono-font);
        color: var(--viz-text-secondary);
        text-transform: lowercase;
    }

    .auth-heading {
        font-size: var(--viz-font-size-3xl);
        font-weight: 600;
        margin-bottom: var(--viz-spacing-md);
        color: var(--viz-text-primary);
        text-align: center;
    }

    .auth-form {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
    }

    .auth-submit-btn-wrapper {
        margin-top: var(--viz-spacing-sm);
        width: 100%;
    }

    /* Target the inner button of our custom Button component */
    :global(.auth-submit-btn) {
        width: 100% !important;
        background-color: var(--viz-primary) !important;
        color: #ffffff !important;
        border: none !important;
        font-weight: 600 !important;
        font-size: var(--viz-font-size-xl) !important;
        padding: var(--viz-spacing-sm) var(--viz-spacing-std) !important;
        border-radius: var(--viz-border-radius-pill) !important;
        transition:
            opacity 150ms ease,
            background-color 150ms ease !important;

        &:hover:not(:disabled) {
            background-color: var(--viz-primary) !important;
            opacity: 0.9;
        }
    }

    .auth-footer {
        margin-top: var(--viz-spacing-lg);
        font-size: var(--viz-font-size-lg);
        color: var(--viz-text-secondary);
        text-align: center;

        a {
            color: var(--viz-text-primary);
            font-weight: 600;
            text-decoration: underline;
            text-underline-offset: 2px;

            &:hover {
                color: var(--viz-text-primary);
                text-decoration: underline;
            }
        }
    }
</style>
