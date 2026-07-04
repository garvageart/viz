import { type Component, mount, unmount } from "svelte";
import tippy, { type Instance, type Props } from "tippy.js";
import "tippy.js/dist/tippy.css";

export interface TooltipParams extends Partial<Omit<Props, "content">> {
    content?: string | null;
    component?: Component<any>;
    props?: Record<string, any>;
}

type TippyOptions = Omit<Partial<Props>, "content"> & {
    component?: Component<any>;
    props?: Record<string, any>;
};

export function tooltip(node: HTMLElement, params: TooltipParams | string | null | undefined) {
    if (!params) {
        return;
    }

    let instance: Instance<Props> | undefined;
    let activeComponent: Record<string, any> | null = null;

    const setupTippy = (opts: TooltipParams | string) => {
        const isString = typeof opts === "string";
        const contentVal = isString ? opts : opts.content;
        const comp = isString ? null : opts.component;
        const compProps = isString ? {} : opts.props || {};
        const tippyOptions: TippyOptions = isString ? {} : { ...opts };

        // Clean up component-specific configurations from tippyOptions
        delete tippyOptions.component;
        delete tippyOptions.props;

        let contentNode: HTMLElement | string = contentVal ?? "";

        if (comp) {
            const container = document.createElement("div");
            activeComponent = mount(comp, {
                target: container,
                props: compProps
            });
            contentNode = container;
        }

        instance = tippy(node, {
            theme: "viz",
            delay: [350, 0],
            interactive: !!comp,
            arrow: false,
            content: contentNode,
            appendTo: "parent",
            ...tippyOptions,
            onDestroy(inst) {
                if (activeComponent) {
                    unmount(activeComponent);
                    activeComponent = null;
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
            if (activeComponent) {
                unmount(activeComponent);
                activeComponent = null;
            }
            if (instance) {
                instance.destroy();
            }

            if (newParams) {
                setupTippy(newParams);
            }
        },
        destroy() {
            if (activeComponent) {
                unmount(activeComponent);
                activeComponent = null;
            }
            if (instance) {
                instance.destroy();
            }
        }
    };
}
