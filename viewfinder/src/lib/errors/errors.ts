/**
 * Options interface for all Viz errors
 */
export interface VizErrorOptions {
    cause?: unknown;
    /** Custom error code */
    code?: string;
    /** Additional structured details */
    details?: Record<string, unknown>;
}

/**
 * Base class for all application errors.
 * Extends the built-in Error class with additional metadata support.
 */
export class VizError extends Error {
    public readonly code: string;
    public readonly details?: Record<string, unknown>;
    public readonly timestamp: string;

    constructor(message: string, options: VizErrorOptions = {}) {
        super(message, { cause: options.cause });

        this.name = "VizError";
        this.code = options.code || "UNKNOWN_ERROR";
        this.details = options.details;
        this.timestamp = new Date().toISOString();

        // capture stacks if they
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }

        Object.setPrototypeOf(this, new.target.prototype);
    }

    /**
     * Serializes the error to a plain object.
     */
    public toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack,
            cause:
                this.cause instanceof Error
                    ? {
                          name: this.cause.name,
                          message: this.cause.message,
                          stack: this.cause.stack
                      }
                    : this.cause
        };
    }

    toString() {
        return `${this.name} [${this.code}]: ${this.message}`;
    }
}

/**
 * Represents network-related failures (e.g. offline, DNS issues, timeout).
 */
export class NetworkError extends VizError {
    constructor(message: string = "A network error occurred.", options: VizErrorOptions = {}) {
        super(message, {
            code: "NETWORK_ERROR",
            ...options
        });
        this.name = "NetworkError";
    }
}
