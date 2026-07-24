import * as crypto from "crypto";
import dotenv from "dotenv";
import * as fs from "fs";
import { google } from "googleapis";
import * as path from "path";
import { addCollectionImages, createCollection, defaults, uploadImage } from "../../viewfinder/src/lib/api/client.gen";

// Load environment variables from root .env file
const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

// --- CLI FLAG PARSING ---
const args = process.argv.slice(2);

function getArgValue(flag: string): string | null {
    const idx = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
    if (idx === -1) return null;
    if (args[idx].includes("=")) return args[idx].split("=")[1];
    return args[idx + 1] || null;
}

function hasFlag(flag: string): boolean {
    return args.some((a) => a === flag);
}

function getMultiArgValues(flag: string): string[] {
    const values: string[] = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === flag && i + 1 < args.length) {
            values.push(args[i + 1]);
        } else if (args[i].startsWith(`${flag}=`)) {
            values.push(args[i].split("=")[1]);
        }
    }
    return values;
}

const dryRun = hasFlag("--dry-run");
const verbose = hasFlag("--verbose") || hasFlag("-v");
const help = hasFlag("--help") || hasFlag("-h");

if (help) {
    console.log(`
Viz Photo Migration Script
==========================
Usage: pnpm --filter scripts/js exec tsx migrate_photos.ts [options] [source_directory]

Options:
  --dry-run                Perform a trial run without uploading files or creating collections.
  --exclude <folder>       Exclude specific folder name (repeatable). E.g. --exclude "RAW Images"
  --email-report           Send email summary reports via Gmail API upon completion and periodically.
  --email-interval <mins>  Send periodic status update emails every N minutes (Default: 30).
  -v, --verbose            Enable detailed log output per file.
  -h, --help               Show this help message.

Environment Variables (.env):
  VIZ_URL                  Target Viz server (default: https://viz.local.les-is.online)
  VIZ_API_KEY              Viz API Key for authentication (Required)
  GCP_AUTH_FILE            Path to GCP Service Account JSON key (for Gmail API auth)
  REPORT_EMAIL_TO          Recipient email address for status reports
  REPORT_EMAIL_FROM        Sender email address (or 'me' for authenticated account)
`);
    process.exit(0);
}

const VIZ_URL = process.env.VIZ_URL || "https://viz.local.les-is.online";
const API_KEY = process.env.VIZ_API_KEY;

if (!API_KEY && !dryRun) {
    console.error("Error: VIZ_API_KEY is not defined in your .env file.");
    process.exit(1);
}

// Configure API Client
defaults.baseUrl = VIZ_URL;
defaults.headers = { Authorization: `Bearer ${API_KEY}` };

// Positional source dir or fallback
const positionalSource = args.find((a) => !a.startsWith("-"));
const SOURCE_DIR =
    positionalSource ||
    process.env.MIGRATION_SOURCE_DIR ||
    "/mnt/g/My Drive/USB Stuff That Got Lost - Working Storage/Photo Stuff";

// Exclusions from CLI and Defaults
const cliExcludes = getMultiArgValues("--exclude");
const EXCLUDED_FOLDERS = new Set(["1 RAWS", "1_1 RAWs", "0_2 WORKING FILES", "0_1 REFERENCES", ...cliExcludes]);

const EXPORT_FOLDER_EXACT = new Set(["3 EXPORTS", "4 EDITS", "5 FINALS"]);
const SEND_FOLDER_KEYWORDS = ["quick sends", "sends", "all sends"];
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg"]);

// Stats tracking
const stats = {
    startTime: new Date(),
    endTime: new Date(),
    totalFilesScanned: 0,
    jpegsFound: 0,
    totalBytes: 0,
    uploadedCount: 0,
    duplicateCount: 0,
    failedCount: 0,
    rawsIgnoredCount: 0,
    collectionsCreated: 0
};

const collectionCache = new Map<string, string>();
const uploadedChecksumMap = new Map<string, string>();

// Gmail API Thread Tracking
let gmailThreadId: string | null = null;
let gmailMessageId: string | null = null;

interface ScanFile {
    filePath: string;
    size: number;
    collectionName: string;
}

/**
 * Format bytes to human readable string.
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Calculate SHA256 checksum of a file.
 */
function calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(filePath);
        stream.on("data", (data) => hash.update(data));
        stream.on("end", () => resolve(hash.digest("hex")));
        stream.on("error", (err) => reject(err));
    });
}

function extractCollectionName(filePath: string, rootDir: string): string {
    const relativePath = path.relative(rootDir, filePath);
    const parts = relativePath.split(path.sep);

    if (parts.length <= 1) return "General Uploads";
    // Photoshoots/<year>/<photoshoot name>/... -> use just the photoshoot folder name
    if (parts[0].toLowerCase() === "photoshoots" && parts.length >= 3) {
        return parts[2];
    }
    // Other top-level folders (Quick Sends, All Sends, etc.) -> use subfolder name if present
    if (parts.length >= 2) {
        return parts[1];
    }
    return parts[0];
}

function isInsideTargetFolder(filePath: string, rootDir: string): boolean {
    const relativePath = path.relative(rootDir, filePath);
    const parts = relativePath.split(path.sep);
    const parentDirs = parts.slice(0, -1);

    // Exclusion check
    if (parentDirs.some((dir) => EXCLUDED_FOLDERS.has(dir))) {
        return false;
    }

    return parentDirs.some((dirName) => {
        const lower = dirName.toLowerCase();
        if (EXPORT_FOLDER_EXACT.has(dirName)) return true;
        return SEND_FOLDER_KEYWORDS.some((keyword) => lower.includes(keyword));
    });
}

interface RcloneJsonEntry {
    Path: string;
    Name: string;
    Size: number;
    MimeType: string;
    IsDir: boolean;
}

/**
 * Fast scan using `rclone lsjson --recursive` to fetch the entire file tree in
 * a single batched Google Drive API call, avoiding per-file FUSE round-trips.
 *
 * Falls back to the mounted path if rclone remote cannot be detected.
 */
async function scanSourceTree(
    mountedPath: string,
    rootDir: string
): Promise<{ jpegs: ScanFile[]; ignoredRawCount: number }> {
    const jpegs: ScanFile[] = [];
    let ignoredRawCount = 0;

    // Detect if this is an rclone mount by checking for active rclone remotes.
    // We parse the mount path to reconstruct the rclone remote path.
    let rcloneRemotePath: string | null = null;
    try {
        const { execSync } = await import("child_process");
        const remotes = execSync("rclone listremotes 2>/dev/null", { encoding: "utf8" })
            .trim()
            .split("\n")
            .filter(Boolean);
        for (const remote of remotes) {
            // e.g. remote = "gdrive:", check if mount is an rclone mount
            const remoteName = remote.replace(/:$/, "");
            const mountCheck = execSync(`rclone config show ${remoteName} 2>/dev/null | head -1`, {
                encoding: "utf8"
            }).trim();
            if (mountCheck) {
                // Try to find the rclone mount point for this remote
                const mountPoints = execSync(`rclone mount --list 2>/dev/null || true`, { encoding: "utf8" }).trim();
                // Heuristic: if the mountedPath starts with /mnt or contains 'gdrive', use rclone directly
                if (mountedPath.includes("/mnt/") || mountedPath.toLowerCase().includes("gdrive")) {
                    // Build the rclone remote path by stripping the mount prefix
                    // Find the mount root by walking up until rclone mountpoint
                    const mountInfo = execSync(
                        `findmnt -t fuse.rclone -o TARGET,SOURCE --noheadings 2>/dev/null || true`,
                        { encoding: "utf8" }
                    ).trim();
                    for (const line of mountInfo.split("\n")) {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length >= 2 && mountedPath.startsWith(parts[0])) {
                            const subPath = mountedPath.slice(parts[0].length).replace(/^\//, "");
                            // Ensure parts[1] (e.g. "gdrive:") ends cleanly without double slashes
                            const remotePrefix = parts[1].endsWith(":") ? parts[1] : `${parts[1]}:`;
                            rcloneRemotePath = `${remotePrefix}${subPath}`;
                            break;
                        }
                    }
                }
                break;
            }
        }
    } catch {
        // rclone not available or mount detection failed — fall through to FUSE scan
    }

    if (rcloneRemotePath) {
        console.log(`[SCAN] Using rclone lsjson for fast scan on remote: ${rcloneRemotePath}`);
        const { execSync } = await import("child_process");
        let raw: string;
        try {
            // --tpslimit 10 throttles requests to stay within Google Drive per-minute API quota
            raw = execSync(`rclone lsjson --recursive --tpslimit 10 --fast-list "${rcloneRemotePath}"`, {
                encoding: "utf8",
                maxBuffer: 512 * 1024 * 1024 // 512 MB
            });
        } catch (err: any) {
            console.warn(`[SCAN] rclone lsjson failed, falling back to FUSE scan: ${err.message || err}`);
            return scanSourceTreeFuse(mountedPath, rootDir);
        }

        const entries: RcloneJsonEntry[] = JSON.parse(raw);
        console.log(`[SCAN] rclone lsjson returned ${entries.length} entries. Filtering...`);

        for (const entry of entries) {
            if (entry.IsDir) {
                continue;
            }
            stats.totalFilesScanned++;
            if (stats.totalFilesScanned % 500 === 0) {
                process.stdout.write(
                    `\r[SCANNING] Processed ${stats.totalFilesScanned}/${entries.length} entries... Found ${jpegs.length} JPEGs.`
                );
            }

            const ext = path.extname(entry.Name).toLowerCase();
            const fullPath = path.join(mountedPath, entry.Path);

            if (isInsideTargetFolder(fullPath, rootDir)) {
                if (ALLOWED_EXTENSIONS.has(ext)) {
                    const collectionName = extractCollectionName(fullPath, rootDir);
                    jpegs.push({ filePath: fullPath, size: entry.Size, collectionName });
                } else {
                    ignoredRawCount++;
                }
            }
        }
        process.stdout.write("\n");
    } else {
        // Fallback: slow FUSE scan
        console.log("[SCAN] rclone remote not detected. Falling back to local filesystem scan (this may be slow).");
        return scanSourceTreeFuse(mountedPath, rootDir);
    }

    return { jpegs, ignoredRawCount };
}

