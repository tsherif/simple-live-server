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
Object.defineProperty(exports, "__esModule", { value: true });
///////////////////////////////////////////////////////////////////////////////////
// Based on live-server copyright (c) 2012 Tapio Vierros
// https://github.com/tapio/live-server
// Used under MIT License
///////////////////////////////////////////////////////////////////////////////////
const fs = require("fs");
const connect = require("connect");
const serveIndex = require("serve-index");
const logger = require("morgan");
const ws_1 = require("ws");
const path = require("path");
const url = require("url");
const http = require("http");
const send = require("send");
const mime = require("mime");
const chokidar = require("chokidar");
require("colors");
const INJECTED_CODE = fs.readFileSync(path.join(__dirname, "injected.html"), "utf8");
function escape(html) {
    return String(html)
        .replace(/&(?!\w+;)/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
// Based on connect.static(), but streamlined and with added code injecter
function staticServer(root) {
    return (req, res, next) => {
        var _a;
        if (req.method !== "GET" && req.method !== "HEAD") {
            return next();
        }
        let reqpath = url.parse((_a = req.url) !== null && _a !== void 0 ? _a : "").pathname;
        if (!reqpath) {
            return next();
        }
        try {
            const stat = fs.statSync(`.${reqpath}`);
            if (stat.isDirectory()) {
                if (reqpath[reqpath.length - 1] === "/") {
                    try {
                        fs.statSync(`.${reqpath}/index.html`);
                        reqpath += "/index.html";
                    }
                    catch (e) {
                        // No index.html
                    }
                }
                else {
                    res.statusCode = 301;
                    res.setHeader("Location", reqpath + "/");
                    res.end("Redirecting to " + escape(reqpath) + "/");
                    return;
                }
            }
        }
        catch (e) {
            // No index.html
        }
        const isHTML = mime.getType(reqpath) === "text/html";
        if (isHTML) {
            try {
                const contents = fs.readFileSync(`.${reqpath}`, "utf8");
                res.setHeader("Content-Type", "text/html");
                res.setHeader("Cache-Control", "public, max-age=0");
                res.setHeader("Accept-Ranges", "bytes");
                const match = /(<\/body>|<\/head>)/.exec(contents);
                if (match) {
                    res.end(contents.replace(match[0], INJECTED_CODE + match[0]));
                }
                else {
                    res.end(contents);
                }
            }
            catch (e) {
                res.writeHead(404);
                res.end("File " + reqpath + " not found.");
            }
        }
        else {
            send(req, reqpath, { root: root })
                .on("error", (err) => {
                if (err.status === 404) {
                    return next();
                }
                next(err);
            })
                .on("directory", () => {
                var _a, _b;
                const pathname = (_b = url.parse((_a = req.originalUrl) !== null && _a !== void 0 ? _a : "").pathname) !== null && _b !== void 0 ? _b : "";
                res.statusCode = 301;
                res.setHeader("Location", pathname + "/");
                res.end("Redirecting to " + escape(pathname) + "/");
            })
                .pipe(res);
        }
    };
}
const zenServer = {
    server: null,
    watcher: null,
    logLevel: 2,
    start(options) {
        var _a, _b;
        const { port = 8080, // 0 means random
        poll = false } = options;
        const root = options.root || process.cwd();
        const watchPaths = (_a = options.watch) !== null && _a !== void 0 ? _a : [root];
        zenServer.logLevel = (_b = options.logLevel) !== null && _b !== void 0 ? _b : 2;
        const staticServerHandler = staticServer(root);
        // Setup a web server
        const app = connect();
        // Add logger. Level 2 logs only errors
        if (zenServer.logLevel === 2) {
            app.use(logger("dev", {
                skip: (_req, res) => res.statusCode < 400
            }));
            // Level 2 or above logs all requests
        }
        else if (zenServer.logLevel > 2) {
            app.use(logger("dev"));
        }
        app.use(staticServerHandler) // Custom static server
            .use(serveIndex(root, { icons: true }));
        const server = http.createServer(app);
        // Handle server startup errors
        server.addListener("error", e => {
            console.error(e.toString().red);
            zenServer.shutdown();
        });
        // Setup server to listen at port
        server.listen(port, () => {
            // Output
            if (zenServer.logLevel >= 1) {
                console.log(("Serving \"%s\" on port %s").green, root, port);
            }
        });
        // Setup WebSocket
        const websocketServer = new ws_1.WebSocketServer({
            server,
            clientTracking: true
        });
        websocketServer.on("connection", ws => ws.send("connected"));
        // Setup watcher
        let ignored = [
            // Always ignore dotfiles (important e.g. because editor hidden temp files)
            (testPath) => testPath !== "." && /(^[.#]|(?:__|~)$)/.test(path.basename(testPath))
        ];
        if (options.ignore) {
            ignored = ignored.concat(options.ignore);
        }
        // Setup file watcher
        zenServer.watcher = chokidar.watch(watchPaths, {
            usePolling: poll,
            ignored: ignored,
            ignoreInitial: true
        });
        function handleChange(changePath) {
            if (zenServer.logLevel >= 1) {
                console.log("Change detected".cyan, changePath);
            }
            websocketServer.clients.forEach(ws => ws.send("reload"));
        }
        zenServer.watcher
            .on("change", handleChange)
            .on("add", handleChange)
            .on("unlink", handleChange)
            .on("addDir", handleChange)
            .on("unlinkDir", handleChange)
            .on("ready", () => {
            if (zenServer.logLevel >= 1) {
                console.log("Ready for changes".cyan);
            }
        })
            .on("error", err => console.log("ERROR:".red, err));
        return server;
    },
    shutdown() {
        const { watcher, server } = zenServer;
        if (watcher) {
            watcher.close();
        }
        if (server) {
            server.close();
        }
    }
};
exports.default = zenServer;
