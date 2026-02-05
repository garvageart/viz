import { generateRandomString } from "./misc";

export function generateKeyId(length = 10): string {
    return "sp-" + generateRandomString(length);
}