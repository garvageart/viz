/**
 * Converts a date in EXIF format to a format that
 * can be parsed by the native ````Date```` object.
 * 
 * @param {String} EXIFDateTime A date in EXIF format that can be parsed by the function
 * @returns {Date} The parsed EXIF date as a native Date object
 */
export function convertEXIFDateTime(EXIFDateTime: string): Date {
    const EXIFDate = EXIFDateTime?.split(" ")[0];
    const EXIFTime = EXIFDateTime?.split(" ")[1];

    const EXIFDateFormated = EXIFDate?.replaceAll(":", "/");

    const EXIFDateTimeString = `${EXIFDateFormated} ${EXIFTime}`;
    const EXIFDateObject = new Date(EXIFDateTimeString);

    return EXIFDateObject;
}