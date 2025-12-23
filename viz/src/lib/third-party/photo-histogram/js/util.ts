<<<<<<< HEAD
/**
 * Count the number of elements in a histogram
 */
export function cnt(histogram: number[]): number {
    let count = 0;
    for (let i = 0; i < histogram.length; i++) {
        count += histogram[i];
    }
    return count;
}

/**
 * Return the middle index of a histogram. Middle index of histogram with count of 5 == 3, and
 * middle index of 6 == 3.
 */
export function middleIndex(histogram: number[]): number {
    const totalCount = cnt(histogram);
    let middleIndex = Math.floor(totalCount / 2);
    if (totalCount > 1 && totalCount % 2 === 1) middleIndex += 1;
    return middleIndex;
}

/**
 * Calculate the mean from a histogram array
 */
export function mean(histogram: number[]): number {
    let count = 0;
    let sum = 0;
    for (let i = 0; i < histogram.length; i++) {
        count += histogram[i];
        sum += i * histogram[i];
    }
    return sum / count;
}

/**
 * Calculate the median from a histogram array
 */
export function median(histogram: number[]): number {
    let count = 0;
    let i = 0;
    const mi = middleIndex(histogram);
    while (count < mi) {
        count += histogram[i++];
    }
    return i - 1;
}

/**
 * Calculate the mode from a histogram array
 */
export function mode(histogram: number[]): number {
    let max = 0;
    let bin = 0;
    for (let i = 0; i < histogram.length; i++) {
        if (histogram[i] > max) {
            max = histogram[i];
            bin = i;
        }
    }
    return bin;
}

/**
 * Calculate the variance of a histogram array
 */
export function variance(histogram: number[]): number {
    const average = mean(histogram);
    let sum = 0;
    let count = 0;
    for (let i = 0; i < histogram.length; i++) {
        count += histogram[i];
        sum += histogram[i] * Math.pow(i - average, 2);
    }

    return sum / count;
}

/**
 * Calculate the standard deviation of a histogram array
 */
export function std(histogram: number[]): number {
    return Math.sqrt(variance(histogram));
}

/**
 * Returns a random integer between min (included) and max (included)
 */
export function integer(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a random base string concatenated with a random integer
 */
export function id(base: string): string {
    return base + integer(0, 1e10);
}

/**
 * Create a new element and set attributes
 */
export function createElement(
    tagName: string,
    attributes?: Record<string, any>,
    parent?: Element
): HTMLElement {
    const element = document.createElement(tagName);
    if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    }
    if (parent) {
        parent.appendChild(element);
    }
    return element;
}

/**
 * Create a new element with namespace and set attributes
 */
export function createElementNS(
    tagName: string,
    namespace: string,
    attributes?: Record<string, any>,
    parent?: Element
): Element {
    const element = document.createElementNS(namespace, tagName);
    if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttributeNS(null, key, String(value));
        });
    }
    if (parent) {
        parent.appendChild(element);
    }
    return element;
}

export class EnumEx {
    /**
     * Get names of enumeration
     */
    static getNames(e: any): string[] {
        return Object.keys(e).filter((v) => isNaN(parseInt(v, 10)));
    }

    /**
     * Get values of enumeration
     */
    static getValues(e: any): number[] {
        return Object.keys(e)
            .map((v) => parseInt(v, 10))
            .filter((v) => !isNaN(v));
    }

    /**
     * Get name/value pairs of enumeration
     */
    static getNamesAndValues(e: any): Array<{ name: string; value: number; }> {
        return EnumEx.getValues(e).map((v) => ({ name: e[v], value: v }));
    }
}

/**
 * Convert clientXY from a mouse event to scaled point on an svg element
 */
export function clientXY2SvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): SVGPoint {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(svg.getScreenCTM()!.inverse());
}



=======
module PhotoHistogram {
    export module Util {
        export module Histogram {
            /**
             * Count the number of elements in a histogram
             * @param histogram [number[]] index=bin value and value = count
             * @returns {number}
             */
            export function cnt(histogram: number[]): number {
                var count = 0;
                for (var i = 0; i < histogram.length; i++) {
                    count += histogram[i];
                }
                return count;
            }

            /**
             * Return the middle index of a histogram.  Middle index of histogram with count of 5 == 3, and
             * middle index of 6 == 3.
             * @param histogram [number[]] index=bin value and value = count
             * @returns {number}
             */
            export function middleIndex(histogram: number[]): number {
                var totalCount = cnt(histogram);
                var middleIndex = Math.floor(totalCount / 2);
                if (totalCount > 1 && totalCount % 2 == 1) middleIndex += 1;
                return middleIndex;
            }

            /**
             * Calculate the mean from a histogram array
             * @param histogram [number[]] index=bin value and value = count
             * @returns {number}
             */
            export function mean(histogram: number[]): number {
                var count = 0;
                var sum = 0;
                for (var i = 0; i < histogram.length; i++) {
                    count += histogram[i];
                    sum += i * histogram[i];
                }
                return sum / count;
            }

