<script lang="ts">
    import { Role, type User } from "@viz/api";
    import { untrack } from "svelte";
    import { lightboxManager } from "#lib/components/lightbox/lightbox-manager.svelte.js";
    import Button from "#lib/components/ui/Button.svelte";
    import InputSelect from "#lib/components/ui/InputSelect.svelte";
    import InputText from "#lib/components/ui/InputText.svelte";
    import { toSentenceCase } from "#lib/utils/strings.js";
    import Modal from "./Modal.svelte";

    interface Props {
        id?: string;
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
        lightboxManager.close(id);
    }

    function handleCancel() {
        lightboxManager.dismiss(id);
    }
</script>

<Modal {id} heading="Edit User" iconName="manage_accounts" applyPadding={true}>
    <div class="user-modal">
        <InputText label="Name" autofocus bind:value={editForm.name} />
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
            <Button variant="danger" onclick={handleCancel}><span>Cancel</span></Button>
            <Button variant="primary" onclick={handleSave}><span>Save Changes</span></Button>
        </div>
    </div>
</Modal>

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
