Zen Server
===========

A mininal HTTP server with live reload capabilities, geared towards creative coding and rapid prototyping.

This project started as a stripped-down fork of [live-server](https://github.com/tapio/live-server) by Tapio Vierros.

Modifications from the original `live-server` include:
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

* `--port=NUMBER`  - select port to use, default: PORT env var or 8080
* `--quiet | -q`   - suppress logging
* `--verbose | -V` - more logging (logs all requests, shows all listening IPv4 interfaces, etc.)
* `--watch=PATH`   - comma-separated string of paths to exclusively watch for changes (default: watch everything)
* `--ignore=PATH`  - comma-separated string of paths to ignore ([anymatch](https://github.com/es128/anymatch)-compatible definition)
* `--poll`         - use polling to watch files (this can be useful in contexts where file-change notifications are available, e.g. [WSL](https://github.com/microsoft/WSL/issues/4739))
* `--help | -h`    - display terse usage hint and exit
* `--version | -v` - display version and exit

Usage from node
---------------

```javascript
const zenServer = require("zen-server");

var params = {
	port: 8181, // Set the server port. Defaults to 8080.
	root: "/public", // Set root directory that's being served. Defaults to cwd.
	ignore: ["scss", "my/templates"], // comma-separated string for paths to ignore
	logLevel: 2, // 0 = errors only, 1 = some, 2 = lots
	poll: true // When true, will use polling to watch files. 
};

zenServer.start(params);
```

