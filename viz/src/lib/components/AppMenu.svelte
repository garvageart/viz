<script lang="ts">
	import { goto } from "$app/navigation";
	import ContextMenu, { type MenuItem } from "$lib/context-menu/ContextMenu.svelte";

	let { isOpen = $bindable(false), anchor = $bindable() } = $props<{
		isOpen?: boolean;
		anchor?: HTMLElement | null;
	}>();

	const menuItems: MenuItem[] = [
		{ id: "home", label: "Home", action: () => goto("/") },
		{ id: "photos", label: "Photos", action: () => goto("/photos") },
		{ id: "collections", label: "Collections", action: () => goto("/collections") },
		{ id: "divider-1", label: "", separator: true },
		{
			id: "admin",
			label: "Admin",
			children: [
				{ id: "admin-jobs", label: "Jobs Monitor", action: () => goto("/admin/jobs") },
				{ id: "admin-events", label: "Events Monitor", action: () => goto("/admin/events") },
				{ id: "admin-system", label: "System Info", action: () => goto("/admin") }
			]
		},
		{ id: "divider-2", label: "", separator: true },
		{ id: "settings", label: "Settings", action: () => goto("/settings") },
		{ id: "help", label: "Help & Support", action: () => window.open("https://github.com/garvageart/imagine/issues", "_blank") },
		{
			id: "shortcuts",
			label: "Keyboard Shortcuts",
			shortcut: "?",
			action: () => alert("Keyboard shortcuts:\n\nCtrl/Cmd + K: Search\nEsc: Close panels")
		}
	];
</script>

<ContextMenu bind:showMenu={isOpen} items={menuItems} {anchor} align="left" offsetY={4} />
