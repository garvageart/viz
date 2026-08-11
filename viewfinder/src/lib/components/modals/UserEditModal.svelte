<script lang="ts">
    import { untrack } from "svelte";
    import { Role, type User } from "$lib/api";
    import Button from "$lib/components/ui/Button.svelte";
    import InputSelect from "$lib/components/ui/InputSelect.svelte";
    import InputText from "$lib/components/ui/InputText.svelte";
    import { toSentenceCase } from "$lib/utils/strings";
    import { modalsManager } from "./manager/ModalManager.svelte";

    interface Props {
        id: string;
        user: User;
        onSave: (updatedData: typeof editForm) => Promise<void>;
    }

    let { id, user, onSave }: Props = $props();

    let editForm = $state(
        untrack(() => ({
            first_name: user.first_name,
            last_name: user.last_name,
            name: user.name,
            email: user.email,
            role: user.role
        }))
    );

    async function handleSave() {
        await onSave(editForm);
        modalsManager.close(id);
    }

    function handleCancel() {
        modalsManager.dismiss(id);
    }
</script>

<div class="user-modal">
    <InputText label="Name" bind:value={editForm.name} />
    <InputText label="Email" type="email" bind:value={editForm.email} />
    <div class="form-row">
        <InputText label="First Name" bind:value={editForm.first_name} />
        <InputText label="Last Name" bind:value={editForm.last_name} />
    </div>
    <InputSelect
        label="Role"
        bind:value={editForm.role}
        options={Object.values(Role).map((r) => ({ value: r, label: toSentenceCase(r) }))}
    />
    <div class="modal-actions">
        <Button hoverColor="var(--viz-surface-hover)" onclick={handleCancel}>Cancel</Button>
        <Button onclick={handleSave}>Save Changes</Button>
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

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1rem;
    }
</style>