/**
 * Fallback recursive FUSE scan (slow on rclone mounts).
 */
function scanSourceTreeFuse(dirPath: string, rootDir: string): { jpegs: ScanFile[]; ignoredRawCount: number } {
    let jpegs: ScanFile[] = [];
    let ignoredRawCount = 0;

    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
        return { jpegs: [], ignoredRawCount: 0 };
    }

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (EXCLUDED_FOLDERS.has(entry.name)) {
                if (verbose) console.log(`[EXCLUDED FOLDER] ${fullPath}`);
                continue;
            }
            const nested = scanSourceTreeFuse(fullPath, rootDir);
            jpegs = jpegs.concat(nested.jpegs);
            ignoredRawCount += nested.ignoredRawCount;
        } else if (entry.isFile()) {
            stats.totalFilesScanned++;
            if (stats.totalFilesScanned % 100 === 0) {
                process.stdout.write(
                    `\r[SCANNING] Scanned ${stats.totalFilesScanned} files... Found ${jpegs.length} JPEGs.`
                );
            }
            const ext = path.extname(entry.name).toLowerCase();
            if (isInsideTargetFolder(fullPath, rootDir)) {
                if (ALLOWED_EXTENSIONS.has(ext)) {
                    const stat = fs.statSync(fullPath);
                    const collectionName = extractCollectionName(fullPath, rootDir);
                    jpegs.push({ filePath: fullPath, size: stat.size, collectionName });
                } else {
                    ignoredRawCount++;
                }
            }
        }
    }

    return { jpegs, ignoredRawCount };
}

/**
 * Initialize Google Gmail API client using OAuth2 with interactive consent & persistence.
 */