            /**
             * Calculate the mean from a histogram array
             * @param histogram [number[]] index=bin value and value = count
             * @returns {number}
             */
            export function median(histogram: number[]): number {
                var count = 0;
                var i = 0;
                var mi = middleIndex(histogram);
                while (count < mi) {
                    count += histogram[i++];
                }
                return i-1;
            }

            /**
             * Calculate the mode from a histogram array
             * @param histogram [number[]] index=bin value and value = count
             * @returns {number}
             */
            export function mode(histogram: number[]): number {
                var max = 0;
                var bin = 0;
                for (var i = 0; i < histogram.length; i++) {
                    if (histogram[i] > max) {
                        max = histogram[i];
                        bin = i;
                    }
                }
                return bin;
            }

            /**
             * Calculate the variance of a histogram array
             * @param histogram [number[]] index=bin value and value = count
             * @returns {number}
             */
            export function variance(histogram: number[]): number {
                var average = mean(histogram);
                var sum = 0;
                var count = 0;
                for (var i = 0; i < histogram.length; i++) {
                    count += histogram[i];
                    sum += histogram[i] * Math.pow(i-average, 2);
                }

                return sum / count;
            }

            /**
             * Calculate the standard deviation of a histogram array
             * @param histogram [number[]] index=bin value and value = count
             * @returns {number}
             */
            export function std(histogram: number[]): number {
                return Math.sqrt(variance(histogram));
            }
        }

        export module Random {
            /**
             * Returns a random integer between min (included) and max (included)
             * @param min [number] lower bound (inclusive)
             * @param max [number] upper bound (inclusive)
             * @returns {number}
             */
            export function integer(min:number, max:number) {
                // Returns a random integer between min (included) and max (included)
                // Using Math.round() will give you a non-uniform distribution!
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }

            /**
             * Returns a random base string concat with a random integer
             * @param base [string] base string
             * @returns {string}
             */
            export function id(base: string) {
                // append a random int to a string for use in ids
                return base + integer(0, 1e10);
            }
        }

        export module DOM {

            /**
             * Create a new element and set attributes
             * @param tagName: [string] type of element
             * @param attributes [{key: value}] optional key-value string attributes to set on element
             * @param parent [Element] option parent to append element
             * @returns {HTMLElement}
             */
            export function createElement(tagName: string, attributes?: {}, parent?: Element): HTMLElement {
                var element = document.createElement(tagName);
                if (attributes) {
                    var keys = Object.keys(attributes);
                    for (var i = 0; i < keys.length; i++) {
                        element.setAttribute(keys[i], attributes[keys[i]]);
                    }
                }
                if (parent) {
                    parent.appendChild(element);
                }
                return element;
            }

            /**
             * Create a new element with namespace and set attributes
             * @param tagName [string] type of element
             * @param namespace [string] namespace of element
             * @param attributes [{key: value}] key-value string attributes to set on element
             * @param parent [Element] option parent to append element
             * @returns {Element}
             */
            export function createElementNS(tagName: string, namespace: string, attributes?: {}, parent?: Element): Element {
                var element = document.createElementNS(namespace, tagName);
                if (attributes) {
                    var keys = Object.keys(attributes);
                    for (var i = 0; i < keys.length; i++) {
                        element.setAttributeNS(null, keys[i], attributes[keys[i].toString()]);
                    }
                }
                if (parent) {
                    parent.appendChild(element);
                }
                return element;
            }
        }

        export module Extension {
            export class EnumEx {
                /**
                 * Get names of enumeration
                 * @param e [Enum]
                 * @returns {string[]}
                 */
                static getNames(e: any) {
                    return Object.keys(e).filter(v => isNaN(parseInt(v, 10)));
                }

                /**
                 * Get values of enumeration
                 * @param e [Enum]
                 * @returns {number[]}
                 */
                static getValues(e: any) {
                    return Object.keys(e).map(v => parseInt(v, 10)).filter(v => !isNaN(v));
                }

                /**
                 * Get name/value pairs of enumeration
                 * @param e [Enum]
                 * @returns {{name: *, value: number}[]}
                 */
                static getNamesAndValues(e: any) {
                    return EnumEx.getValues(e).map(v => { return { name: e[v], value: v }; });
                }
            }
        }

        export module Convert {
            /**
             * Convert clientXY from a mouse event to scaled point on an svg element
             * @param svg [SVGSVGElement] svg element that client is over
             * @param clientX [number] clientX (e.g. mouseEvent.clientX)
             * @param clientY [number] clientY (e.g. mouseEvent.clientY)
             * @returns {SVGPoint}
             */
            export function clientXY2SvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): SVGPoint {
                var point = svg.createSVGPoint();
                point.x = clientX;
                point.y = clientY;
                return point.matrixTransform(svg.getScreenCTM().inverse());
            }
        }
    }
}
>>>>>>> 4d7b2fa6dd216df63fab759b8f530b422147f6c8
