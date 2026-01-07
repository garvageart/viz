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
            cause: this.cause instanceof Error ? {
                name: this.cause.name,
                message: this.cause.message,
                stack: this.cause.stack
            } : this.cause
        };
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

/**
 * Represents errors returned from the API (4xx/5xx responses).
 */
export class ApiError extends VizError {
    public readonly status: number;

    constructor(message: string, status: number, options: VizErrorOptions = {}) {
        super(message, {
            code: options.code || "API_ERROR",
            ...options
        });
        this.name = "ApiError";
        this.status = status;
    }

    public override toJSON() {
        return {
            ...super.toJSON(),
            status: this.status
        };
    }
}

/**
 * Specific API error for validation failures (4XX usually, defaults to 400).
 */
export class ValidationError extends ApiError {
    public readonly validationErrors: unknown[];

    constructor(message: string = "Validation failed.", validationErrors: unknown[] = [], status: number = 400, options: VizErrorOptions = {}) {
        super(message, status, {
            code: "VALIDATION_ERROR",
            details: { validationErrors },
            ...options
        });
        this.name = "ValidationError";
        this.validationErrors = validationErrors;
    }
}

/**
 * Specific API error for authentication failures (401 Unauthorized).
 */
export class UnauthorizedError extends ApiError {
    constructor(message: string = "Authentication required.", options: VizErrorOptions = {}) {
        super(message, 401, {
            code: "UNAUTHORIZED_ERROR",
            ...options
        });
        this.name = "UnauthorizedError";
    }
}

/**
 * Specific API error for permission failures (403 Forbidden).
 */
export class ForbiddenError extends ApiError {
    constructor(message: string = "You do not have permission to access this resource.", options: VizErrorOptions = {}) {
        super(message, 403, {
            code: "FORBIDDEN_ERROR",
            ...options
        });
        this.name = "ForbiddenError";
    }
}

/**
 * Specific API error for resource not found (404 Not Found).
 */
export class NotFoundError extends ApiError {
    constructor(message: string = "The requested resource was not found.", options: VizErrorOptions = {}) {
        super(message, 404, {
            code: "NOT_FOUND_ERROR",
            ...options
        });
        this.name = "NotFoundError";
    }
}
