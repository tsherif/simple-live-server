#!/usr/bin/env node
"use strict";
///////////////////////////////////////////////////////////////////////////////////
// The MIT License (MIT)
//
// Copyright (c) 2023 Tarek Sherif
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
///////////////////////////////////////////////////////////////////////////////////
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
///////////////////////////////////////////////////////////////////////////////////
// Based on live-server copyright (c) 2012 Tapio Vierros
// https://github.com/tapio/live-server
// Used under MIT License
///////////////////////////////////////////////////////////////////////////////////
const path = require("path");
const fs = require("fs");
const server_1 = require("./server");
const opts = {
    port: 8080,
    logLevel: 2,
    poll: false,
    headers: {}
};
let ignorePaths = [];
for (let i = process.argv.length - 1; i >= 2; --i) {
    const arg = process.argv[i];
    if (arg.indexOf("--port=") > -1) {
        const portString = arg.substring(7);
        const portNumber = parseInt(portString, 10);
        if (portNumber === +portString) {
            opts.port = portNumber;
            process.argv.splice(i, 1);
        }
    }
    else if (arg.indexOf("--watch=") > -1) {
        // Will be modified later when cwd is known
        opts.watch = arg.substring(8).split(",");
        process.argv.splice(i, 1);
    }
    else if (arg.indexOf("--ignore=") > -1) {
        // Will be modified later when cwd is known
        ignorePaths = arg.substring(9).split(",");
        process.argv.splice(i, 1);
    }
    else if (arg === "--quiet" || arg === "-q") {
        opts.logLevel = 0;
        process.argv.splice(i, 1);
    }
    else if (arg === "--verbose" || arg === "-V") {
        opts.logLevel = 3;
        process.argv.splice(i, 1);
    }
    else if (arg === "--version" || arg === "-v") {
        const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "./package.json"), "utf8"));
        console.log(packageJson.name, packageJson.version);
        process.exit();
    }
    else if (arg === "--poll" || arg === "-p") {
        opts.poll = true;
        process.argv.splice(i, 1);
    }
    else if (arg.indexOf("--header=") > -1) {
        const header = arg.substring(9);
        const colonIndex = header.indexOf(":");
        const key = header.substring(0, colonIndex);
        const value = header.substring(colonIndex + 1);
        opts.headers = (_a = opts.headers) !== null && _a !== void 0 ? _a : {};
        opts.headers[key] = value;
        process.argv.splice(i, 1);
    }
    else if (arg === "--help" || arg === "-h") {
        console.log("Usage: simple-live-server [-v|--version] [-h|--help] [-q|--quiet] [--port=PORT] [--ignore=PATH] [-p|--poll] [PATH]");
        process.exit();
    }
}
// Patch paths
const dir = opts.root = process.argv[2] || "";
if (opts.watch) {
    opts.watch = opts.watch.map((relativePath) => path.join(dir, relativePath));
}
if (opts.ignore) {
    opts.ignore = ignorePaths.map((relativePath) => path.join(dir, relativePath));
}
server_1.default.start(opts);
