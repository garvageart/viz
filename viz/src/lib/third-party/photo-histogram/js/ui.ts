<<<<<<< HEAD
import * as manager from "./manager";
import * as core from "./histogram";
import * as util from "./util";

export enum HistogramChannel {
    Colors,
    Red,
    Green,
    Blue,
    Luminance,
    RGB,
}

export interface UiOptions {
    width?: string; // any valid css width in string form (e.g. '100' and '100%')
    height?: string; // any valid css width in string form
    colors?: {
        // any valid css colors in string form (e.g. '#000', 'rgba(0,0,0,0)', '#FFF000')
        red?: string;
        green?: string;
        blue?: string;
        redGreen?: string;
        redBlue?: string;
        greenBlue?: string;
        redGreenBlue?: string;
        stroke?: string;
        border?: string;
        background?: string;
        backgroundLine?: string;
        overlayFill?: string;
        overlayStroke?: string;
    };
}

interface ColorScheme {
    red: string;
    green: string;
    blue: string;
    redGreen: string;
    redBlue: string;
    greenBlue: string;
    redGreenBlue: string;
    stroke: string;
    border: string;
    background: string;
    backgroundLine: string;
    overlayFill: string;
    overlayStroke: string;
}

interface ElementIds {
    btnRefresh: string;
    btnStatsToggle: string;
    containerControls: string;
    containerHistogram: string;
    containerStats: string;
    inputMean: string;
    inputMedian: string;
    inputMode: string;
    inputStd: string;
    inputPixels: string;
    inputLevel: string;
    inputCount: string;
    inputPercentile: string;
    rectOverlay: string;
    selectChannels: string;
    textStatus: string;
}

const DEFAULT_COLORS: ColorScheme = {
    red: "#c72121",
    green: "#35a135",
    blue: "#3161b9",
    redGreen: "#c9be28",
    redBlue: "#e110bf",
    greenBlue: "#05b9b9",
    redGreenBlue: "#949494",
    stroke: "#000000",
    border: "#000000",
    background: "#383838",
    backgroundLine: "#949494",
    overlayFill: "rgba(0, 0, 0, 0.5)",
    overlayStroke: "#000",
};

const STAT_INPUTS = [
    ["Mean:", "inputMean"],
    ["Median:", "inputMedian"],
    ["Mode:", "inputMode"],
    ["Std Dev:", "inputStd"],
    ["Pixels:", "inputPixels"],
    ["Level:", "inputLevel"],
    ["Count:", "inputCount"],
    ["Percentile:", "inputPercentile"],
] as const;

export class Ui {
    svgManager: manager.Svg;
    histogram: core.Histogram;
    parent: Element;
    viewBoxWidth = 256;
    viewBoxHeight = 100;
    prevMouseDownPoint: SVGPoint | null = null;
    colors: ColorScheme;
    id: ElementIds;

    constructor(parent: Element, source: HTMLCanvasElement | HTMLImageElement, options?: UiOptions) {
        const opts = options ?? {};
        const optColors = opts.colors ?? {};

        this.colors = {
            red: optColors.red ?? DEFAULT_COLORS.red,
            green: optColors.green ?? DEFAULT_COLORS.green,
            blue: optColors.blue ?? DEFAULT_COLORS.blue,
            redGreen: optColors.redGreen ?? DEFAULT_COLORS.redGreen,
            redBlue: optColors.redBlue ?? DEFAULT_COLORS.redBlue,
            greenBlue: optColors.greenBlue ?? DEFAULT_COLORS.greenBlue,
            redGreenBlue: optColors.redGreenBlue ?? DEFAULT_COLORS.redGreenBlue,
            stroke: optColors.stroke ?? DEFAULT_COLORS.stroke,
            border: optColors.border ?? DEFAULT_COLORS.border,
            background: optColors.background ?? DEFAULT_COLORS.background,
            backgroundLine: optColors.backgroundLine ?? DEFAULT_COLORS.backgroundLine,
            overlayFill: optColors.overlayFill ?? DEFAULT_COLORS.overlayFill,
            overlayStroke: optColors.overlayStroke ?? DEFAULT_COLORS.overlayStroke,
        };

        this.id = {
            btnRefresh: util.id("btnRefresh"),
            btnStatsToggle: util.id("btnStatsToggle"),
            containerControls: util.id("containerControls"),
            containerHistogram: util.id("containerHistogram"),
            containerStats: util.id("containerStats"),
            inputMean: util.id("inputMean"),
            inputMedian: util.id("inputMedian"),
            inputMode: util.id("inputMode"),
            inputStd: util.id("inputStd"),
            inputPixels: util.id("inputPixels"),
            inputLevel: util.id("inputLevel"),
            inputCount: util.id("inputCount"),
            inputPercentile: util.id("inputPercentile"),
            rectOverlay: util.id("rectOverlay"),
            selectChannels: util.id("selectChannels"),
            textStatus: util.id("textStatus"),
        };

        this.parent = parent;
        this.createSkeleton(parent);
        const svgParent = document.getElementById(this.id.containerHistogram)!;
        this.svgManager = manager.Svg.create(svgParent, {
            viewBox: `0 0 ${this.viewBoxWidth} ${this.viewBoxHeight}`,
            width: opts.width ?? "100%",
            height: opts.height ?? "256",
            preserveAspectRatio: "none",
            style: "mix-blend-mode: normal",
            class: "histogram-svg",
        });

        this.histogram = new core.Histogram(source);
        this._addEventListeners();
        this.render();
    }

    selectedChannel(): HistogramChannel {
        return parseInt((document.getElementById(this.id.selectChannels) as HTMLSelectElement).value, 10);
    }

    render(): void {
        const channel = this.selectedChannel();
        this.svgManager.clear();
        this.renderHistogramBackground();
        if (channel === HistogramChannel.Colors) {
            this.renderColorHistogram();
        } else {
            this.renderSingleHistogram();
        }
        this.svgManager.rect(0, 0, 0, 0, {
            fill: this.colors.overlayFill,
            stroke: this.colors.overlayStroke,
            "stroke-width": 1.0,
            id: this.id.rectOverlay,
        });

        this.updateStats();
    }

    refresh(): void {
        this.histogram.refresh();
        this.render();
    }

