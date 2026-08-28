# Viz User-Settings

A running planning document for user-defined settings. These are for settings currently not implemented yet.

> [!NOTE]
> Not too sure currently what the idea is behind user-settings/frontend settings. There are general user-settings (frontend and backend) and frontend UI settings (`viewfinder`). Some distinction is needed about how to go about this. In addition, persistance seperation. Should user-settings be coupled to the singular DB? If someone wants to create a simple frontend aside from `viewfinder`, `viewfinder` specific options and details should not be persisted in the API/image data database.

## Relevant files:

- [internal/settings/seed](../internal/settings/seed.go)
- [viewfinder/src/lib/components/settings/Settings.svelte](../viewfinder/src/lib/components/settings/Settings.svelte)

## Settings

### User

- [ ] **Sidecar**: Download sidecar files in archives and/or downloading the original files
- [ ] **Change Password**: Allow users to change password
- [ ] **Change Email**: Allow users to change email address (may be enforced by admin if allowed or not)
- [ ] **Keyboard Shortcuts**: So important I cannot stress this enough
- [ ] **Metadata Display**: Give users options to display different metadata fields in different places (lightbox, grid cards).
- [ ] **Sorting settings**: Self-explanatory.
- [ ] **Templates**: Metadata Templates for batch applying.
- [ ] **Default Metadata**: Allow users to define default metadata for new uploads. For example, a user may want to set the default copyright to their name.
- [ ] **Workspace Layouts**: Self-explanatory. Can be used across different devices.
- [ ] **Show Tooltip on Hover**: Option to toggle or configure tooltips on hover across asset grid items.
- [ ] **Toolbar & Selection Action Customization**: Allow users to select which actions are rendered directly in the toolbar and selection toolbar (e.g. exporting, downloading, deleting) giving choice over what is rendered and where.
- [ ] **Auto-Advance on Rating/Labeling**: Automatically navigate to the next asset upon setting a star rating, color label, or rejection tag during culling.
- [ ] **IPTC Templates**: Saved metadata presets (Creator, Copyright, Rights, Location) for single-click batch application or default injection on upload.
- [ ] **Lightbox Preload Buffer**: Configurable adjacent prefetch buffer size (number of neighboring full-res images preloaded in lightbox) for zero-lag navigation. (maybe, but ideally we just choose the performant thing and make it noncustomisable)
- [ ] **Canvas Backdrop Tone**: Select lightbox background shade (18% neutral gray for color grading, dark charcoal, pitch black).
- [ ] **EXIF Timezone Display Mode**: Toggle between viewing timestamps in Camera Local Time (from EXIF) vs Viewer's Local Browser Time vs UTC.
- [ ] **Virtual Copies**: Manage multiple non-destructive virtual copies (ratings, color labels, crops, sidecars) for a single master image without duplicating disk files.
- [ ] **Hierarchical Tag Trees & Synonyms**: Support parent/child nested tags (e.g. `Locations / Europe / France`), tag synonyms/aliases, and private/internal tags that are stripped upon client export.
- [ ] **Perceptual Hashing & Similarity Search**: Visual duplicate and similarity detection with configurable threshold, plus automatic burst sequence clustering.
- [ ] **Geolocalization & Reverse Geocoding**: Match GPX track logs to photo timestamps, auto-resolve GPS to IPTC location fields (City, State, Country) via offline datasets, and define geofence privacy zones.
- [ ] **Renaming Engine Extensions**: Extend the existing renaming token builder with additional EXIF tokens (shutter count, camera serial number, focal length, aperture) and regex search/replace capabilities.
- [ ] **Ingest Profiles**: Pre-configured ingest workflows combining a Storage Template, Stationery Pad, and renaming pattern to run automatically on upload/ingest or on a selected batch.

### Admin Defined User Settings

- [ ] **Domain/Organisation Scope**: Give admins the ability to define settings that are specific to a domain or organisation. This would include default settings for new users as defined by the organisation. Emails would be scoped by the domain, for example, `les@viewfinder.org` would be scoped to the `viewfinder.org` domain. One org only. There's a possibility this could not change once set as migrating settings could be tough.
- [ ] **Date of Birth** (Unlikely): If org scoped, could be useful
- [ ] **2FA**: Implement 2FA for users. If enabled, users would be required to set up 2FA on their account. Choices are either: Instance enabled, instance disabled and user choice.
- [ ] **Sharing Settings**: Define sharing settings defaults, things like domain name, default privacy settings, default expiry dates
- [ ] **Image Labels**: Define image label names. For example, orgs could define "Selected" for Green, "Rejected" for Red, "Needs Review" for Yellow. Enables consistency for everyone. Intention is for this to be XMP compatible with other software (Lightroom/ACR, Capture One, PhotoMechanic). No extra org defined labels, bad for compatibility.
- [ ] **Controlled Vocabularies & Tags**: Enforce standardized tag dictionaries and category trees org-wide to prevent typos and metadata fragmentation.
- [ ] **Max Archive Download Size**: Could be 2-4GB by default, but really this might just be a server-side setting enforced by admin.
- [ ] **Workflows/Plugins**: Users can defined workflows and plugins, but admins can define which ones are default.
- [ ] **Instance roles**: Apart from the application level roles (admin, user, guest), admins can define instance roles that are specific to their instance. For example, an admin could define a "Photographer", "Editor", "Reviewer". Roles could be tied to particular permissions if so needed.
- [ ] **Preview Generation**: Option to prioritize camera embedded JPEG previews for instant culling vs full RAW processing in libvips first. If uploaded via `viewfinder`, this can be done via `wasm-vips` in the upload process, wait for the backend to process the image in the meantime, and then show the processed image
- [ ] **Dynamic Proofing Watermarks**: Configure client proofing watermarks (text, logo, or diagonal grid overlays with customizable opacity and position) on shared links.
- [ ] **Storage Templates**: Global/Admin configurable filesystem directory structure templates (e.g. `{{year}}/{{month}}/{{day}}/{{filename}}`) defining the tangible folder hierarchy on disk for incoming uploads. This is already applied at the root-level for config, but maybe user-applied settings about how they can organise their phots can be done here too.
- [ ] **Ingestion Renaming Rules & Checksum Verification**: Enforce upload file-naming patterns with dynamic tokens (e.g. date, shoot ID, camera model) and SHA-hashing for verification.
- [ ] **Asset Locking & Multi-Editor Check-Out**: Visual locking mechanism indicating another retoucher/editor is actively editing an asset to prevent duplicate work or overwrites. Might use CRDT or last write-wins though. We'll see.
- [ ] **Storage Archival & Tiering Rules**: Automated policies to move older RAW files to cold storage after a defined period while retaining fast browser previews.
- [ ] **Audit Logging & Activity Trails**: Audit log tracking high-res RAW downloads, copyright metadata alterations, and asset deletions. This might be more tied into OTEL metrics too.
- [ ] **Strip Extensions From Asset Name**: Stripping the file extension from the image name and allowing it to be restored (e.g. `Sunset_Joburg.jpg` -> `Sunset_Joburg` on upload and ingest)
