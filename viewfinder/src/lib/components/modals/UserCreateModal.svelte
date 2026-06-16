<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import InputText from "$lib/components/ui/InputText.svelte";
    import InputSelect from "$lib/components/ui/InputSelect.svelte";
    import InputPassword from "$lib/components/ui/InputPassword.svelte";
    import { modalsManager } from "./manager/ModalManager.svelte";

    interface Props {
        id: string;
        onSave: (data: any) => Promise<void>;
    }

    let { id, onSave }: Props = $props();

    let loading = $state(false);
    let createForm = $state({
        name: "",
        email: "",
        password: "",
        role: "user"
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
        modalsManager.dismiss(id, "cancel");
    }
</script>

<div class="user-modal">
    <h2>Create User</h2>
    <InputText label="Name" bind:value={createForm.name} />
    <InputText label="Email" type="email" bind:value={createForm.email} />
    <InputPassword label="Password" bind:value={createForm.password} />
    <InputSelect
        label="Role"
        bind:value={createForm.role}
        options={[
            { value: "user", label: "User" },
            { value: "admin", label: "Admin" },
            { value: "superadmin", label: "Superadmin" },
            { value: "guest", label: "Guest" }
        ]}
    />
    <div class="modal-actions">
        <Button hoverColor="var(--viz-80)" onclick={handleCancel}>Cancel</Button>
        <Button onclick={handleSave} disabled={loading}>
            {loading ? "Creating..." : "Create User"}
        </Button>
    </div>
</div>

<style lang="scss">
    .user-modal {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        color: var(--viz-text-color);
        width: 100%;

        h2 {
            margin: 0;
            font-size: 1.5rem;
        }
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1rem;
    }
</style>
