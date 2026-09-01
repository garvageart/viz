# NOTES

A document of general notes and random sporadic stuff that myself (Les) and maybe other developers can use to dump stuff in.

> [!NOTE]
>
> **General rule of thumb for this document**: if your point or section gets too big, it likely needs its own document.

## Admin UI: Missing Files Inspector

Implement a "Show Missing Files" diagnostic tool in the Admin UI (Settings / Storage) that:

1. Compares PostgreSQL `images` table entries against expected physical file paths in `/app/data/library/<UID>/<name>`.
2. Identifies and highlights orphaned DB records where original media files are missing on disk.
3. Provides quick admin actions to purge orphaned metadata rows or trigger targeted re-uploads.

## Settings

Refer to the [User Settings Doc](SETTINGS.md) for a running document.

### Admin Settings

UI needs more work (and more settings), and a likely restructure. Maybe moving away from the strict navbar/sidebar.

## UI/UX

Could be presented better. A (public) design system and Figma file could be useful as a reference. UI is fine, maybe even a bit good but presentation of information in the right places can be better.

Way too much grouping and listing of information which is fine in some place, but some immediate "good to know" information could be presented in a more thought out way.

### Accessibility

I'm really anal about this. This is really important and I cannot stress this enough. Keyboard navigation, good contrast, and screen reading should be good.

## Plugins

On my mind constantly, research is being done here and there and I have some ideas but I'm not fussy right now.

## Resigns

### Search

Search needs to be entirely redone. I think support search tokens visually (e.g. `make:fujifilm`). The search bar also needs to become more of a pallete, in the same way VS Code's command pallete works. Supporting things like `Recently Added` for example, Quick Actions 