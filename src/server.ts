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

///////////////////////////////////////////////////////////////////////////////////
// Based on live-server copyright (c) 2012 Tapio Vierros
// https://github.com/tapio/live-server
// Used under MIT License
///////////////////////////////////////////////////////////////////////////////////

import * as fs from "fs";
import * as connect from "connect";
import * as serveIndex from "serve-index";
import * as logger from "morgan";
import { WebSocketServer } from "ws";
import * as path from "path";
import * as url from "url";
import * as http from "http";
import * as send from "send";
import * as mime from "mime";
import * as chokidar from "chokidar";
import "colors";

type IgnoreMatcher = string | RegExp | ((testString: string) => boolean);

export interface ServerOptions {
    port?: number;
    logLevel?: number;
    poll?: boolean;
    root?: string;
    watch?: string[];
    ignore?: IgnoreMatcher[];
    headers?: Record<string, string>;
}

const INJECTED_CODE = fs.readFileSync(path.join(__dirname, "injected.html"), "utf8");

function escape(html: string) {
    return String(html)
        .replace(/&(?!\w+;)/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Based on connect.static(), but streamlined and with added code injecter
function staticServer(root: string, headers: Record<string, string>) {
    return (req: connect.IncomingMessage, res: http.ServerResponse, next: connect.NextFunction) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
            return next();
        }

        let reqpath = url.parse(req.url ?? "").pathname;
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
                    } catch (e) {
                        // No index.html
                    }
                } else {
                    res.statusCode = 301;
                    res.setHeader("Location", reqpath + "/");
                    res.end("Redirecting to " + escape(reqpath) + "/");
                    return;
                }
                
            }
        } catch (e) {
            // No index.html
        }
        
        const isHTML = mime.getType(reqpath) === "text/html";

        if (isHTML) {
            try {
                const contents = fs.readFileSync(`.${reqpath}`, "utf8");
                res.setHeader("Content-Type", "text/html");
                res.setHeader("Cache-Control", "public, max-age=0");
                res.setHeader("Accept-Ranges", "bytes");
                Object.entries(headers).forEach(([ key, value ]) => {
                    res.setHeader(key, value);
                });
                const match = /(<\/body>|<\/head>)/.exec(contents);
                if (match) {
                    res.end(contents.replace(match[0], INJECTED_CODE + match[0]));
                } else {
                    res.end(contents);
                }
            } catch (e) {
                res.writeHead(404);
                res.end("File " + reqpath + " not found.");
            }
        } else {
            send(req, reqpath, { root: root })
                .on("error", (err) => {
                    if (err.status === 404) {
                        return next();
                    }
                    next(err);
                })
                .on("directory", () => {
                    const pathname = url.parse(req.originalUrl ?? "").pathname ?? "";
                    res.statusCode = 301;
                    res.setHeader("Location", pathname + "/");
                    res.end("Redirecting to " + escape(pathname) + "/");
                })
                .on("headers", res => {
                    Object.entries(headers).forEach(([ key, value ]) => {
                        res.setHeader(key, value);
                    });
                })
                .pipe(res);
        }
    };
}

/**
 * Start a live server with parameters given as an object
 * @param port {number} Port number (default: 8080)
 * @param root {string} Path to root directory (default: cwd)
 * @param watch {array} Paths to exclusively watch for changes
 * @param ignore {array} Paths to ignore when watching files for changes
 * @param logLevel {number} 0 = errors only, 1 = some, 2 = lots
 */

interface ServerInterface {
    http: http.Server | null;
    watcher: chokidar.FSWatcher | null;
    logLevel: number;
    start: (options: ServerOptions) => void;
    shutdown: () => void;
}

const server: ServerInterface = {
    http: null,
    watcher: null,
    logLevel: 2,
    start(options: ServerOptions) {
        const {
            port = 8080, // 0 means random
            poll = false,
            headers = {}
        } = options;
        const root = options.root || process.cwd();
        const watchPaths = options.watch ?? [ root ];
        server.logLevel = options.logLevel ?? 2;
    
        
        ////////////////////////////////////
        // Set up connect app
        ////////////////////////////////////

        const app = connect();
    
        // Add logger. Level 2 logs only errors
        if (server.logLevel === 2) {
            app.use(logger("dev", {
                skip: (_req, res) => res.statusCode < 400
            }));
        // Level 2 or above logs all requests
        } else if (server.logLevel > 2) {
            app.use(logger("dev"));
        }
    
        app.use(staticServer(root, headers)) // Custom static server
            .use(serveIndex(root, { icons: true }) as connect.NextHandleFunction);

        
        ////////////////////////////////////
        // Set up http server
        ////////////////////////////////////

        const httpServer = http.createServer(app);
    
        // Handle server startup errors
        httpServer.addListener("error", e => {
            console.error(e.toString().red);
            server.shutdown();
        });
    
        // Setup server to listen at port
        httpServer.listen(port, () => {	
            server.http = httpServer;

            // Output
            if (server.logLevel >= 1) {
                console.log(("Serving \"%s\" on port %s").green, root, port);
            }
        });


        ////////////////////////////////////
        // Set up web socket server
        ////////////////////////////////////

        const webSocketServer = new WebSocketServer({ 
            server: httpServer,
            clientTracking: true 
        });

        webSocketServer.on("connection", ws => ws.send("connected"));
    

        ////////////////////////////////////
        // Set up file watcher
        ////////////////////////////////////

        let ignored: IgnoreMatcher[] = [
            // Always ignore dotfiles (important e.g. because editor hidden temp files)
            (testPath: string) => testPath !== "." && /(^[.#]|(?:__|~)$)/.test(path.basename(testPath))
        ];
        if (options.ignore) {
            ignored = ignored.concat(options.ignore);
        }
    
        server.watcher = chokidar.watch(watchPaths, {
            usePolling: poll,
            ignored: ignored,
            ignoreInitial: true
        });

        function handleChange(changePath: string) {
            if (server.logLevel >= 1) {
                console.log("Change detected".cyan, changePath); 
            }

            webSocketServer.clients.forEach(ws => ws.send("reload"));
        }

        server.watcher
            .on("change", handleChange)
            .on("add", handleChange)
            .on("unlink", handleChange)
            .on("addDir", handleChange)
            .on("unlinkDir", handleChange)
            .on("ready", () => {
                if (server.logLevel >= 1) {
                    console.log("Ready for changes".cyan);
                }
            })
            .on("error", err => console.log("ERROR:".red, err));
    
        return httpServer;
    },

    shutdown() {
        if (server.watcher) {
            server.watcher.close();
        }
        if (server.http) {
            server.http.close();
        }
    }
};

export default server;