async function getGmailService() {
    const credsOAuthPath = path.resolve(__dirname, "../../state/creds/creds_dst_oauth.json");
    const tokenPath = path.resolve(__dirname, "../../state/creds/dst_token.json");

    if (!fs.existsSync(credsOAuthPath)) {
        throw new Error(`OAuth client secret file missing at: ${credsOAuthPath}`);
    }

    const oauthKeys = JSON.parse(fs.readFileSync(credsOAuthPath, "utf8")).installed;
    const oauth2Client = new google.auth.OAuth2(
        oauthKeys.client_id,
        oauthKeys.client_secret,
        oauthKeys.redirect_uris ? oauthKeys.redirect_uris[0] : "urn:ietf:wg:oauth:2.0:oob"
    );

    let tokens: any = null;

    if (fs.existsSync(tokenPath)) {
        tokens = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
    } else {
        // Interactive OAuth2 prompt if no token exists yet
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"]
        });

        console.log("\n=================== GOOGLE OAUTH2 AUTHORIZATION ===================");
        console.log("Authorize this application by visiting this URL in your browser:");
        console.log(authUrl);
        console.log("===================================================================\n");

        const readline = await import("readline");
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

        const code: string = await new Promise((resolve) => {
            rl.question("Enter the authorization code from that page: ", (answer) => {
                rl.close();
                resolve(answer.trim());
            });
        });

        const { tokens: newTokens } = await oauth2Client.getToken(code);
        tokens = newTokens;

        fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
        fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
        console.log(`[OAUTH2] Authorization token saved to ${tokenPath}`);
    }

    oauth2Client.setCredentials(tokens);

    // Auto-save refreshed tokens to disk whenever Google refreshes them
    oauth2Client.on("tokens", (refreshedTokens) => {
        const current = fs.existsSync(tokenPath) ? JSON.parse(fs.readFileSync(tokenPath, "utf8")) : {};
        const updated = { ...current, ...refreshedTokens };
        fs.writeFileSync(tokenPath, JSON.stringify(updated, null, 2));
        if (verbose) console.log(`[OAUTH2] Refreshed access token saved to ${tokenPath}`);
    });

    return google.gmail({ version: "v1", auth: oauth2Client });
}

/**
 * Send progress/summary email via Google Gmail SDK with thread support.
 */
async function sendGmailReport(subject: string, bodyText: string) {
    const toEmail = process.env.REPORT_EMAIL_TO;
    const fromEmail = process.env.REPORT_EMAIL_FROM || "me";

    if (!toEmail) {
        if (verbose) console.log("[GMAIL] REPORT_EMAIL_TO missing in .env; skipping email report.");
        return;
    }

    try {
        const gmail = await getGmailService();

        let headers = `From: ${fromEmail}\r\nTo: ${toEmail}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n`;
        if (gmailMessageId) {
            const mval = gmailMessageId.startsWith("<") ? gmailMessageId : `<${gmailMessageId}>`;
            headers += `In-Reply-To: ${mval}\r\nReferences: ${mval}\r\n`;
        }

        const rawMessage = `${headers}\r\n${bodyText}`;
        const encodedMessage = Buffer.from(rawMessage)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        const requestBody: any = { raw: encodedMessage };
        if (gmailThreadId) {
            requestBody.threadId = gmailThreadId;
        }

        const res = await gmail.users.messages.send({
            userId: "me",
            requestBody
        });

        if (res.data.threadId && !gmailThreadId) {
            gmailThreadId = res.data.threadId;
        }
        if (res.data.id && !gmailMessageId) {
            gmailMessageId = res.data.id;
        }

        console.log(`[GMAIL REPORT SENT] Subject: "${subject}" (Thread: ${gmailThreadId})`);
    } catch (err) {
        console.error("[GMAIL ERROR] Failed to send Gmail report:", err);
    }
}

async function getOrCreateCollection(collectionName: string): Promise<string | null> {
    if (dryRun) {
        if (!collectionCache.has(collectionName)) {
            collectionCache.set(collectionName, `dry-run-uid-${collectionCache.size + 1}`);
            stats.collectionsCreated++;
        }
        return collectionCache.get(collectionName)!;
    }

    if (collectionCache.has(collectionName)) {
        return collectionCache.get(collectionName)!;
    }

    try {
        const res = await createCollection({
            name: collectionName,
            description: `Imported collection: ${collectionName}`
        });

        if (res.status === 201) {
            if (verbose) console.log(`[COLLECTION] Created '${collectionName}' (UID: ${res.data.uid})`);
            collectionCache.set(collectionName, res.data.uid);
            stats.collectionsCreated++;
            return res.data.uid;
        } else {
            console.error(`[COLLECTION ERROR] Failed creating '${collectionName}':`, res.data);
            return null;
        }
    } catch (err) {
        console.error(`[COLLECTION ERROR] Exception creating '${collectionName}':`, err);
        return null;
    }
}