    private createContainerControls(parent: Element): void {
        const container = util.createElement(
            "div",
            { class: "histogram-controls", id: this.id.containerControls },
            parent
        );
        const containerChannels = util.createElement("div", { class: "histogram-channels" }, container);
        const label = util.createElement("label", { for: this.id.selectChannels }, containerChannels);
        label.innerHTML = "Channels:";

        const channels = util.EnumEx.getNamesAndValues(HistogramChannel);
        const select = util.createElement("select", { id: this.id.selectChannels }, containerChannels);
        for (const { name, value } of channels) {
            const option = util.createElement("option", { value: value.toString() }, select);
            option.innerHTML = name;
        }

        const containerButtons = util.createElement("div", { class: "histogram-buttons" }, container);
        const anchorStats = util.createElement(
            "a",
            { href: "#", class: "histogram-button", id: this.id.btnStatsToggle, title: "Hide Stats Bar" },
            containerButtons
        );
        util.createElement("i", { class: "fa fa-bars" }, anchorStats);

        const anchorRefresh = util.createElement(
            "a",
            { href: "#", class: "histogram-button", id: this.id.btnRefresh, title: "Refresh Data" },
            containerButtons
        );
        util.createElement("i", { class: "fa fa-refresh" }, anchorRefresh);
    }

    private createContainerHistogram(parent: Element): void {
        util.createElement("div", { class: "histogram", id: this.id.containerHistogram }, parent);
    }

    private createContainerStats(parent: Element): void {
        const container = util.createElement("div", { class: "histogram-stats", id: this.id.containerStats }, parent);
        const innerContainer = util.createElement("div", undefined, container);
        const ul = util.createElement("ul", undefined, innerContainer);

        for (const [label, inputId] of STAT_INPUTS) {
            const li = util.createElement("li", undefined, ul);
            const labelEl = util.createElement("label", { for: inputId }, li);
            labelEl.innerHTML = label;
            util.createElement("input", { id: inputId, type: "text", readonly: "", value: "" }, li);
        }
    }

    private createSkeleton(parent: Element): void {
        const container = util.createElement("div", { class: "histogram-container" }, parent);
        this.createContainerControls(container);
        this.createContainerHistogram(container);
        this.createContainerStats(container);
    }

    private clearOverlay(): void {
        const rect = document.getElementById(this.id.rectOverlay)!;
        rect.setAttributeNS(null, "x", "0");
        rect.setAttributeNS(null, "y", "0");
        rect.setAttributeNS(null, "width", "0");
        rect.setAttributeNS(null, "height", "0");
    }

    private _addEventListeners(): void {
        const element = document.getElementById(this.id.btnRefresh)!;
        element.addEventListener("click", () => {
            this.refresh();
        });

        const btnStatsToggle = document.getElementById(this.id.btnStatsToggle)!;
        btnStatsToggle.addEventListener("click", () => {
            const stats = document.getElementById(this.id.containerStats)!;
            const button = document.getElementById(this.id.btnStatsToggle)!;
            const containerHist = document.getElementById(this.id.containerHistogram)!;
            const icon = button.firstChild as Element;

            if (stats.classList.contains("hidden")) {
                stats.classList.remove("hidden");
                icon.classList.remove("gray");
                containerHist.classList.remove("nostats");
                button.title = "Hide Stats Bar";
            } else {
                stats.classList.add("hidden");
                icon.classList.add("gray");
                containerHist.classList.add("nostats");
                button.title = "Show Stats Bar";
            }
        });

        const selectChannels = document.getElementById(this.id.selectChannels)!;
        // firefox doesn't fire change event on keyboard input until focus is changed
        selectChannels.addEventListener("change", () => {
            this.render();
        });

        this.svgManager.element.addEventListener("mousedown", (e: MouseEvent) => {
            this.handleMouseDown(e);
        });

        this.svgManager.element.addEventListener("mousemove", (e: MouseEvent) => {
            this.handleMouseMove(e);
        });

        this.svgManager.element.addEventListener("mouseup", () => {
            this.prevMouseDownPoint = null;
            this.clearOverlay();
        });

        this.svgManager.element.addEventListener("mouseleave", () => {
            this.prevMouseDownPoint = null;
            this.clearOverlay();
        });
    }

    private handleMouseDown(e: MouseEvent): void {
        const channel = this.selectedChannel();
        const pt = util.clientXY2SvgPoint(this.svgManager.element as SVGSVGElement, e.clientX, e.clientY);
        const bin = Math.min(255, Math.max(0, Math.round(pt.x)));

        const inputLevel = document.getElementById(this.id.inputLevel) as HTMLInputElement;
        const inputCount = document.getElementById(this.id.inputCount) as HTMLInputElement;
        const inputPercentile = document.getElementById(this.id.inputPercentile) as HTMLInputElement;

        inputLevel.value = `${bin}..${bin}`;

        const { count, percent } = this.getChannelValue(channel, bin);
        inputCount.value = count.toString(10);
        inputPercentile.value = percent.toFixed(2);
        this.prevMouseDownPoint = pt;
    }

    private handleMouseMove(e: MouseEvent): void {
        if ((e.buttons ?? 0) === 0 || !this.prevMouseDownPoint) {
            return;
        }

        const pt = util.clientXY2SvgPoint(this.svgManager.element as SVGSVGElement, e.clientX, e.clientY);
        const x1 = this.prevMouseDownPoint.x;
        const x2 = pt.x;
        const x = Math.min(x1, x2);
        const width = Math.max(x1, x2) - x;

        const rect = document.getElementById(this.id.rectOverlay)!;
        rect.setAttributeNS(null, "x", x.toString(10));
        rect.setAttributeNS(null, "y", "0");
        rect.setAttributeNS(null, "width", width.toString(10));
        rect.setAttributeNS(null, "height", this.viewBoxHeight.toString(10));

        const channel = this.selectedChannel();
        const start = Math.max(0, Math.min(255, Math.round(Math.min(x1, x2))));
        const stop = Math.max(0, Math.min(255, Math.round(Math.max(x1, x2))));

        const { count, percent } = this.getChannelValueRange(channel, start, stop);

        const inputLevel = document.getElementById(this.id.inputLevel) as HTMLInputElement;
        const inputCount = document.getElementById(this.id.inputCount) as HTMLInputElement;
        const inputPercentile = document.getElementById(this.id.inputPercentile) as HTMLInputElement;

        inputCount.value = count.toString(10);
        inputPercentile.value = percent.toFixed(2);
        inputLevel.value = `${start}..${stop}`;
    }

    private getChannelData(channel: HistogramChannel): { hist: number[]; count: number; } {
        switch (channel) {
            case HistogramChannel.Red:
                return { hist: this.histogram.red, count: this.histogram.count.red };
            case HistogramChannel.Green:
                return { hist: this.histogram.green, count: this.histogram.count.green };
            case HistogramChannel.Blue:
                return { hist: this.histogram.blue, count: this.histogram.count.blue };
            case HistogramChannel.Luminance:
                return { hist: this.histogram.luminance, count: this.histogram.count.luminance };
            case HistogramChannel.RGB:
            case HistogramChannel.Colors:
                return { hist: this.histogram.rgb, count: this.histogram.count.rgb };
            default:
                throw new Error("channel not recognized");
        }
    }

