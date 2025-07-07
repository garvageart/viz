import { prepareMetadata } from '#/logger/util';
import { DateTime } from "luxon";

export type Metadata = {
    /**
     * Reserved for appending `LogContext` in logging payloads
     */
    __context__?: undefined;

    /**
     * Applied as Sentry breadcrumb types. Defaults to `default`.
     *
     * @see https://develop.sentry.dev/sdk/event-payloads/breadcrumbs/#breadcrumb-types
     */
    type?:
    | 'default'
    | 'debug'
    | 'error'
    | 'navigation'
    | 'http'
    | 'info'
    | 'query'
    | 'transaction'
    | 'ui'
    | 'user';

    /**
     * Passed through to `Sentry.captureException`
     *
     * @see https://github.com/getsentry/sentry-javascript/blob/903addf9a1a1534a6cb2ba3143654b918a86f6dd/packages/types/src/misc.ts#L65
     */
    tags?: {
        [key: string]: number | string | boolean | null | undefined;
    };

    /**
     * Any additional data, passed through to Sentry as `extra` param on
     * exceptions, or the `data` param on breadcrumbs.
     */
    [key: string]: Error | unknown;
};

export type Transport = (
    level: LogLevel,
    message: string | Error,
    metadata: Metadata,
    timestamp: number,
) => void;

export enum LogLevel {
    Debug = 'debug',
    Info = 'info',
    Log = 'log',
    Warn = 'warn',
    Error = 'error',
}

/**
 * Used in dev mode to nicely log to the console
 */
export const consoleTransport: Transport = (
    level: LogLevel,
    message: string | Error,
    metadata: Metadata,
    timestamp: number,
) => {
    const hasMetadata = Object.keys(metadata).length;
    const colorize = withColor(
        {
            [LogLevel.Debug]: colors.magenta,
            [LogLevel.Info]: colors.blue,
            [LogLevel.Log]: colors.green,
            [LogLevel.Warn]: colors.yellow,
            [LogLevel.Error]: colors.red,
        }[level],
    );

    let msg = `${colorize(DateTime.fromMillis(timestamp).toFormat("HH:mm:ss"))}`;
    if (message) {
        msg += ` ${message.toString()}`;
    }


    if (hasMetadata) {
        console.groupCollapsed(msg);
        console.log(metadata);
        console.groupEnd();
    } else {
        console.log(msg);
    }
    if (message instanceof Error) {
        // for stacktrace
        console.error(message);
    }

};

/**
 * Color handling copied from Kleur
 *
 * @see https://github.com/lukeed/kleur/blob/fa3454483899ddab550d08c18c028e6db1aab0e5/colors.mjs#L13
 */
const colors: {
    [key: string]: [number, number];
} = {
    default: [0, 0],
    blue: [36, 39],
    green: [32, 39],
    magenta: [35, 39],
    red: [31, 39],
    yellow: [33, 39],
};

function withColor([x, y]: [number, number]) {
    const rgx = new RegExp(`\\x1b\\[${y}m`, 'g');
    const open = `\x1b[${x}m`,
        close = `\x1b[${y}m`;

    return function (txt: string) {
        if (txt == null) return txt;

        return (
            open +
            (~('' + txt).indexOf(close) ? txt.replace(rgx, close + open) : txt) +
            close
        );
    };
}