async function uploadAndAssignPhoto(file: ScanFile): Promise<{ success: boolean; isDuplicate: boolean }> {
    const fileName = path.basename(file.filePath);

    if (dryRun) {
        if (verbose) {
            console.log(
                `[DRY RUN] Would upload: ${fileName} (${formatBytes(file.size)}) -> Collection: '${file.collectionName}'`
            );
        }
        return { success: true, isDuplicate: false };
    }

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        attempt++;
        try {
            const collectionUid = await getOrCreateCollection(file.collectionName);
            const checksum = await calculateChecksum(file.filePath);

            let imageUid = uploadedChecksumMap.get(checksum);
            let isDuplicate = false;

            if (!imageUid) {
                const fileBuffer = fs.readFileSync(file.filePath);
                const fileBlob = new Blob([fileBuffer], { type: "image/jpeg" });

                const uploadRes = await uploadImage({
                    data: fileBlob as unknown as Blob,
                    file_name: fileName,
                    checksum: checksum
                });

                if (uploadRes.status !== 200 && uploadRes.status !== 201) {
                    console.error(`[FAILED ${uploadRes.status}] ${fileName}:`, uploadRes.data);
                    if (attempt < maxRetries) {
                        const delayMs = attempt * 3000;
                        console.log(
                            `[RETRY] Retrying ${fileName} in ${delayMs / 1000}s (Attempt ${attempt}/${maxRetries})...`
                        );
                        await new Promise((res) => setTimeout(res, delayMs));
                        continue;
                    }
                    return { success: false, isDuplicate: false };
                }

                imageUid = uploadRes.data.uid;
                isDuplicate = uploadRes.data.status === "duplicate";
                uploadedChecksumMap.set(checksum, imageUid);

                if (isDuplicate) {
                    if (verbose) console.log(`[DUPLICATE DETECTED] ${fileName} -> existing UID: ${imageUid}`);
                } else {
                    if (verbose) console.log(`[SUCCESS] Uploaded: ${fileName} (UID: ${imageUid})`);
                }
            } else {
                isDuplicate = true;
                if (verbose) console.log(`[LOCAL DUP SKIP] ${fileName} already uploaded in session (UID: ${imageUid})`);
            }

            if (collectionUid && imageUid) {
                await addCollectionImages(collectionUid, { uids: [imageUid] });
            }

            return { success: true, isDuplicate };
        } catch (err) {
            console.error(`[ERROR] Exception processing ${fileName} (Attempt ${attempt}/${maxRetries}):`, err);
            if (attempt < maxRetries) {
                const delayMs = attempt * 3000;
                console.log(`[RETRY] Retrying ${fileName} in ${delayMs / 1000}s...`);
                await new Promise((res) => setTimeout(res, delayMs));
            } else {
                return { success: false, isDuplicate: false };
            }
        }
    }

    return { success: false, isDuplicate: false };
}

