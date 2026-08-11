<script lang="ts">
    import { Role } from "$lib/api";
    import Button from "$lib/components/ui/Button.svelte";
    import InputPassword from "$lib/components/ui/InputPassword.svelte";
    import InputSelect from "$lib/components/ui/InputSelect.svelte";
    import InputText from "$lib/components/ui/InputText.svelte";
    import { toSentenceCase } from "$lib/utils/strings";
    import { modalsManager } from "./manager/ModalManager.svelte";

    interface Props {
        id: string;
        onSave: (data: typeof createForm) => Promise<void>;
    }

    let { id, onSave }: Props = $props();

    let loading = $state(false);
    let createForm = $state({
        name: "",
        email: "",
        password: "",
        role: "user" as Role
    });

    async function handleSave() {
        loading = true;

        try {
            await onSave(createForm);
            modalsManager.close(id);
        } finally {
            loading = false;
        }
    }

    function handleCancel() {
        modalsManager.dismiss(id);
    }
</script>

<div class="user-modal">
    <InputText label="Name" bind:value={createForm.name} />
    <InputText label="Email" type="email" bind:value={createForm.email} />
    <InputPassword label="Password" bind:value={createForm.password} />
    <InputSelect
        label="Role"
        bind:value={createForm.role}
        options={Object.values(Role).map((r) => ({ value: r, label: toSentenceCase(r) }))}
    />
    <div class="modal-actions">
        <Button hoverColor="var(--viz-surface-hover)" onclick={handleCancel}>Cancel</Button>
        <Button onclick={handleSave} disabled={loading}>
            {loading ? "Creating..." : "Create User"}
        </Button>
    </div>
</div>

<style lang="scss">
    .user-modal {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        color: var(--viz-text-primary);
        width: 100%;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1rem;
    }
</style>
