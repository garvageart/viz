/**
 * Standardized Z-Index Elevation Scale for the Viz UI Design System.
 * Corresponds 1:1 with the `--viz-z-*` CSS design tokens.
 */
export enum ZIndex {
    Base = 0,
    Local = 10,
    WorkspaceLayout = 20,
    Dropzone = 100,
    Chrome = 500,
    Popover = 1000,
    FloatingPanel = 2000,
    Modal = 5000,
    Lightbox = 8000,
    Toast = 9000,
    Tooltip = 10000
}
