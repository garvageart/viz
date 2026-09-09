export function isMacPlatform(): boolean {
    const platform = navigator.platform;
    return /Mac|iPod|iPhone|iPad/i.test(platform) || /Mac/i.test(navigator.userAgent);
}
