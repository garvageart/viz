<script lang="ts">
    const variants: Record<string, string> = {
    "100": "<path d=\"M591-304h145v-146h-22v124H591zM224-510h22v-124h123v-22H224zm-92 298v-536h696v536zm22-22h652v-492H154zm0 0v-492z\" />",
    "200": "<path d=\"M587.77-297.08h155.61v-157.07h-30.76v126.3H587.77zM216.85-505.85h30.77v-126.3h124.84v-30.77H216.85zM120-200v-560h720v560zm30.77-30.77h658.46v-498.46H150.77zm0 0v-498.46z\" />",
    "300": "<path d=\"M582.39-285.54h173.3v-175.54h-45.38v130.16H582.39zM204.92-498.92h45.39v-130.16h127.92v-45.38H204.92zM100-180v-600h760v600zm45.39-45.39h669.22v-509.22H145.39zm0 0v-509.22z\" />",
    "400": "<path d=\"M560-280h200v-200h-80v120H560zM200-480h80v-120h120v-80H200zM80-160v-640h800v640zm80-80h640v-480H160zm0 0v-480z\" />",
    "500": "<path d=\"M574.85-276.15h191v-194h-60v134h-131zm-379.7-213.7h60v-134h131v-60h-191zM74.02-154.02v-652.2h812.2v652.2zm68.13-68.13h675.7v-515.7h-675.7zm0 0v-515.7z\" />",
    "600": "<path d=\"M571.91-279.09h191v-194h-60v134h-131zM198.09-486.91h60v-134h131v-60h-191zM65.87-145.87V-814.7H894.7v668.83zm79.22-79.22h669.82v-509.82H145.09zm0 0v-509.82z\" />",
    "700": "<path d=\"M568-283h191v-194h-60v134H568zM202-483h60v-134h131v-60H202zM55-135v-691h851v691zm94-94h662v-502H149zm0 0v-502z\" />"
};
    const filledVariants: Record<string, string> = {
    "100": "<path d=\"M591-304h145v-146h-22v124H591zM224-510h22v-124h123v-22H224zm-92 298v-536h696v536z\" />",
    "200": "<path d=\"M587.77-297.08h155.61v-157.07h-30.76v126.3H587.77zM216.85-505.85h30.77v-126.3h124.84v-30.77H216.85zM120-200v-560h720v560z\" />",
    "300": "<path d=\"M582.39-285.54h173.3v-175.54h-45.38v130.16H582.39zM204.92-498.92h45.39v-130.16h127.92v-45.38H204.92zM100-180v-600h760v600z\" />",
    "400": "<path d=\"M577-274h191v-194h-60v134H577zM193-492h60v-134h131v-60H193zM80-160v-640h800v640z\" />",
    "500": "<path d=\"M574.85-276.15h191v-194h-60v134h-131zm-379.7-213.7h60v-134h131v-60h-191zM74.02-154.02v-652.2h812.2v652.2z\" />",
    "600": "<path d=\"M571.91-279.09h191v-194h-60v134h-131zM198.09-486.91h60v-134h131v-60h-191zM65.87-145.87V-814.7H894.7v668.83z\" />",
    "700": "<path d=\"M568-283h191v-194h-60v134H568zM202-483h60v-134h131v-60H202zM55-135v-691h851v691z\" />"
};
    let { size = "1.5em", className = "", title = "aspect_ratio", viewBox = "0 -960 960 960", weight = "400", fill = false, ...rest } = $props();
    
    const activeMap = $derived(fill ? filledVariants : variants);
    const inner = $derived(activeMap[String(weight)] || Object.values(activeMap)[0]);
</script>

<svg
    class={className}
    width={size}
    height={size}
    {viewBox}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-label={title}
    focusable="false"
    {...rest}
>
    {@html inner}
</svg>

<style>
    svg {
        display: inline-block;
        vertical-align: middle;
    }
</style>
