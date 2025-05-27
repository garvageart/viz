import packageJSON from './package.json' assert { type: 'json' ***REMOVED***;
import fs from 'fs';

const newVersionNumber = process.argv[2];

const versionFilePath = "../../version.txt";
let versionFileText = Buffer.from(fs.readFileSync(versionFilePath***REMOVED******REMOVED***.toString('utf-8'***REMOVED***;

versionFileText = newVersionNumber;
packageJSON.version = newVersionNumber;

fs.writeFileSync('./package.json', JSON.stringify(packageJSON***REMOVED******REMOVED***;
fs.writeFileSync(versionFilePath, versionFileText***REMOVED***;