async function main() {
    stats.startTime = new Date();

    if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`Error: Source directory '${SOURCE_DIR}' does not exist.`);
        process.exit(1);
    }

    console.log(`========================================`);
    console.log(` Viz Photo Migration ${dryRun ? "[DRY RUN MODE]" : ""}`);
    console.log(` Target Server: ${VIZ_URL}`);
    console.log(` Source Directory: ${SOURCE_DIR}`);
    console.log(`========================================\n`);

    console.log("Scanning folder tree and calculating size estimations...");
    const { jpegs, ignoredRawCount } = await scanSourceTree(SOURCE_DIR, SOURCE_DIR);

    stats.jpegsFound = jpegs.length;
    stats.rawsIgnoredCount = ignoredRawCount;
    stats.totalBytes = jpegs.reduce((acc: number, item: ScanFile) => acc + item.size, 0);

    console.log(`\n--- Pre-Migration Estimation Report ---`);
    console.log(`Total Files Scanned:     ${stats.totalFilesScanned}`);
    console.log(`Matching JPEGs Found:    ${stats.jpegsFound}`);
    console.log(`Estimated Data Volume:   ${formatBytes(stats.totalBytes)}`);
    console.log(`RAW / Non-JPEG Skipped:  ${stats.rawsIgnoredCount}`);
    console.log(`Target Collections:      ${new Set(jpegs.map((j: ScanFile) => j.collectionName)).size}\n`);

    if (dryRun) {
        if (verbose) {
            console.log("--- Dry Run File Preview ---");
            for (let i = 0; i < jpegs.length; i++) {
                await uploadAndAssignPhoto(jpegs[i]);
            }
        }

        // Per-collection breakdown
        const byCollection = new Map<string, { count: number; bytes: number }>();
        for (const jpeg of jpegs) {
            const col = byCollection.get(jpeg.collectionName) ?? { count: 0, bytes: 0 };
            col.count++;
            col.bytes += jpeg.size;
            byCollection.set(jpeg.collectionName, col);
        }

        console.log(`\n========================================`);
        console.log(` DRY RUN SUMMARY`);
        console.log(`========================================`);
        console.log(`  Total Photos:       ${stats.jpegsFound.toLocaleString()}`);
        console.log(`  Total Size:         ${formatBytes(stats.totalBytes)}`);
        console.log(`  Collections:        ${byCollection.size}`);
        console.log(`  RAW/Non-JPEG Skip:  ${stats.rawsIgnoredCount}`);
        console.log(`\n  Breakdown by Collection:`);
        for (const [name, { count, bytes }] of [...byCollection.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
            console.log(`    ${name}: ${count} photos (${formatBytes(bytes)})`);
        }
        console.log(`\n[DRY RUN COMPLETE] No data was modified on the server.`);
        console.log(`Run without --dry-run to start the actual migration.`);
        return;
    }

    const emailIntervalMins = parseInt(getArgValue("--email-interval") || "30", 10);
    let emailTimer: NodeJS.Timeout | null = null;

    if (hasFlag("--email-report")) {
        emailTimer = setInterval(
            async () => {
                const elapsedMins = Math.round((new Date().getTime() - stats.startTime.getTime()) / 60000);
                const statusText = `Viz Photo Migration Status Report\n\nElapsed Time: ${elapsedMins} minutes\nProcessed: ${stats.uploadedCount + stats.duplicateCount + stats.failedCount} / ${stats.jpegsFound}\nUploaded: ${stats.uploadedCount}\nDuplicates Linked: ${stats.duplicateCount}\nFailures: ${stats.failedCount}\nActive Collections: ${stats.collectionsCreated}\n`;
                await sendGmailReport(`Viz Migration Status (${stats.uploadedCount}/${stats.jpegsFound})`, statusText);
            },
            emailIntervalMins * 60 * 1000
        );
    }

    console.log("--- Upload Execution Started ---");

    for (let i = 0; i < jpegs.length; i++) {
        const file = jpegs[i];
        if (!verbose) {
            process.stdout.write(
                `\r[${i + 1}/${stats.jpegsFound}] Processing: ${path.basename(file.filePath)}                   `
            );
        }
        const result = await uploadAndAssignPhoto(file);
        if (result.success) {
            if (result.isDuplicate) stats.duplicateCount++;
            else stats.uploadedCount++;
        } else {
            stats.failedCount++;
        }
    }

    if (emailTimer) clearInterval(emailTimer);
    stats.endTime = new Date();
    const durationSec = Math.round((stats.endTime.getTime() - stats.startTime.getTime()) / 1000);

    // Build itemized collection breakdown for final summary
    const collectionSummaryMap = new Map<string, number>();
    for (const jpeg of jpegs) {
        const count = collectionSummaryMap.get(jpeg.collectionName) || 0;
        collectionSummaryMap.set(jpeg.collectionName, count + 1);
    }

    let collectionsListStr = "\nCollections Created & Populated:\n";
    for (const [colName, photoCount] of [...collectionSummaryMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        collectionsListStr += `  - ${colName}: ${photoCount} photos\n`;
    }

    const summaryText = `
--- Viz Photo Migration Summary ---
Duration:              ${durationSec} seconds (${Math.round(durationSec / 60)} mins)
Total JPEGs Processed: ${stats.jpegsFound}
Total Transfer Volume: ${formatBytes(stats.totalBytes)}
Successfully Uploaded: ${stats.uploadedCount}
Duplicates Linked:     ${stats.duplicateCount}
Failed Uploads:        ${stats.failedCount}
RAW/Non-JPEG Ignored:  ${stats.rawsIgnoredCount}
Collections Created:   ${stats.collectionsCreated}
${collectionsListStr}`;

    console.log("\n" + summaryText);

    if (hasFlag("--email-report")) {
        await sendGmailReport("Viz Photo Migration Completed", summaryText);
    }
}

main();