    private getChannelValue(channel: HistogramChannel, bin: number): { count: number; percent: number; } {
        const { hist, count: total } = this.getChannelData(channel);
        const count = hist[bin];
        const percent = (100.0 * count) / total;
        return { count, percent };
    }

    private getChannelValueRange(
        channel: HistogramChannel,
        start: number,
        stop: number
    ): { count: number; percent: number; } {
        const { hist, count: total } = this.getChannelData(channel);
        let count = 0;
        for (let i = start; i <= stop; i++) {
            count += hist[i];
        }
        const percent = (100.0 * count) / total;
        return { count, percent };
    }

    private renderHistogramBackground(): void {
        // background color
        this.svgManager.rect(0, 0, this.viewBoxWidth, this.viewBoxHeight, { fill: this.colors.background });

        const smallStep = this.viewBoxWidth / 20;
        const bigStep = this.viewBoxWidth / 5;

        // 20 thin vertical lines
        for (let i = smallStep; i < this.viewBoxWidth; i += smallStep) {
            this.svgManager.line(i, 0, i, this.viewBoxHeight, {
                stroke: this.colors.backgroundLine,
                "stroke-width": 0.1,
            });
        }

        // 20 thin horizontal lines - same size as horizontal
        for (let i = smallStep; i < this.viewBoxHeight; i += smallStep) {
            this.svgManager.line(0, i, this.viewBoxWidth, i, {
                stroke: this.colors.backgroundLine,
                "stroke-width": 0.1,
            });
        }

        // 5 thick vertical lines every 5th thin line
        for (let i = bigStep; i < this.viewBoxWidth; i += bigStep) {
            this.svgManager.line(i, 0, i, this.viewBoxHeight, {
                stroke: this.colors.backgroundLine,
                "stroke-width": 0.2,
            });
        }
    }

    private renderSingleHistogram(): void {
        const channel = this.selectedChannel();
        const step = this.viewBoxWidth / 256;
        const offBottom = this.viewBoxHeight + 10;
        const offLeft = -10;
        const offRight = this.viewBoxWidth + 10;

        const { hist, count: total } = this.getChannelData(channel);
        let max = Math.max(...hist);
        // increase max so largest is 10% from the top of hist
        max *= 1.1;

        const dColor = new manager.SvgPathBuilder(this.svgManager).moveTo(0, this.viewBoxHeight);

        for (let i = 0; i < 256; i++) {
            let color = hist[i];
            // normalize so data fits in viewbox
            color *= this.viewBoxHeight / max;
            if (color <= 0) color = -10;
            dColor.lineTo(i, this.viewBoxHeight - color);
        }

        // return to bottom right corner and then to bottom left
        dColor.lineTo(offRight, offBottom).lineTo(offLeft, offBottom);

        const fill = this.getChannelColor(channel);
        dColor.build({ fill, stroke: this.colors.stroke, "stroke-width": 1.0 });
    }

    private getChannelColor(channel: HistogramChannel): string {
        switch (channel) {
            case HistogramChannel.Red:
                return this.colors.red;
            case HistogramChannel.Green:
                return this.colors.green;
            case HistogramChannel.Blue:
                return this.colors.blue;
            case HistogramChannel.Luminance:
            case HistogramChannel.RGB:
            case HistogramChannel.Colors:
                return this.colors.redGreenBlue;
            default:
                return this.colors.redGreenBlue;
        }
    }

    private renderColorHistogram(): void {
        const step = this.viewBoxWidth / 256;
        const offBottom = this.viewBoxHeight + 10;
        const offLeft = -10;
        const offRight = this.viewBoxWidth + 10;

        // increase max so largest is 10% from the top of hist
        const max = Math.max(this.histogram.max.red, this.histogram.max.green, this.histogram.max.blue) * 1.1;

        const builders = {
            red: new manager.SvgPathBuilder(this.svgManager).moveTo(0, this.viewBoxHeight),
            green: new manager.SvgPathBuilder(this.svgManager).moveTo(0, this.viewBoxHeight),
            blue: new manager.SvgPathBuilder(this.svgManager).moveTo(0, this.viewBoxHeight),
            redGreen: new manager.SvgPathBuilder(this.svgManager).moveTo(0, this.viewBoxHeight),
            redBlue: new manager.SvgPathBuilder(this.svgManager).moveTo(0, this.viewBoxHeight),
            greenBlue: new manager.SvgPathBuilder(this.svgManager).moveTo(0, this.viewBoxHeight),
            redGreenBlue: new manager.SvgPathBuilder(this.svgManager).moveTo(0, this.viewBoxHeight),
        };

        for (let i = 0; i < 256; i++) {
            let r = (this.histogram.red[i] * this.viewBoxHeight) / max;
            let g = (this.histogram.green[i] * this.viewBoxHeight) / max;
            let b = (this.histogram.blue[i] * this.viewBoxHeight) / max;

            if (r <= 0) r = -10;
            if (g <= 0) g = -10;
            if (b <= 0) b = -10;

            // Determine the sorted order of RGB values
            const sorted = this.sortChannels(r, g, b);
            const [lowest, mid, highest] = sorted.values;
            const { indices } = sorted;

            // Map the values to the appropriate builders based on their rank
            const valueMap = new Map([
                [0, lowest],    // lowest channel
                [1, mid],       // middle channel
                [2, highest],   // highest channel
            ]);

            // For each position, plot or skip based on the channel's rank
            const positions = [
                "red",
                "green",
                "blue",
                "redGreen",
                "redBlue",
                "greenBlue",
                "redGreenBlue",
            ] as const;
            const channelRanks = [indices.r, indices.g, indices.b];

            for (let pos = 0; pos < positions.length; pos++) {
                const builder = builders[positions[pos]];
                if (pos === 0) {
                    // red is drawn if it's the highest
                    builder.lineTo(i, channelRanks[0] === 2 ? this.viewBoxHeight - r : offBottom);
                } else if (pos === 1) {
                    // green is drawn if it's the highest
                    builder.lineTo(i, channelRanks[1] === 2 ? this.viewBoxHeight - g : offBottom);
                } else if (pos === 2) {
                    // blue is drawn if it's the highest
                    builder.lineTo(i, channelRanks[2] === 2 ? this.viewBoxHeight - b : offBottom);
                } else if (pos === 3) {
                    // redGreen (red vs green)
                    if (channelRanks[0] !== 2 && channelRanks[1] !== 2) {
                        builder.lineTo(i, channelRanks[0] > channelRanks[1] ? this.viewBoxHeight - r : this.viewBoxHeight - g);
                    } else {
                        builder.lineTo(i, offBottom);
                    }
                } else if (pos === 4) {
                    // redBlue (red vs blue)
                    if (channelRanks[0] !== 2 && channelRanks[2] !== 2) {
                        builder.lineTo(i, channelRanks[0] > channelRanks[2] ? this.viewBoxHeight - r : this.viewBoxHeight - b);
                    } else {
                        builder.lineTo(i, offBottom);
                    }
                } else if (pos === 5) {
                    // greenBlue (green vs blue)
                    if (channelRanks[1] !== 2 && channelRanks[2] !== 2) {
                        builder.lineTo(i, channelRanks[1] > channelRanks[2] ? this.viewBoxHeight - g : this.viewBoxHeight - b);
                    } else {
                        builder.lineTo(i, offBottom);
                    }
                } else if (pos === 6) {
                    // redGreenBlue is drawn if none are highest or the lowest is drawn
                    const hasHighest = channelRanks.includes(2);
                    if (!hasHighest) {
                        builder.lineTo(i, offBottom);
                    } else {
                        const lowestRank = channelRanks.indexOf(0);
                        const val = lowestRank === 0 ? r : lowestRank === 1 ? g : b;
                        builder.lineTo(i, this.viewBoxHeight - val);
                    }
                }
            }
        }

        // Close all paths and set fill colors
        const fillColors = [
            this.colors.red,
            this.colors.green,
            this.colors.blue,
            this.colors.redGreen,
            this.colors.redBlue,
            this.colors.greenBlue,
            this.colors.redGreenBlue,
        ];

        Object.entries(builders).forEach(([key, builder], idx) => {
            builder.lineTo(offRight, offBottom).lineTo(offLeft, offBottom);
            builder.build({ fill: fillColors[idx], stroke: this.colors.stroke, "stroke-width": 1.0 });
        });
    }

