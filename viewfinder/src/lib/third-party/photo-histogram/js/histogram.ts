import { tallyImageData } from "$lib/histogram/tally";

export interface HistogramStat {
    red: number;
    green: number;
    blue: number;
    luminance: number;
    rgb: number;
}

export interface HistogramChannelData {
    red: number[];
    green: number[];
    blue: number[];
    luminance: number[];
    rgb: number[];
}

export interface HistogramData {
    hist: HistogramChannelData;
    count: HistogramStat;
    max: HistogramStat;
    mean: HistogramStat;
    median: HistogramStat;
    mode: HistogramStat;
    stddev: HistogramStat;
}

/**
 * Calculates the histogram and statistics from a source canvas or image element
 */
export class Histogram {
    _source: HTMLCanvasElement | HTMLImageElement;
    _canvas: HTMLCanvasElement;
    _ctx: CanvasRenderingContext2D;
    _luminanceWeights: [number, number, number];
    data: HistogramData;
    private MAX_DIMENSION = 2048;

    /**
     * @param source - source element
     * @param luminanceWeights - array of weights to convert rgb to luminance
     */
    constructor(source: HTMLCanvasElement | HTMLImageElement, luminanceWeights: number[] = [0.2126, 0.7152, 0.0722]) {
        this._source = source;
        this._canvas = document.createElement("canvas");
        this._ctx = this._canvas.getContext("2d")!;
        if (luminanceWeights.length !== 3) {
            throw new Error("luminance weights must have 3 values that sum to one");
        }
        this._luminanceWeights = luminanceWeights.slice() as [number, number, number];
        this.data = this.calcData();
    }

    get red(): number[] {
        return this.data.hist.red;
    }

    get green(): number[] {
        return this.data.hist.green;
    }

    get blue(): number[] {
        return this.data.hist.blue;
    }

    get luminance(): number[] {
        return this.data.hist.luminance;
    }

    get rgb(): number[] {
        return this.data.hist.rgb;
    }

    get count(): HistogramStat {
        return this.data.count;
    }

    get mean(): HistogramStat {
        return this.data.mean;
    }

    get median(): HistogramStat {
        return this.data.median;
    }

    get mode(): HistogramStat {
        return this.data.mode;
    }

    get std(): HistogramStat {
        return this.data.stddev;
    }

    get max(): HistogramStat {
        return this.data.max;
    }

    private calcData(): HistogramData {
        const MAX_DIM = this.MAX_DIMENSION;
        let w = this._source.width || (this._source as HTMLImageElement).naturalWidth || 0;
        let h = this._source.height || (this._source as HTMLImageElement).naturalHeight || 0;

        if (w > MAX_DIM || h > MAX_DIM) {
            const scale = Math.min(MAX_DIM / w, MAX_DIM / h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
        }

        this._canvas.width = w;
        this._canvas.height = h;
        this._ctx.drawImage(this._source, 0, 0, w, h);
        const imageData = this._ctx.getImageData(0, 0, w, h);

        return tallyImageData(imageData, {
            luminanceWeights: this._luminanceWeights
        });
    }

    /**
     * Recalculate all data
     */
    refresh(): void {
        this.data = this.calcData();
    }
}
