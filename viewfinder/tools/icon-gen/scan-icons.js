import { globSync, readFileSync } from "fs";
import path, { join } from "path";
import { parse as parseSvelte } from "svelte/compiler";
import ts from "typescript";

/**
 * Convert a string to PascalCase (e.g. "upload file" -> "UploadFile").
 * @param {string} s
 * @returns {string}
 */
export function pascalCase(s) {
    return String(s)
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .map((p) => p[0].toUpperCase() + p.slice(1))
        .join("");
}

/**
 * Sanitize an icon name for use in file paths (lowercase, underscores).
 * @param {string} name
 * @returns {string}
 */
export function sanitizeNameForFile(name) {
    return String(name)
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "_");
}

/**
 * Loads the list of valid Material Symbols from the generated MaterialSymbol.ts file.
 * @param {string} rootDir
 * @returns {Set<string>|null}
 */
export function loadValidSymbols(rootDir) {
    const typePath = join(rootDir, "src/lib/types/MaterialSymbol.ts");
    try {
        const content = readFileSync(typePath, "utf8");
        const matches = content.match(/"([^"]+)"/g);
        if (!matches) {
            return null;
        }

        return new Set(matches.map((m) => m.slice(1, -1)));
    } catch (e) {
        return null;
    }
}

/**
 * Scans source files in srcDir for icon usages using AST analysis.
 * @param {{ srcDir: string, rootDir: string }} options
 * @returns {Map<string, { weights: Set<string>, styles: Set<string> }>}
 */
