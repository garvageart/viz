import packageJSON from './package.json' assert { type: 'json' };
import fs from 'fs';

const newVersionNumber = process.argv[2];

const versionFilePath = "../../version.txt";
let versionFileText = fs.readFileSync(versionFilePath, 'utf8').split("\n")[0];

versionFileText = newVersionNumber;
packageJSON.version = newVersionNumber;

fs.writeFileSync('./package.json', JSON.stringify(packageJSON));
fs.writeFileSync(versionFilePath, versionFileText);