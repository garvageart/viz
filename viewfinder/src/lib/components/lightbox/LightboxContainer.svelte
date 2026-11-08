<script lang="ts">
    import { lightboxManager } from "#lib/components/lightbox/lightbox-manager.svelte.js";
    import Lightbox from "#lib/components/ui/Lightbox.svelte";
    import { KbdShortcutTier, keyboardManager } from "#lib/keyboard/keyboard.svelte.js";

    $effect(() => {
        if (lightboxManager.stack.length === 0) {
            return;
        }

        const popScope = keyboardManager.pushScope("lightbox");
        const unregisterEscape = keyboardManager.registerEscape({
            tier: KbdShortcutTier.Overlay,
            handler: () => {
                lightboxManager.pop();
            }
        });

        return () => {
            popScope();
            unregisterEscape();
        };
    });
</script>

{#each lightboxManager.stack as item (item.id)}
    {@const opt = item.options}
    <Lightbox
        show={true}
        zIndex={item.zIndex}
        backgroundOpacity={opt.backgroundOpacity ?? 0.65}
        backgroundColour={opt.backgroundColour ?? "#000000"}
        blur={opt.blur ?? false}
        closeOnEsc={false}
        onclick={() => {
            if (opt.closeOnOverlayClick !== false) {
                lightboxManager.dismiss(item.id);
            }
        }}
    >
        <item.component {...item.props} id={item.id} />
    </Lightbox>
{/each}
