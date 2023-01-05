Zen Server
===========

A mininal HTTP server with live reload capabilities, geared towards creative coding and rapid prototyping.

This project started as a stripped-down fork of [live-server](https://github.com/tapio/live-server) by Tapio Vierros. Modifications include:
- Support for polling-based file watching (which allows for usage in WSL and networked folders)
- Updated dependencies
- Port to TypeScript
- Stripped-down functionality (no support for HTTPS, proxying, SPA, etc).

Installation
------------

```bash
    npm i -D zen-server
```

Command line parameters:

* `--port=NUMBER`  - Port use, default: 8080
* `--quiet | -q`   - Suppress logging
* `--verbose | -V` - More logging (logs all requests, etc.)
* `--watch=PATH`   - Comma-separated string of paths to inclusively watch for changes (default: everything)
* `--ignore=PATH`  - Comma-separated string of paths to ignore ([anymatch](https://github.com/es128/anymatch)-compatible definition)
* `--poll`         - Use polling to watch files (this can be useful in contexts where file-change notifications are available, e.g. [WSL](https://github.com/microsoft/WSL/issues/4739))
* `--help | -h`    - Display terse usage hint and exit
* `--version | -v` - Display version and exit

Usage from node
---------------

```javascript
const zenServer = require("zen-server");

const params = {
    port: 8181,                         // Set the server port. Defaults to 8080.
    root: "/public",                    // Set root directory that's being served. Defaults to cwd.
    watch: ["*.js", "*.html"],          // Array of paths to watch for reloading.
    ignore: ["scss", "my/templates"],   // Array of paths to ignore for reloading.
    logLevel: 2,                        // 0 = errors only, 1 = some, 2 = lots
    poll: true                          // When true,  use polling to watch files. 
};

zenServer.start(params);
```

