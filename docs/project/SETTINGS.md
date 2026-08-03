# User Settings Doc

A running planning document for user defined settings. These are for settings currently not implemented yet.

## Relevant files:

- [internal/settings/seed](../internal/settings/seed.go)
- [viewfinder/src/lib/components/settings/Settings.svelte](../viewfinder/src/lib/components/settings/Settings.svelte)

### User Settings

- [ ] **Sidecar**: Download sidecar files in archives and/or downloading the original files
- [ ] **Change Password**: Allow users to change password
- [ ] **Change Email**: Allow users to change email address (may be enforced by admin if allowed or not)
- [ ] **Keyboard Shortcuts**: So important I cannot stress this enough
- [ ] **Metadata Display**: Give users options to display different metadata fields in different places (lightbox, grid cards). Different users may have different org roles. One may be an organiser, one is a photographer, another an editor.
- [ ] **Sorting settings**: Self-explanatory.
- [ ] **Templates**: Metadata Templates for batch applying.
- [ ] **Default Metadata**: Allow users to define default metadata for new uploads. For example, a user may want to set the default copyright to their name.
- [ ] **Workspace Layouts**: Self-explanatory. Can be used across different devices.

### Admin Defined User Settings

- [ ] **Domain/Organisation Scope**: Give admins the ability to define settings that are specific to a domain or organisation. This would include default settings for new users as defined by the organisation. Emails would be scoped by the domain, for example, `les@viewfinder.org` would be scoped to the `viewfinder.org` domain. One org only. There's a possibility this could not change once set as migrating settings could be tough.
- [ ] **Date of Birth** (Unlikely): If org scoped, could be useful
- [ ] **2FA**: Implement 2FA for users. If enabled, users would be required to set up 2FA on their account. Choices are either: Instance enabled, instance disabled and user choice.
- [ ] **Sharing Settings**: Define sharing settings defaults, things like domain name, default privacy settings, default expiry dates
- [ ] **Image Labels**: Define image label names. For example, orgs could define "Selected" for Green, "Rejected" for Red, "Needs Review" for Yellow. Enables consistency for everyone. No extra org defined labels, bad for compatibility.
- [ ] **Max Archive Download Size**: Could be 2-4GB by default, but really this might just be a server-side setting enforced by admin.
- [ ] **Workflows/Plugins**: Users can defined workflows and plugins, but admins can define which ones are default.
- [ ] **Instance roles**: Apart from the application level roles (admin, user, guest), admins can define instance roles that are specific to their instance. For example, an admin could define a "Photographer", "Editor", "Reviewer". Roles could be tied to particular permissions if so needed.
