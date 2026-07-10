import { type Component, mount, unmount } from "svelte";
import tippy, { type Instance, type Props } from "tippy.js";
import "tippy.js/dist/tippy.css";

type TippyOptions = Omit<Partial<Props>, "content"> & {
    component?: Component<any>;
    props?: Record<string, any>;
    applyPadding?: boolean;
};

export interface TooltipParams extends TippyOptions {
    content?: string | null;
}

export function mountTooltipComponent<T extends Record<string, any>>(
    component: Component<T>,
    props: T
): { node: HTMLElement; destroy: () => void } {
    const container = document.createElement("div");
    const instance = mount(component, {
        target: container,
        props
    });

    return {
        node: container,
        destroy() {
            unmount(instance);
        }
    };
}

export function tooltip(node: HTMLElement, params: TooltipParams | string | null | undefined) {
    if (!params) {
        return;
    }

    let instance: Instance<Props> | undefined;
    let destroyComponent: (() => void) | null = null;

    const setupTippy = (opts: TooltipParams | string) => {
        const isString = typeof opts === "string";
        const contentVal = isString ? opts : opts.content;
        const comp = isString ? null : opts.component;
        const compProps = isString ? {} : opts.props || {};
        const tippyOptions: TippyOptions = isString ? {} : { ...opts };

        // Clean up component-specific configurations from tippyOptions
        delete tippyOptions.component;
        delete tippyOptions.props;
        const applyPadding = tippyOptions.applyPadding ?? true;
        delete tippyOptions.applyPadding;

        let theme = tippyOptions.theme || "viz";
        if (!applyPadding) {
            theme += " no-padding";
        }
        delete tippyOptions.theme;

        let contentNode: HTMLElement | string = contentVal ?? "";

        if (comp) {
            const mounted = mountTooltipComponent(comp, compProps);
            contentNode = mounted.node;
            destroyComponent = mounted.destroy;
        }

        instance = tippy(node, {
            theme,
            delay: [350, 0],
            interactive: !!comp,
            arrow: false,
            content: contentNode,
            appendTo: "parent",
            ...tippyOptions,
            onDestroy(inst) {
                if (destroyComponent) {
                    destroyComponent();
                    destroyComponent = null;
                }
                if (tippyOptions.onDestroy) {
                    tippyOptions.onDestroy(inst);
                }
            }
        });
    };

    setupTippy(params);

    if (node.hasAttribute("title")) {
        node.removeAttribute("title");
    }

    return {
        update(newParams: TooltipParams | string | null | undefined) {
            if (destroyComponent) {
                destroyComponent();
                destroyComponent = null;
            }
            if (instance) {
                instance.destroy();
            }

            if (newParams) {
                setupTippy(newParams);
            }
        },
        destroy() {
            if (destroyComponent) {
                destroyComponent();
                destroyComponent = null;
            }
            if (instance) {
                instance.destroy();
            }
        }
    };
}
