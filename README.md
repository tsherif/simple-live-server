Simple Live Server
==================

A mininal HTTP server with live reload capabilities.

This project started as a stripped-down fork of [live-server](https://github.com/tapio/live-server) by Tapio Vierros. Modifications include:
- Support for polling-based file watching (which allows for usage in WSL and networked folders)
- Updated dependencies
- Port to TypeScript
- Stripped-down functionality (no support for HTTPS, proxying, SPA, etc)

Installation
------------

```bash
    npm i -D simple-live-server
```

Usage
------------

To serve local files:

```bash
    simple-live-server [options] [root-path]
```

On file systems where change notifications aren't available, such as [WSL 2](https://github.com/microsoft/WSL/issues/4739), polling can be enabled with the `-p` option: 

```bash
    simple-live-server -p [options] [root-path]
```

For projects that require a build step, I recommend [chokidar-cli](https://www.npmjs.com/package/chokidar-cli) and [npm-run-all](https://www.npmjs.com/package/npm-run-all), e.g.:

```bash
run-p --race "chokidar index.ts -c tsc" "simple-live-server --watch=index.js"
```


Command line parameters:

* `--port=NUMBER`   - Port use, default: 8080
* `--quiet | -q`    - Suppress logging
* `--verbose | -V`  - More logging (logs all requests, etc.)
* `--watch=PATH`    - Comma-separated string of paths to inclusively watch for changes (default: everything)
* `--ignore=PATH`   - Comma-separated string of paths to ignore ([anymatch](https://github.com/es128/anymatch)-compatible definition)
* `--poll | -p`     - Use polling to watch files
* `--header=HEADER` - Add an HTTP header to responses (can be repeated for multiple headers)
* `--help | -h`     - Display terse usage hint and exit
* `--version | -v`  - Display version and exit

Usage from Node.js
------------------

```javascript
const server = require("simple-live-server");

const params = {
    port: 8181,                         // Set the server port. Defaults to 8080.
    root: "/public",                    // Set root directory that's being served. Defaults to cwd.
    watch: ["*.js", "*.html"],          // Array of paths to watch for reloading.
    ignore: ["scss", "my/templates"],   // Array of paths to ignore for reloading.
    logLevel: 2,                        // 0 = errors only, 1 = some, 2 = lots
    poll: true,                         // When true, use polling to watch files. 
    headers: {                          // Add headers to reponses.
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp"
    }
};

server.start(params);
```

