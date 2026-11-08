<script lang="ts">
    import { lightboxManager } from "#lib/components/lightbox/lightbox-manager.svelte.js";
    import Button from "#lib/components/ui/Button.svelte";
    import InputPassword from "#lib/components/ui/InputPassword.svelte";
    import InputSelect from "#lib/components/ui/InputSelect.svelte";
    import InputText from "#lib/components/ui/InputText.svelte";
    import { toSentenceCase } from "#lib/utils/strings.js";
    import { Role } from "@viz/api";
    import Modal from "./Modal.svelte";

    interface Props {
        id?: string;
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
            lightboxManager.close(id);
        } finally {
            loading = false;
        }
    }

    function handleCancel() {
        lightboxManager.dismiss(id);
    }
</script>

<Modal {id} heading="Create User" iconName="person_add" applyPadding={true}>
    <div class="user-modal">
        <InputText label="Name" autofocus bind:value={createForm.name} />
        <InputText label="Email" type="email" bind:value={createForm.email} />
        <InputPassword label="Password" bind:value={createForm.password} />
        <InputSelect
            label="Role"
            bind:value={createForm.role}
            options={Object.values(Role).map((r) => ({ value: r, label: toSentenceCase(r) }))}
        />
        <div class="modal-actions">
            <Button variant="danger" onclick={handleCancel}><span>Cancel</span></Button>
            <Button variant="primary" onclick={handleSave} disabled={loading}>
                <span>{loading ? "Creating..." : "Create User"}</span>
            </Button>
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

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1rem;
    }
</style>