    private sortChannels(r: number, g: number, b: number): {
        values: [number, number, number];
        indices: { r: number; g: number; b: number; };
    } {
        const channels = [
            { value: r, index: 0 },
            { value: g, index: 1 },
            { value: b, index: 2 },
        ];
        const sorted = channels.sort((a, b) => a.value - b.value);

        const indices = { r: 0, g: 0, b: 0 };
        for (let i = 0; i < 3; i++) {
            if (sorted[i].index === 0) indices.r = i;
            else if (sorted[i].index === 1) indices.g = i;
            else indices.b = i;
        }

        return {
            values: [sorted[0].value, sorted[1].value, sorted[2].value],
            indices,
        };
    }

    private updateStats(): void {
        const channel = this.selectedChannel();
        const inputs = {
            mean: document.getElementById(this.id.inputMean) as HTMLInputElement,
            median: document.getElementById(this.id.inputMedian) as HTMLInputElement,
            mode: document.getElementById(this.id.inputMode) as HTMLInputElement,
            std: document.getElementById(this.id.inputStd) as HTMLInputElement,
            pixels: document.getElementById(this.id.inputPixels) as HTMLInputElement,
            level: document.getElementById(this.id.inputLevel) as HTMLInputElement,
            count: document.getElementById(this.id.inputCount) as HTMLInputElement,
            percentile: document.getElementById(this.id.inputPercentile) as HTMLInputElement,
        };

        const { hist, count: totalCount } = this.getChannelData(channel);
        const stats = {
            mean: this.histogram.mean,
            median: this.histogram.median,
            mode: this.histogram.mode,
            std: this.histogram.std,
            count: this.histogram.count,
        };

        const channelKey = this._getChannelKey(channel);
        inputs.mean.value = stats.mean[channelKey].toFixed(2);
        inputs.median.value = stats.median[channelKey].toString(10);
        inputs.mode.value = stats.mode[channelKey].toString(10);
        inputs.std.value = stats.std[channelKey].toFixed(2);
        inputs.pixels.value = stats.count[channelKey].toString(10);
        inputs.level.value = "0..255";
        inputs.count.value = totalCount.toString(10);
        inputs.percentile.value = "100.00";
    }

    private _getChannelKey(channel: HistogramChannel): keyof typeof this.histogram.mean {
        switch (channel) {
            case HistogramChannel.Red:
                return "red";
            case HistogramChannel.Green:
                return "green";
            case HistogramChannel.Blue:
                return "blue";
            case HistogramChannel.Luminance:
                return "luminance";
            case HistogramChannel.RGB:
            case HistogramChannel.Colors:
                return "rgb";
            default:
                return "rgb";
        }
    }
}



=======
/// <reference path="util.ts" />
/// <reference path="manager.ts" />
/// <reference path="histogram.ts" />

module PhotoHistogram {
    export enum HistogramChannel {Colors, Red, Green, Blue, Luminance, RGB}

    export interface UiOptions {
        width?: string, // any valid css width in string form (e.g. '100' and '100%')
        height?: string, // any valid css width in string form
        colors?: { // any valid css colors in string form (e.g. '#000', 'rgba(0,0,0,0)', '#FFF000')
            red?: string,
            green?: string,
            blue?: string,
            redGreen?: string,
            redBlue?: string,
            greenBlue?: string,
            redGreenBlue?: string,
            stroke?: string,
            border?: string,
            background?: string,
            backgroundLine?: string,
            overlayFill?: string,
            overlayStroke?: string,
        }
    }

    export class Ui {
        svgManager: Manager.Svg;
        histogram: Core.Histogram;
        parent: Element;
        viewBoxWidth: number = 256;
        viewBoxHeight: number = 100;
        prevMouseDownPoint: SVGPoint;
        colors: {
            red: string,
            green: string,
            blue: string,
            redGreen: string,
            redBlue: string,
            greenBlue: string,
            redGreenBlue: string,
            stroke: string,
            border: string,
            background: string,
            backgroundLine: string,
            overlayFill?: string,
            overlayStroke?: string,
        };
        id: {
            btnRefresh: string,
            btnStatsToggle: string,
            containerControls: string,
            containerHistogram: string,
            containerStats: string,
            inputMean: string,
            inputMedian: string,
            inputMode: string,
            inputStd: string,
            inputPixels: string,
            inputLevel: string,
            inputCount: string,
            inputPercentile: string,
            rectOverlay: string,
            selectChannels: string,
            textStatus: string
        };

