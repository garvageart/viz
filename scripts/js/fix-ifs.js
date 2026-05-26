import fs from "fs";
import path from "path";

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach((f) => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            if (f !== "node_modules" && f !== ".svelte-kit" && f !== ".git") {
                walkDir(dirPath, callback);
            }
        } else {
            callback(dirPath);
        }
    });
}

const targetDirs = [path.resolve("viewfinder/src"), path.resolve("scripts/js")];

let filesProcessed = 0;
let filesModified = 0;

targetDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
        return;
    }

    walkDir(dir, (filePath) => {
        const ext = path.extname(filePath);
        if (ext === ".ts" || ext === ".js" || ext === ".svelte") {
            filesProcessed++;
            const content = fs.readFileSync(filePath, "utf8");
            const lines = content.split("\n");
            let modified = false;

            const newLines = lines.map((line) => {
                const trimmed = line.trim();

                // Skip comments
                if (
                    trimmed.startsWith("//") ||
                    trimmed.startsWith("*") ||
                    trimmed.startsWith("/*")
                ) {
                    return line;
                }

                // Check for inline if statement:
                // must have "if (" and end with ";"
                // must not contain "{" (which indicates braces are already present)
                // must not contain "}"
                // must not be an import statement or type declaration
                if (
                    /\bif\s*\(/.test(line) &&
                    trimmed.endsWith(";") &&
                    !line.includes("{") &&
                    !line.includes("}") &&
                    !trimmed.startsWith("import")
                ) {
                    // Match: if (condition) statement;
                    // Using a non-greedy match for the condition, and capturing the statement
                    const match = line.match(/^(\s*\bif\s*\(.+\))\s*([^{]+);$/);
                    if (match) {
                        const [, ifPart, statementPart] = match;
                        modified = true;
                        // Replace with multi-line brace version
                        // Prettier will clean up the indentation and linebreaks later
                        return `${ifPart} {\n${statementPart};\n}`;
                    }
                }
                return line;
            });

            if (modified) {
                fs.writeFileSync(filePath, newLines.join("\n"), "utf8");
                filesModified++;
                console.log(`Modified: ${filePath}`);
            }
        }
    });
});

console.log(`Done! Processed ${filesProcessed} files, modified ${filesModified} files.`);
