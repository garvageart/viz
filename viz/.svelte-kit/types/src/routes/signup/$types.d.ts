import type * as Kit from '@sveltejs/kit';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] ***REMOVED*** : never;
// @ts-ignore
type MatcherParam<M> = M extends (param : string***REMOVED*** => param is infer U ? U extends string ? U : string : string;
type RouteParams = {  ***REMOVED***;
type RouteId = '/signup';
type MaybeWithVoid<T> = {***REMOVED*** extends T ? T | void : T;
export type RequiredKeys<T> = { [K in keyof T]-?: {***REMOVED*** extends { [P in K]: T[K] ***REMOVED*** ? never : K; ***REMOVED***[keyof T];
type OutputDataShape<T> = MaybeWithVoid<Omit<App.PageData, RequiredKeys<T>> & Partial<Pick<App.PageData, keyof T & keyof App.PageData>> & Record<string, any>>
type EnsureDefined<T> = T extends null | undefined ? {***REMOVED*** : T;
type OptionalUnion<U extends Record<string, any>, A extends keyof U = U extends U ? keyof U : never> = U extends unknown ? { [P in Exclude<A, keyof U>]?: never ***REMOVED*** & U : never;
export type Snapshot<T = any> = Kit.Snapshot<T>;
type PageParentData = EnsureDefined<import('../$types.js'***REMOVED***.LayoutData>;

export type PageServerData = null;
export type PageData = Expand<PageParentData>;
export type PageProps = { data: PageData ***REMOVED***