        constructor(parent: Element, source: HTMLCanvasElement | HTMLImageElement, options?: UiOptions) {
            if (!options) options = {};
            if (!options.colors) options.colors = {};
            this.colors = {
                red: options.colors.red || '#c72121', //'#E63348',
                green: options.colors.green || '#35a135', //'#4EB240',
                blue: options.colors.blue || '#3161b9',// '#5E7DD8',
                redGreen: options.colors.redGreen || '#c9be28', //'#EFE339',
                redBlue: options.colors.redBlue || '#e110bf', //'#B9009C',
                greenBlue: options.colors.greenBlue || '#05b9b9', //'#41CDCC',
                redGreenBlue: options.colors.redGreenBlue || '#949494', //'#A2A2A2',
                stroke: options.colors.stroke || '#000000',
                border: options.colors.border || '#000000',
                background: options.colors.background || '#383838', //'#393939',
                backgroundLine: options.colors.backgroundLine || '#949494', //'#A2A2A2',
                overlayFill: options.colors.overlayFill || 'rgba(0, 0, 0, 0.5)',
                overlayStroke: options.colors.overlayStroke || '#000',
            };
            this.id = {
                btnRefresh: Util.Random.id('btnRefresh'),
                btnStatsToggle: Util.Random.id('btnStatsToggle'),
                containerControls: Util.Random.id('containerControls'),
                containerHistogram: Util.Random.id('containerHistogram'),
                containerStats: Util.Random.id('containerStats'),
                inputMean: Util.Random.id('inputMean'),
                inputMedian: Util.Random.id('inputMedian'),
                inputMode: Util.Random.id('inputMode'),
                inputStd: Util.Random.id('inputStd'),
                inputPixels: Util.Random.id('inputPixels'),
                inputLevel: Util.Random.id('inputLevel'),
                inputCount: Util.Random.id('inputCount'),
                inputPercentile: Util.Random.id('inputPercentile'),
                rectOverlay: Util.Random.id('rectOverlay'),
                selectChannels: Util.Random.id('selectChannels'),
                textStatus: Util.Random.id('textStatus'),
            };
            this.parent = parent;
            this._createSkeleton(parent);
            var svgParent = document.getElementById(this.id.containerHistogram);
            this.svgManager = Manager.Svg.create(svgParent, {
                viewBox: '0 0 ' + this.viewBoxWidth + ' ' + this.viewBoxHeight,
                width: options.width || '100%',
                height: options.height || '256',
                preserveAspectRatio: 'none',
                style: 'mix-blend-mode: normal',
                'class': 'histogram-svg',
            });
            this.histogram = new Core.Histogram(source);
            this.prevMouseDownPoint = null;
            this._addEventListeners();
            this.render();
        }

        selectedChannel(): HistogramChannel {
            return parseInt((<HTMLSelectElement> document.getElementById(this.id.selectChannels)).value, 10);
        }

        render(): void {
            var channel = this.selectedChannel();
            this.svgManager.clear();
            this._renderHistogramBackground();
            if (channel == HistogramChannel.Colors) {
                this._renderColorHistogram();
            } else {
                this._renderSingleHistogram();
            }
            this.svgManager.rect(0, 0, 0, 0, {'fill': this.colors.overlayFill, 'stroke': this.colors.overlayStroke, 'stroke-width': 1.0, 'id': this.id.rectOverlay});

            this._updateStats();
        }

        refresh(): void {
            this.histogram.refresh();
            this.render();
        }

        _createContainerControls(parent: Element): void {
            var container = Util.DOM.createElement('div', {'class': 'histogram-controls', 'id': this.id.containerControls}, parent);
            var containerChannels = Util.DOM.createElement('div', {'class': 'histogram-channels'}, container);
            var label = Util.DOM.createElement('label', {'for': this.id.selectChannels}, containerChannels);
            label.innerHTML = 'Channels:';
            var channels = Util.Extension.EnumEx.getNamesAndValues(HistogramChannel);
            var select = Util.DOM.createElement('select', {'id': this.id.selectChannels}, containerChannels);
            for (var i = 0; i < channels.length; i++) {
                var option = Util.DOM.createElement('option', {'value': channels[i].value}, select);
                option.innerHTML = channels[i].name;
            }

            var containerButtons = Util.DOM.createElement('div', {'class': 'histogram-buttons'}, container);
            var anchorStats = Util.DOM.createElement('a', {'href': '#', 'class': 'histogram-button', 'id': this.id.btnStatsToggle, 'title': 'Hide Stats Bar'}, containerButtons);
            var iStats = Util.DOM.createElement('i', {'class': 'fa fa-bars'}, anchorStats);
            var anchorRefresh = Util.DOM.createElement('a', {'href': '#', 'class': 'histogram-button', 'id': this.id.btnRefresh, 'title': 'Refresh Data'}, containerButtons);
            var iRefres = Util.DOM.createElement('i', {'class': 'fa fa-refresh'}, anchorRefresh);
        }

        _createContainerHistogram(parent: Element): void {
            var container = Util.DOM.createElement('div', {'class': 'histogram', 'id': this.id.containerHistogram}, parent);
        }

        _createContainerStats(parent: Element): void {
            var container = Util.DOM.createElement('div', {'class': 'histogram-stats', 'id': this.id.containerStats}, parent);
           container = Util.DOM.createElement('div', undefined, container);
            var ul = Util.DOM.createElement('ul', undefined, container);
            var values = [['Mean:', this.id.inputMean],['Median:', this.id.inputMedian],['Mode:', this.id.inputMode],['Std Dev:', this.id.inputStd],['Pixels:', this.id.inputPixels],['Level:', this.id.inputLevel],['Count:', this.id.inputCount],['Percentile:', this.id.inputPercentile]];
            for (var i = 0; i < values.length; i++) {
                var li = Util.DOM.createElement('li', undefined, ul);
                var label = Util.DOM.createElement('label', {'for': values[i][1]}, li);
                label.innerHTML = values[i][0];
                Util.DOM.createElement('input', {'id': values[i][1], 'type': 'text', 'readonly': '', 'value': ''}, li);
            }
        }

        _createSkeleton(parent: Element): void {
            var container = Util.DOM.createElement('div', {'class': 'histogram-container'}, parent);
            this._createContainerControls(container);
            this._createContainerHistogram(container);
            this._createContainerStats(container);
        }

