import type { HistogramChannelData, HistogramData, HistogramStat } from "$lib/third-party/photo-histogram/js/histogram";
import { mean, median, mode, std } from "$lib/third-party/photo-histogram/js/util";

/**
 * Default Rec. 709 luma weights used to derive a single luminance channel from RGB.
 */
export const LUMINANCE_WEIGHTS: [number, number, number] = [0.2126, 0.7152, 0.0722];

const CHANNELS = ["red", "green", "blue", "luminance", "rgb"] as const;

export interface TallyOptions {
    luminanceWeights?: [number, number, number];
}

/**
 * Tallies an RGBA pixel buffer into 256-bin histograms plus whole-image statistics.
 * Pure and environment-agnostic so it can run inside a Web Worker.
 */
export function tallyImageData(imageData: ImageData, options: TallyOptions = {}): HistogramData {
    const [wr, wg, wb] = options.luminanceWeights ?? LUMINANCE_WEIGHTS;

    const histograms: HistogramChannelData = {
        red: new Array(256).fill(0),
        green: new Array(256).fill(0),
        blue: new Array(256).fill(0),
        luminance: new Array(256).fill(0),
        rgb: new Array(256).fill(0)
    };

    const px = imageData.data;
    for (let i = 0; i < px.length; i += 4) {
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        const l = Math.floor(wr * r + wg * g + wb * b);

        histograms.red[r]++;
        histograms.green[g]++;
        histograms.blue[b]++;
        histograms.luminance[l]++;
        histograms.rgb[r]++;
        histograms.rgb[g]++;
        histograms.rgb[b]++;
    }

    const countRed = px.length / 4;

    const data: HistogramData = {
        hist: histograms,
        count: {
            red: countRed,
            green: countRed,
            blue: countRed,
            luminance: countRed,
            rgb: countRed * 3
        },
        max: { red: 0, green: 0, blue: 0, luminance: 0, rgb: 0 },
        mean: {} as HistogramStat,
        median: {} as HistogramStat,
        mode: {} as HistogramStat,
        stddev: {} as HistogramStat
    };

    for (const channel of CHANNELS) {
        const arr = histograms[channel];
        for (let i = 0; i < 256; i++) {
            data.max[channel] = Math.max(data.max[channel], arr[i]);
        }
        data.mean[channel] = mean(arr);
        data.median[channel] = median(arr);
        data.mode[channel] = mode(arr);
        data.stddev[channel] = std(arr);
    }
    // rgb is three tallies of equal size, so the mean is the average of the channels
    data.mean.rgb = (data.mean.red + data.mean.green + data.mean.blue) / 3;

    return data;
}
