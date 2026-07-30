import { execSync } from "child_process";
import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import readline from "readline";
import semver from "semver";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "../..");
const versionFile = path.join(rootDir, "version.txt");
const rootPkgFile = path.join(rootDir, "package.json");
const viewfinderPkgFile = path.join(rootDir, "viewfinder/package.json");
const scriptsPkgFile = path.join(rootDir, "scripts/js/package.json");
const changelogFile = path.join(rootDir, "CHANGELOG.md");

function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) =>
        rl.question(query, (ans) => {
            rl.close();
            resolve(ans);
        })
    );
}

async function updatePackageJson(filePath: string, nextVersion: string) {
    try {
        const content = await fs.readFile(filePath, "utf8");
        const pkg = JSON.parse(content);
        pkg.version = nextVersion;
        await fs.writeFile(filePath, JSON.stringify(pkg, null, 4) + "\n", "utf8");
    } catch (err: any) {
        console.error(`Warning: Could not update ${path.basename(filePath)}: ${err.message}`);
    }
}

async function main() {
    process.chdir(rootDir);

    let didStash = false;

    // 1. Verify working directory is clean
    try {
        execSync("git update-index --refresh", { stdio: "ignore" });
        execSync("git diff-index --quiet HEAD --", { stdio: "ignore" });
    } catch {
        console.log("Uncommitted changes detected in working directory.");
        const stashAns = await askQuestion("Would you like to stash your changes before proceeding? [y/N]: ");
        if (stashAns.trim().toLowerCase() === "y") {
            console.log("Stashing uncommitted changes...");
            execSync("git stash push -m 'Auto-stash before release'", { stdio: "inherit" });
            didStash = true;
        } else {
            console.error("Error: Working directory has uncommitted changes. Please commit or stash them first.");
            process.exit(1);
        }
    }

    // 2. Get current version
    let currentVersion: string;
    try {
        const content = await fs.readFile(versionFile, "utf8");
        currentVersion = content.trim();
    } catch {
        console.error("Error: version.txt not found.");
        process.exit(1);
    }

    console.log(`Current version: ${currentVersion}`);

    // Back up original file contents for recovery in case of cancellation/errors
    const originalVersionTxt = await fs.readFile(versionFile, "utf8").catch(() => null);
    const originalRootPkg = await fs.readFile(rootPkgFile, "utf8").catch(() => null);
    const originalViewfinderPkg = await fs.readFile(viewfinderPkgFile, "utf8").catch(() => null);
    const originalChangelog = await fs.readFile(changelogFile, "utf8").catch(() => null);

    let isReleaseFinalized = false;

    const cleanupSync = () => {
        if (!isReleaseFinalized) {
            console.log("\nCleaning up modified files...");
            try {
                if (originalVersionTxt !== null) {
                    fsSync.writeFileSync(versionFile, originalVersionTxt, "utf8");
                } else {
                    fsSync.rmSync(versionFile, { force: true });
                }

                if (originalRootPkg !== null) {
                    fsSync.writeFileSync(rootPkgFile, originalRootPkg, "utf8");
                }

                if (originalViewfinderPkg !== null) {
                    fsSync.writeFileSync(viewfinderPkgFile, originalViewfinderPkg, "utf8");
                }

                if (originalChangelog !== null) {
                    fsSync.writeFileSync(changelogFile, originalChangelog, "utf8");
                } else {
                    fsSync.rmSync(changelogFile, { force: true });
                }
                console.log("Cleanup complete.");
            } catch (err: any) {
                console.error(`Warning: Cleanup failed: ${err.message}`);
            }
        }
    };

    // Handle interrupts (Ctrl+C) and termination signals
    process.on("SIGINT", () => {
        cleanupSync();
        process.exit(130);
    });

    process.on("SIGTERM", () => {
        cleanupSync();
        process.exit(143);
    });

    try {
        // Calculate version bump suggestions
        const suggestPatch = semver.inc(currentVersion, "patch");
        const suggestMinor = semver.inc(currentVersion, "minor");
        const suggestMajor = semver.inc(currentVersion, "major");

        console.log("\nSelect release type:");
        console.log(`1) Patch  --> ${suggestPatch}`);
        console.log(`2) Minor  --> ${suggestMinor}`);
        console.log(`3) Major  --> ${suggestMajor}`);
        console.log("4) Custom version");

        const choice = await askQuestion("Enter choice [1-4]: ");
        let nextVersion: string | null = null;

        if (choice === "1") {
            nextVersion = suggestPatch;
        } else if (choice === "2") {
            nextVersion = suggestMinor;
        } else if (choice === "3") {
            nextVersion = suggestMajor;
        } else if (choice === "4") {
            const customVer = await askQuestion("Enter custom version (e.g. 0.1.0): ");
            nextVersion = semver.valid(customVer.trim());
        }

        if (!nextVersion) {
            console.error("Error: Invalid version selection.");
            return;
        }

        const releaseType = await askQuestion(
            "\nSelect release type:\n\n" +
                "1) Release candidate  --> rc\n" +
                "2) Stable release     --> stable (default)\n\n" +
                "Enter choice [1-2]: "
        );

        if (releaseType === "1") {
            nextVersion += "-rc";
        }

        console.log(`\nReleasing version: v${nextVersion}`);

        // 3. Update version.txt
        await fs.writeFile(versionFile, nextVersion, "utf8");

        // 4. Update package.json files
        await updatePackageJson(rootPkgFile, nextVersion);
        await updatePackageJson(viewfinderPkgFile, nextVersion);
        await updatePackageJson(scriptsPkgFile, nextVersion);

        // 5. Generate CHANGELOG.md updates
        let lastTag = "";
        try {
            lastTag = execSync("git describe --tags --abbrev=0", { stdio: ["ignore", "pipe", "ignore"] })
                .toString()
                .trim();
        } catch {
            // No tags exist yet
        }

        console.log("Compiling changelog updates...");
        const dateStr = new Date().toISOString().slice(0, 10);
        let logCommits = "";
        try {
            const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
            logCommits = execSync(`git log ${range} --oneline --pretty=format:"* %s (%h)"`, {
                stdio: ["ignore", "pipe", "ignore"]
            })
                .toString()
                .trim();
        } catch (err: any) {
            console.error(`Warning: Could not compile commit history: ${err.message}`);
        }

        let changelogHeader = `## [${nextVersion}] - ${dateStr}\n\n`;
        if (logCommits) {
            changelogHeader += logCommits + "\n\n";
        } else {
            changelogHeader += "* Maintenance release.\n\n";
        }

        let existingChangelog = "";
        try {
            existingChangelog = await fs.readFile(changelogFile, "utf8");
        } catch {
            // CHANGELOG.md doesn't exist yet
        }

        let updatedChangelog = "";
        const insertIndex = existingChangelog.indexOf("## ");
        if (insertIndex !== -1) {
            updatedChangelog =
                existingChangelog.slice(0, insertIndex) + changelogHeader + existingChangelog.slice(insertIndex);
        } else {
            updatedChangelog = changelogHeader + existingChangelog;
        }

        await fs.writeFile(changelogFile, updatedChangelog, "utf8");

        // Print changelog for confirmation
        console.log("\nChangelog for v" + nextVersion + ":\n\n" + changelogHeader);

        const releaseConfirm = await askQuestion("\nConfirm release? [y/N]: ");

        if (releaseConfirm.toLowerCase() === "n") {
            console.log("Release cancelled.");
            return;
        }

        // 6. Stage and commit
        console.log("Staging and committing files...\n");
        execSync(`git add ${versionFile} ${rootPkgFile} ${viewfinderPkgFile} ${scriptsPkgFile} ${changelogFile}`);
        execSync(`git commit -S -m "chore(release): bump version to ${nextVersion}"`);
        execSync(`git tag -s -m "Release v${nextVersion}" "v${nextVersion}"`);

        isReleaseFinalized = true;

        console.log("\n==================================================");
        console.log(`Release v${nextVersion} created locally!`);
        console.log("==================================================");

        const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { stdio: ["ignore", "pipe", "ignore"] })
            .toString()
            .trim();

        const pushConfirm = await askQuestion("\nPush changes to origin now? [y/N]: ");
        if (pushConfirm.toLowerCase() === "y") {
            console.log("\nPushing release commit and tag atomically to origin...\n");
            execSync(`git push --atomic origin ${currentBranch} v${nextVersion}`, { stdio: "inherit" });
            console.log("\n==================================================");
            console.log("Push complete!");
            console.log("==================================================");
        } else {
            console.log("\nNext steps:");
            console.log(`1. Run: git push --atomic origin ${currentBranch} v${nextVersion}`);
            console.log("==================================================");
        }

        if (didStash) {
            console.log("\n📌 REMINDER: Remember to re-apply your stashed changes using: git stash pop");
            console.log("==================================================");
        }
    } finally {
        cleanupSync();
    }
}

main().catch((err) => {
    console.error(`Unhandled error: ${err.message}`);
    process.exit(1);
});