        _addEventListeners(): void {
            var hist = this;
            var element = document.getElementById(this.id.btnRefresh);
            element.addEventListener('click', function() {
                hist.refresh();
            });

            element = document.getElementById(this.id.btnStatsToggle);
            element.addEventListener('click', function() {
                var stats = document.getElementById(hist.id.containerStats);
                var button = document.getElementById(hist.id.btnStatsToggle);
                var containerHist = document.getElementById(hist.id.containerHistogram);
                var icon = <Element> button.firstChild;
                if (stats.classList.contains('hidden')) {
                    stats.classList.remove('hidden');
                    icon.classList.remove('gray');
                    containerHist.classList.remove('nostats');
                    button.title = 'Hide Stats Bar';
                } else {
                    stats.classList.add('hidden');
                    icon.classList.add('gray');
                    containerHist.classList.add('nostats');
                    button.title = 'Show Stats Bar';
                }
            });

            element = document.getElementById(this.id.selectChannels);
            // firefox doesn't fire change event on keyboard input until focus is changed
            element.addEventListener('change', function() {
                hist.render();
            });

            this.svgManager.element.addEventListener('mousedown', function(e: MouseEvent) {
                var channel = hist.selectedChannel();
                var inputLevel = <HTMLInputElement> document.getElementById(hist.id.inputLevel);
                var inputCount = <HTMLInputElement> document.getElementById(hist.id.inputCount);
                var inputPercentile = <HTMLInputElement> document.getElementById(hist.id.inputPercentile);

                var pt: SVGPoint = Util.Convert.clientXY2SvgPoint(<SVGSVGElement>hist.svgManager.element, e.clientX, e.clientY);
                var bin = Math.min(255, Math.max(0, Math.round(pt.x)));
                inputLevel.value = bin.toString(10) + '..' + bin.toString(10);

                var count: number, percent: number;
                if (channel == HistogramChannel.Red) {
                    count = hist.histogram.red[bin];
                    percent = 100.0 * count / hist.histogram.count.red;
                } else if (channel == HistogramChannel.Green) {
                    count = hist.histogram.green[bin];
                    percent = 100.0 * count / hist.histogram.count.green;
                } else if (channel == HistogramChannel.Blue) {
                    count = hist.histogram.blue[bin];
                    percent = 100.0 * count / hist.histogram.count.blue;
                } else if (channel == HistogramChannel.Luminance) {
                    count = hist.histogram.luminance[bin];
                    percent = 100.0 * count / hist.histogram.count.luminance;
                } else if (channel == HistogramChannel.RGB || channel == HistogramChannel.Colors) {
                    count = hist.histogram.rgb[bin];
                    percent = 100.0 * count / hist.histogram.count.rgb;
                }
                inputCount.value = count.toString(10);
                inputPercentile.value = percent.toFixed(2);
                hist.prevMouseDownPoint = pt;
            });

            this.svgManager.element.addEventListener('mousemove', function(e: MouseEvent) {
                if (e.buttons > 0 && hist.prevMouseDownPoint != null) {
                    var x1 = hist.prevMouseDownPoint.x;
                    var pt = Util.Convert.clientXY2SvgPoint(<SVGSVGElement>hist.svgManager.element, e.clientX, e.clientY);
                    var x2 = pt.x;

                    var x = Math.min(x1, x2);
                    var y = 0;
                    var width = Math.max(x1, x2) - x;
                    var height = hist.viewBoxHeight;
                    var rect = document.getElementById(hist.id.rectOverlay);
                    rect.setAttributeNS(null, 'x', x.toString(10));
                    rect.setAttributeNS(null, 'y', y.toString(10));
                    rect.setAttributeNS(null, 'width', width.toString(10));
                    rect.setAttributeNS(null, 'height', height.toString(10));

                    var channel = hist.selectedChannel();
                    var inputLevel = <HTMLInputElement> document.getElementById(hist.id.inputLevel);
                    var inputCount = <HTMLInputElement> document.getElementById(hist.id.inputCount);
                    var inputPercentile = <HTMLInputElement> document.getElementById(hist.id.inputPercentile);

                    var count = 0, percent: number;
                    var start = Math.max(0, Math.min(255, Math.round(Math.min(x1, x2))));
                    var stop = Math.max(0, Math.min(255, Math.round(Math.max(x1, x2))));
                    if (channel == HistogramChannel.Red) {
                        for (var i = start; i <= stop; i++) {
                            count += hist.histogram.red[i];
                        }
                        percent = 100.0 * count / hist.histogram.count.red;
                    } else if (channel == HistogramChannel.Green) {
                        for (var i = start; i <= stop; i++) {
                            count += hist.histogram.green[i];
                        }
                        percent = 100.0 * count / hist.histogram.count.green;
                    } else if (channel == HistogramChannel.Blue) {
                        for (var i = start; i <= stop; i++) {
                            count += hist.histogram.blue[i];
                        }
                        percent = 100.0 * count / hist.histogram.count.blue;
                    } else if (channel == HistogramChannel.Luminance) {
                        for (var i = start; i <= stop; i++) {
                            count += hist.histogram.luminance[i];
                        }
                        percent = 100.0 * count / hist.histogram.count.luminance;
                    } else if (channel == HistogramChannel.RGB || channel == HistogramChannel.Colors) {
                        for (var i = start; i <= stop; i++) {
                            count += hist.histogram.rgb[i];
                        }
                        percent = 100.0 * count / hist.histogram.count.rgb;
                    }
                    inputCount.value = count.toString(10);
                    inputPercentile.value = percent.toFixed(2);
                    inputLevel.value = '' + start + '..' + stop;
                }
            });

            this.svgManager.element.addEventListener('mouseup', function(e: MouseEvent) {
                hist.prevMouseDownPoint = null;
                var rect = document.getElementById(hist.id.rectOverlay);
                rect.setAttributeNS(null, 'x', '0');
                rect.setAttributeNS(null, 'y', '0');
                rect.setAttributeNS(null, 'width', '0');
                rect.setAttributeNS(null, 'height', '0');
            });

            this.svgManager.element.addEventListener('mouseleave', function(e: MouseEvent) {
                hist.prevMouseDownPoint = null;
                var rect = document.getElementById(hist.id.rectOverlay);
                rect.setAttributeNS(null, 'x', '0');
                rect.setAttributeNS(null, 'y', '0');
                rect.setAttributeNS(null, 'width', '0');
                rect.setAttributeNS(null, 'height', '0');
            });
        }

        _renderHistogramBackground(): void {
            // background color
            this.svgManager.rect(0, 0, this.viewBoxWidth, this.viewBoxHeight, {'fill': this.colors.background});
            var smallStep = this.viewBoxWidth/20;
            var bigStep = this.viewBoxWidth/5;
            // 20 thin vertical lines
            for (var i = smallStep; i < this.viewBoxWidth; i += smallStep) {
                this.svgManager.line(i, 0, i, this.viewBoxHeight, {'stroke': this.colors.backgroundLine, 'stroke-width': 0.1});
            }
            // 20 thin horizontal lines - same size as horizontal
            for (var i = smallStep; i < this.viewBoxHeight; i += smallStep) {
                this.svgManager.line(0, i, this.viewBoxWidth, i, {'stroke': this.colors.backgroundLine, 'stroke-width': 0.1});
            }
            // 5 thick vertical lines every 5th thin line
            for (var i = bigStep; i < this.viewBoxWidth; i += bigStep) {
                this.svgManager.line(i, 0, i, this.viewBoxHeight, {'stroke': this.colors.backgroundLine, 'stroke-width': 0.2});
            }
        }