export function scanIconUsages({ srcDir, rootDir }) {
    const validSymbols = loadValidSymbols(rootDir);

    const pattern = `${srcDir.replace(/\\/g, "/")}/**/*.{svelte,ts,js}`;
    const files = globSync(pattern, {
        withFileTypes: true,
        exclude: ["**/.svelte-kit/**", "**/node_modules/**"]
    });

    const iconPropNames = new Set(["iconName", "icon"]);
    /** @type {Map<string, Set<number>>} */
    const iconFuncArgs = new Map();
    /** @type {Map<string, { weights: Set<string>, styles: Set<string> }>} */
    const names = new Map();

    /**
     * @param {string} candidate
     * @param {Set<string>} [fileWeights]
     * @param {Set<string>} [fileStyles]
     */
    function tryAddIcon(candidate, fileWeights = new Set(), fileStyles = new Set()) {
        const val = candidate.trim();
        if (!val || (validSymbols && !validSymbols.has(val))) {
            return;
        }

        if (!names.has(val)) {
            names.set(val, { weights: new Set(), styles: new Set() });
        }

        const entry = names.get(val);
        if (!entry) {
            return;
        }
        fileWeights.forEach((w) => entry.weights.add(w));
        fileStyles.forEach((s) => entry.styles.add(s));
    }

    /**
     * Helper to recursively walk Svelte AST.
     * @param {any} node
     * @param {(n: any) => void} callback
     */
    function walkSvelteAST(node, callback) {
        if (!node || typeof node !== "object") {
            return;
        }

        callback(node);
        for (const key of Object.keys(node)) {
            const val = node[key];
            if (Array.isArray(val)) {
                for (const child of val) {
                    if (child && typeof child === "object" && typeof child.type === "string") {
                        walkSvelteAST(child, callback);
                    }
                }
            } else if (val && typeof val === "object" && typeof val.type === "string") {
                walkSvelteAST(val, callback);
            }
        }
    }

    /**
     * Helper to recursively walk TS AST.
     * @param {import("typescript").Node} node
     * @param {(n: import("typescript").Node) => void} callback
     */
    function walkTSAST(node, callback) {
        if (!node) {
            return;
        }

        callback(node);
        ts.forEachChild(node, (child) => walkTSAST(child, callback));
    }

    /**
     * Helper to extract all string literals from a TS AST node.
     * @param {import("typescript").Node} n
     * @returns {string[]}
     */
    function extractStringsFromNode(n) {
        /** @type {string[]} */
        const results = [];
        walkTSAST(n, (child) => {
            if (ts.isStringLiteral(child)) {
                results.push(child.text);
            } else if (ts.isNoSubstitutionTemplateLiteral(child)) {
                results.push(child.text);
            }
        });
        return results;
    }

    const reWeightDouble = /(?:iconWeight|weight)\s*=\s*"([0-9]{3})"/g;
    const reWeightSingle = /(?:iconWeight|weight)\s*=\s*'([0-9]{3})'/g;
    const reWeightExpr = /(?:iconWeight|weight)\s*=\s*{\s*([0-9]{3})\s*}/g;
    const reWeightObj = /(?:iconWeight|weight)\s*:\s*"([0-9]{3})"/g;

    const reStyleDouble = /iconStyle\s*=\s*"([a-z]+)"/g;
    const reStyleSingle = /iconStyle\s*=\s*'([a-z]+)'/g;
    const reStyleExpr = /iconStyle\s*=\s*{\s*"([a-z]+)"\s*}/g;
    const reStyleObj = /iconStyle\s*:\s*"([a-z]+)"/g;

    /** @type {Array<{ file: string, scriptTexts: Array<{ text: string, name: string }>, expressionsText: string[], sourceText: string, cleanedText: string }>} */
    const parsedFiles = [];

    // PASS 1: Identify typed identifiers
    for (const f of files) {
        if (f.parentPath.includes("/generated/") || f.parentPath.includes("/types/MaterialSymbol")) {
            continue;
        }

        const fullFilePath = path.join(f.parentPath, f.name);
        const sourceText = readFileSync(fullFilePath, "utf8");
        const cleanedText = sourceText.replace(/<style[\s\S]*?<\/style>/gi, "");

        /** @type {Array<{ text: string, name: string }>} */
        const scriptTexts = [];
        /** @type {string[]} */
        const expressionsText = [];

        if (fullFilePath.endsWith(".svelte")) {
            try {
                const ast = parseSvelte(cleanedText, { filename: fullFilePath });
                if (ast.instance) {
                    scriptTexts.push({
                        text: sourceText.slice(ast.instance.content.start, ast.instance.content.end),
                        name: "instance.ts"
                    });
                }
                if (ast.module) {
                    scriptTexts.push({
                        text: sourceText.slice(ast.module.content.start, ast.module.content.end),
                        name: "module.ts"
                    });
                }

                const root = ast.fragment || ast.html;
                if (root) {
                    walkSvelteAST(root, (node) => {
                        if (node.type === "SnippetBlock" && node.parameters && node.parameters.length > 0) {
                            const start = node.parameters[0].start;
                            const end = node.parameters[node.parameters.length - 1].end;
                            const paramsText = sourceText.slice(start, end);
                            scriptTexts.push({
                                text: `const ${node.expression.name} = (${paramsText}) => {};`,
                                name: `snippet_${node.expression.name}.ts`
                            });
                        }

                        if (node.expression && node.type !== "SnippetBlock") {
                            expressionsText.push(sourceText.slice(node.expression.start, node.expression.end));
                        }

                        if (!node.value || !Array.isArray(node.value)) {
                            return;
                        }

                        for (const v of node.value) {
                            if (v.type === "MustacheTag" && v.expression) {
                                expressionsText.push(sourceText.slice(v.expression.start, v.expression.end));
                            }
                        }
                    });
                }
            } catch (e) {}
        } else {
            scriptTexts.push({ text: sourceText, name: fullFilePath });
        }

        parsedFiles.push({ file: fullFilePath, scriptTexts, expressionsText, sourceText, cleanedText });

        for (const { text, name } of scriptTexts) {
            const sourceFile = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);

            walkTSAST(sourceFile, (node) => {
                if (
                    !ts.isPropertySignature(node) &&
                    !ts.isPropertyDeclaration(node) &&
                    !ts.isParameter(node) &&
                    !ts.isVariableDeclaration(node)
                ) {
                    return;
                }
                const nodeType = ts.isVariableDeclaration(node) ? node.type : node.type;
                if (!nodeType) {
                    return;
                }
                const typeText = nodeType.getText(sourceFile);
                if (!typeText.includes("MaterialSymbol")) {
                    return;
                }

                if (ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) {
                    if (ts.isIdentifier(node.name) && node.name.text !== "name") {
                        iconPropNames.add(node.name.text);
                    }
                    return;
                }

                if (!ts.isParameter(node)) {
                    return;
                }

                if (ts.isIdentifier(node.name) && node.name.text !== "name") {
                    iconPropNames.add(node.name.text);
                    const parent = node.parent;
                    let funcName = null;
                    if (ts.isFunctionDeclaration(parent) && parent.name) {
                        funcName = parent.name.text;
                    } else if (
                        (ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) &&
                        parent.parent &&
                        ts.isVariableDeclaration(parent.parent)
                    ) {
                        funcName = parent.parent.name.getText(sourceFile);
                    }

                    if (!funcName) {
                        return;
                    }
                    const idx = parent.parameters.indexOf(node);
                    if (idx === -1) {
                        return;
                    }
                    const args = iconFuncArgs.get(funcName) ?? new Set();
                    args.add(idx);
                    iconFuncArgs.set(funcName, args);
                    return;
                }

                if (ts.isObjectBindingPattern(node.name) && ts.isTypeLiteralNode(nodeType)) {
                    node.name.elements.forEach((el) => {
                        if (!ts.isBindingElement(el) || !ts.isIdentifier(el.name)) {
                            return;
                        }

                        const elementName = el.name.text;
                        const member = nodeType.members.find((m) => {
                            if (!ts.isPropertySignature(m) && !ts.isPropertyDeclaration(m)) {
                                return false;
                            }
                            return m.name && ts.isIdentifier(m.name) && m.name.text === elementName;
                        });

                        if (
                            member &&
                            (ts.isPropertySignature(member) || ts.isPropertyDeclaration(member)) &&
                            member.type &&
                            member.type.getText(sourceFile).includes("MaterialSymbol")
                        ) {
                            iconPropNames.add(elementName);
                        }
                    });
                }
            });
        }
    }

    // PASS 2: Discover and extract icon usages
    for (const { file, scriptTexts, expressionsText, sourceText, cleanedText } of parsedFiles) {
        const foundWeights = new Set();

        [reWeightDouble, reWeightSingle, reWeightExpr, reWeightObj].forEach((r) => {
            r.lastIndex = 0;
            let m;
            while ((m = r.exec(sourceText)) !== null) {
                foundWeights.add(m[1]);
            }
        });

        const foundStyles = new Set();
        [reStyleDouble, reStyleSingle, reStyleExpr, reStyleObj].forEach((r) => {
            r.lastIndex = 0;
            let m;
            while ((m = r.exec(sourceText)) !== null) {
                foundStyles.add(m[1]);
            }
        });

        if (file.endsWith(".svelte")) {
            try {
                const ast = parseSvelte(cleanedText, { filename: file });
                const root = ast.fragment || ast.html;
                if (root) {
                    walkSvelteAST(root, (node) => {
                        if (node.type !== "Attribute") {
                            return;
                        }

                        const isIconAttr = iconPropNames.has(node.name);
                        if (!isIconAttr || !node.value || !Array.isArray(node.value)) {
                            return;
                        }

                        for (const v of node.value) {
                            if (v.type === "Text") {
                                tryAddIcon(v.data, foundWeights, foundStyles);
                            } else if (v.type === "MustacheTag" && v.expression) {
                                const exprCode = sourceText.slice(v.expression.start, v.expression.end);
                                const exprSf = ts.createSourceFile(
                                    "mustache.ts",
                                    exprCode,
                                    ts.ScriptTarget.Latest,
                                    true
                                );
                                extractStringsFromNode(exprSf).forEach((str) =>
                                    tryAddIcon(str, foundWeights, foundStyles)
                                );
                            }
                        }
                    });
                }
            } catch (e) {}
        }

        const allTsTexts = [...scriptTexts.map((s) => s.text), ...expressionsText];
        for (const tsText of allTsTexts) {
            const sourceFile = ts.createSourceFile("expr.ts", tsText, ts.ScriptTarget.Latest, true);

            walkTSAST(sourceFile, (node) => {
                /** @param {string} name */
                const isIconIdentifier = (name) => iconPropNames.has(name);

                if (ts.isVariableDeclaration(node) && node.initializer) {
                    const varName = node.name.getText(sourceFile);
                    const isTypedIcon = node.type && node.type.getText(sourceFile).includes("MaterialSymbol");
                    if (isIconIdentifier(varName) || isTypedIcon) {
                        extractStringsFromNode(node.initializer).forEach((v) =>
                            tryAddIcon(v, foundWeights, foundStyles)
                        );
                    }
                }

                if (ts.isPropertyAssignment(node)) {
                    const propName = node.name.getText(sourceFile);
                    if (isIconIdentifier(propName)) {
                        extractStringsFromNode(node.initializer).forEach((v) =>
                            tryAddIcon(v, foundWeights, foundStyles)
                        );
                    }
                }

                if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                    const leftName = node.left.getText(sourceFile);
                    if (isIconIdentifier(leftName)) {
                        extractStringsFromNode(node.right).forEach((v) => tryAddIcon(v, foundWeights, foundStyles));
                    }
                }

                if (
                    ts.isFunctionDeclaration(node) ||
                    ts.isArrowFunction(node) ||
                    ts.isFunctionExpression(node) ||
                    ts.isMethodDeclaration(node)
                ) {
                    const funcName = node.name ? node.name.getText(sourceFile) : "";
                    const returnType = node.type ? node.type.getText(sourceFile) : "";
                    const isIconFunc =
                        returnType.includes("MaterialSymbol") ||
                        (funcName && (/^get.*Icon/i.test(funcName) || /Icon$/i.test(funcName)));
                    if (isIconFunc) {
                        extractStringsFromNode(node.body || node).forEach((v) =>
                            tryAddIcon(v, foundWeights, foundStyles)
                        );
                    }
                }

                if (ts.isCallExpression(node)) {
                    const funcName = node.expression.getText(sourceFile);
                    const positions = iconFuncArgs.get(funcName);
                    if (!positions) {
                        return;
                    }

                    for (const pos of positions) {
                        if (pos < node.arguments.length) {
                            extractStringsFromNode(node.arguments[pos]).forEach((v) =>
                                tryAddIcon(v, foundWeights, foundStyles)
                            );
                        }
                    }
                }
            });
        }
    }

    return names;
}
