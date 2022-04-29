import { path, serve } from "./deps.ts";
import { getAvailablePort } from "./port-utils.ts";
import {
  redirectSymlink,
  serveDirectory,
  serveAsciidoc,
  serveFile,
  handleLivereload,
  badRequestResponse,
  notFoundResponse,
} from "./server-utils.ts";
import { watch, fileWatcherEventEmitter } from "./file-watcher.ts";

const PORT = (await getAvailablePort({
  port: {
    start: 3000,
    end: 4000,
  },
}))!;

const rootDirectory = path.resolve(Deno.cwd());

const handler = async (request: Request) => {
  const url = new URL(request.url);
  const decodedURLPathname = decodeURIComponent(url.pathname);

  // null poisoning
  if (url.pathname.includes("\0")) {
    return badRequestResponse;
  }

  // live reload
  if (decodedURLPathname === "/livereload") {
    return await handleLivereload(request, fileWatcherEventEmitter);
  }

  // symlink and directory
  const requestPath = path.join(rootDirectory, decodedURLPathname);
  const maybeStat = await Deno.lstat(requestPath).catch(() => undefined);
  if (!maybeStat || !path.resolve(requestPath).startsWith(rootDirectory)) {
    return notFoundResponse;
  }
  const stat = maybeStat;
  if (stat.isSymlink) {
    return redirectSymlink(requestPath, rootDirectory);
  }
  if (stat.isDirectory) {
    return serveDirectory(requestPath, rootDirectory);
  }

  // asciidoc
  if ([".adoc", ".asciidoc", ".acs"].includes(path.extname(requestPath))) {
    return serveAsciidoc(requestPath, PORT);
  }

  // file
  return serveFile(requestPath);
};

console.log(`Server is listening on port ${PORT}`);
await Promise.all([serve(handler, { port: PORT }), watch(rootDirectory)]);