        _renderSingleHistogram(): void {
            var channel = this.selectedChannel();
            var start: number;
            var step = this.viewBoxWidth / 256;
            var color: number;
            var offBottom = this.viewBoxHeight+10;
            var offLeft = -10;
            var offRight = this.viewBoxWidth+10;

            // increase max so largest is 10% from the top of hist
            var max: number;
            if (channel == HistogramChannel.Red) {
                max = this.histogram.max.red;
            } else if (channel == HistogramChannel.Green) {
                max = this.histogram.max.green;
            } else if (channel == HistogramChannel.Blue) {
                max = this.histogram.max.blue;
            } else if (channel == HistogramChannel.Luminance) {
                max = this.histogram.max.luminance;
            } else if (channel == HistogramChannel.RGB) {
                max = this.histogram.max.rgb;
            } else {
                throw new Error('channel not recognized');
            }
            max *= 1.1;

            var dColor = (new Manager.SvgPathBuilder(this.svgManager)).moveTo(0, this.viewBoxHeight);
            for (var i = 0; i < 256; i++) {
                if (channel == HistogramChannel.Red) {
                    color = this.histogram.red[i];
                } else if (channel == HistogramChannel.Green) {
                    color = this.histogram.green[i];
                } else if (channel == HistogramChannel.Blue) {
                    color = this.histogram.blue[i];
                } else if (channel == HistogramChannel.Luminance) {
                    color = this.histogram.luminance[i];
                } else if (channel == HistogramChannel.RGB) {
                    color = this.histogram.rgb[i];
                }
                // normalize so data fits in viewbox
                color *= this.viewBoxHeight / max;
                start = i * step;
                if (color <= 0) color = -10;
                dColor.lineTo(i, this.viewBoxHeight - color);
            }
            // return to bottom right corner and then to bottom left
            dColor.lineTo(offRight, offBottom).lineTo(offLeft, offBottom);

            var fill: string;
            if (channel == HistogramChannel.Red) {
                fill = this.colors.red;
            } else if (channel == HistogramChannel.Green) {
                fill = this.colors.green;
            } else if (channel == HistogramChannel.Blue) {
                fill = this.colors.blue;
            } else if (channel == HistogramChannel.Luminance) {
                fill = this.colors.redGreenBlue;
            } else if (channel == HistogramChannel.RGB) {
                fill = this.colors.redGreenBlue;
            }

            dColor.build({'fill': fill, 'stroke': this.colors.stroke, 'stroke-width': 1.0});
        }

        _renderColorHistogram(): void {
            var start: number;
            var step = this.viewBoxWidth / 256;
            var r: number, g: number, b: number;
            // increase max so largest is 10% from the top of hist
            var max = Math.max(this.histogram.max.red, this.histogram.max.green, this.histogram.max.blue) * 1.1;

            var dRed = (new Manager.SvgPathBuilder(this.svgManager)).moveTo(0, this.viewBoxHeight);
            var dGreen = (new Manager.SvgPathBuilder(this.svgManager)).moveTo(0, this.viewBoxHeight);
            var dBlue = (new Manager.SvgPathBuilder(this.svgManager)).moveTo(0, this.viewBoxHeight);
            var dRedGreen = (new Manager.SvgPathBuilder(this.svgManager)).moveTo(0, this.viewBoxHeight);
            var dRedBlue = (new Manager.SvgPathBuilder(this.svgManager)).moveTo(0, this.viewBoxHeight);
            var dGreenBlue = (new Manager.SvgPathBuilder(this.svgManager)).moveTo(0, this.viewBoxHeight);
            var dRedGreenBlue = (new Manager.SvgPathBuilder(this.svgManager)).moveTo(0, this.viewBoxHeight);

            var offBottom = this.viewBoxHeight+10;
            var offLeft = -10;
            var offRight = this.viewBoxWidth+10;

            for (var i = 0; i < 256; i++) {
                r = this.histogram.red[i] * this.viewBoxHeight / max;
                g = this.histogram.green[i] * this.viewBoxHeight / max;
                b = this.histogram.blue[i] * this.viewBoxHeight / max;
                start = i * step;

                if (r >= g && r >= b && g >= b) {
                    if (r <= 0) r = -10;
                    if (g <= 0) g = -10;
                    if (b <= 0) b = -10;
                    dRed.lineTo(i, this.viewBoxHeight-r);
                    dGreen.lineTo(i, offBottom);
                    dBlue.lineTo(i, offBottom);
                    dRedGreen.lineTo(i, this.viewBoxHeight-g);
                    dRedBlue.lineTo(i, offBottom);
                    dGreenBlue.lineTo(i, offBottom);
                    dRedGreenBlue.lineTo(i, this.viewBoxHeight-b);
                } else if (r >= g && r >= b && g < b) {
                    if (r <= 0) r = -10;
                    if (g <= 0) g = -10;
                    if (b <= 0) b = -10;
                    dRed.lineTo(i, this.viewBoxHeight-r);
                    dGreen.lineTo(i, offBottom);
                    dBlue.lineTo(i, offBottom);
                    dRedGreen.lineTo(i, offBottom);
                    dRedBlue.lineTo(i, this.viewBoxHeight-b);
                    dGreenBlue.lineTo(i, offBottom);
                    dRedGreenBlue.lineTo(i, this.viewBoxHeight-g);
                } else if (g >= r && g >= b && r >= b) {
                    if (r <= 0) r = -10;
                    if (g <= 0) g = -10;
                    if (b <= 0) b = -10;
                    dRed.lineTo(i, offBottom);
                    dGreen.lineTo(i, this.viewBoxHeight-g);
                    dBlue.lineTo(i, offBottom);
                    dRedGreen.lineTo(i, this.viewBoxHeight-r);
                    dRedBlue.lineTo(i, offBottom);
                    dGreenBlue.lineTo(i, offBottom);
                    dRedGreenBlue.lineTo(i, this.viewBoxHeight-b);
                } else if (g >= r && g >= b && r < b) {
                    if (r <= 0) r = -10;
                    if (g <= 0) g = -10;
                    if (b <= 0) b = -10;
                    dRed.lineTo(i, offBottom);
                    dGreen.lineTo(i, this.viewBoxHeight-g);
                    dBlue.lineTo(i, offBottom);
                    dRedGreen.lineTo(i, offBottom);
                    dRedBlue.lineTo(i, offBottom);
                    dGreenBlue.lineTo(i, this.viewBoxHeight-b);
                    dRedGreenBlue.lineTo(i, this.viewBoxHeight-r);
                } else if (b >= r && b >= g && r >= g) {
                    if (r <= 0) r = -10;
                    if (g <= 0) g = -10;
                    if (b <= 0) b = -10;
                    dRed.lineTo(i, offBottom);
                    dGreen.lineTo(i, offBottom);
                    dBlue.lineTo(i, this.viewBoxHeight-b);
                    dRedGreen.lineTo(i, offBottom);
                    dRedBlue.lineTo(i, this.viewBoxHeight-r);
                    dGreenBlue.lineTo(i, offBottom);
                    dRedGreenBlue.lineTo(i, this.viewBoxHeight-g);
                } else if (b >= r && b >= g && r < g) {
                    if (r <= 0) r = -10;
                    if (g <= 0) g = -10;
                    if (b <= 0) b = -10;
                    dRed.lineTo(i, offBottom);
                    dGreen.lineTo(i, offBottom);
                    dBlue.lineTo(i, this.viewBoxHeight-b);
                    dRedGreen.lineTo(i, offBottom);
                    dRedBlue.lineTo(i, offBottom);
                    dGreenBlue.lineTo(i, this.viewBoxHeight-g);
                    dRedGreenBlue.lineTo(i, this.viewBoxHeight-r);
                }
            }
            // return to bottom right corner and then to bottom left
            dRed.lineTo(offRight, offBottom).lineTo(offLeft, offBottom);
            dGreen.lineTo(offRight, offBottom).lineTo(offLeft, offBottom);
            dBlue.lineTo(offRight, offBottom).lineTo(offLeft, offBottom);
            dRedGreen.lineTo(offRight, offBottom).lineTo(offLeft, offBottom);
            dRedBlue.lineTo(offRight, offBottom).lineTo(offLeft, offBottom);
            dGreenBlue.lineTo(offRight, offBottom).lineTo(offLeft, offBottom);
            dRedGreenBlue.lineTo(offRight, offBottom).lineTo(offLeft, offBottom);

            dRed.build({'fill': this.colors.red, 'stroke': this.colors.stroke, 'stroke-width': 1.0});
            dGreen.build({'fill': this.colors.green, 'stroke': this.colors.stroke, 'stroke-width': 1.0});
            dBlue.build({'fill': this.colors.blue, 'stroke': this.colors.stroke, 'stroke-width': 1.0});
            dRedGreen.build({'fill': this.colors.redGreen, 'stroke': this.colors.stroke, 'stroke-width': 1.0});
            dRedBlue.build({'fill': this.colors.redBlue, 'stroke': this.colors.stroke, 'stroke-width': 1.0});
            dGreenBlue.build({'fill': this.colors.greenBlue, 'stroke': this.colors.stroke, 'stroke-width': 1.0});
            dRedGreenBlue.build({'fill': this.colors.redGreenBlue, 'stroke': this.colors.stroke, 'stroke-width': 1.0});
        }

        _updateStats(): void {
            var channel = this.selectedChannel();
            var inputMean = <HTMLInputElement> document.getElementById(this.id.inputMean);
            var inputMedian = <HTMLInputElement> document.getElementById(this.id.inputMedian);
            var inputMode = <HTMLInputElement> document.getElementById(this.id.inputMode);
            var inputStd = <HTMLInputElement> document.getElementById(this.id.inputStd);
            var inputPixels = <HTMLInputElement> document.getElementById(this.id.inputPixels);
            var inputLevel = <HTMLInputElement> document.getElementById(this.id.inputLevel);
            var inputCount = <HTMLInputElement> document.getElementById(this.id.inputCount);
            var inputPercentile = <HTMLInputElement> document.getElementById(this.id.inputPercentile);


            if (channel == HistogramChannel.Red) {
                inputMean.value = this.histogram.mean.red.toFixed(2);
                inputMedian.value = this.histogram.median.red.toString(10);
                inputMode.value = this.histogram.mode.red.toString(10);
                inputStd.value = this.histogram.std.red.toFixed(2);
                inputPixels.value = this.histogram.count.red.toString(10);
                inputLevel.value = '0..255';
                inputCount.value = this.histogram.count.red.toString(10);
                inputPercentile.value = '100.00';
            } else if (channel == HistogramChannel.Green) {
                inputMean.value = this.histogram.mean.green.toFixed(2);
                inputMedian.value = this.histogram.median.green.toString(10);
                inputMode.value = this.histogram.mode.green.toString(10);
                inputStd.value = this.histogram.std.green.toFixed(2);
                inputPixels.value = this.histogram.count.green.toString(10);
                inputLevel.value = '0..255';
                inputCount.value = this.histogram.count.green.toString(10);
                inputPercentile.value = '100.00';
            } else if (channel == HistogramChannel.Blue) {
                inputMean.value = this.histogram.mean.blue.toFixed(2);
                inputMedian.value = this.histogram.median.blue.toString(10);
                inputMode.value = this.histogram.mode.blue.toString(10);
                inputStd.value = this.histogram.std.blue.toFixed(2);
                inputPixels.value = this.histogram.count.blue.toString(10);
                inputLevel.value = '0..255';
                inputCount.value = this.histogram.count.blue.toString(10);
                inputPercentile.value = '100.00';
            } else if (channel == HistogramChannel.Luminance) {
                inputMean.value = this.histogram.mean.luminance.toFixed(2);
                inputMedian.value = this.histogram.median.luminance.toString(10);
                inputMode.value = this.histogram.mode.luminance.toString(10);
                inputStd.value = this.histogram.std.luminance.toFixed(2);
                inputPixels.value = this.histogram.count.luminance.toString(10);
                inputLevel.value = '0..255';
                inputCount.value = this.histogram.count.luminance.toString(10);
                inputPercentile.value = '100.00';
            } else if (channel == HistogramChannel.RGB) {
                inputMean.value = this.histogram.mean.rgb.toFixed(2);
                inputMedian.value = this.histogram.median.rgb.toString(10);
                inputMode.value = this.histogram.mode.rgb.toString(10);
                inputStd.value = this.histogram.std.rgb.toFixed(2);
                // red,green,blue counts = numPixels
                inputPixels.value = this.histogram.count.red.toString(10);
                inputLevel.value = '0..255';
                inputCount.value = this.histogram.count.rgb.toString(10);
                inputPercentile.value = '100.00';
            } else if (channel == HistogramChannel.Colors) {
                inputMean.value = this.histogram.mean.rgb.toFixed(2);
                inputMedian.value = this.histogram.median.rgb.toString(10);
                inputMode.value = this.histogram.mode.rgb.toString(10);
                inputStd.value = this.histogram.std.rgb.toFixed(2);
                // red,green,blue counts = numPixels
                inputPixels.value = this.histogram.count.red.toString(10);
                inputLevel.value = '0..255';
                inputCount.value = this.histogram.count.rgb.toString(10);
                inputPercentile.value = '100.00';
            }
        }
    }


}
>>>>>>> 4d7b2fa6dd216df63fab759b8f530b422147f6c8
