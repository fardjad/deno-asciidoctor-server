import type { EventEmitter } from "./deps.ts";
import {
  path,
  compileEjs,
  readableStreamFromReader,
  StringReader,
  Asciidoctor,
} from "./deps.ts";

export const notFoundResponse = new Response(undefined, {
  status: 404,
});
export const badRequestResponse = new Response(undefined, {
  status: 400,
});
const htmlContentTypeHeaders = {
  "content-type": "text/html; charset=utf-8",
};

export const redirectSymlink = async (
  requestPath: string,
  rootDirectory: string
) => {
  const maybeLinkPath = await Deno.readLink(requestPath).catch(() => undefined);
  if (
    !maybeLinkPath ||
    !path.resolve(maybeLinkPath).startsWith(rootDirectory)
  ) {
    return notFoundResponse;
  }
  const linkPath = path.resolve(maybeLinkPath);
  return new Response(undefined, {
    status: 302,
    headers: {
      location: linkPath.slice(rootDirectory.length),
    },
  });
};

export const serveFile = async (requestPath: string) => {
  const file = await Deno.open(requestPath, { read: true });
  const readableStream = readableStreamFromReader(file);
  return new Response(readableStream);
};

// serveDirectory
const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
const ejsReader = new StringReader(
  Deno.readTextFileSync(path.join(__dirname, "./templates/index.html.ejs"))
);
const indexTemplate = await compileEjs(ejsReader);
const getDirectoryListing = async (dir: string) => {
  const entries: { name: string }[] = [];
  for await (const entry of Deno.readDir(dir)) {
    entries.push({
      name: entry.name,
    });
  }

  return [
    { name: ".." },
    ...entries.sort((a, b) => a.name.localeCompare(b.name)),
  ];
};
export const serveDirectory = async (
  requestPath: string,
  rootDirectory: string
) => {
  const body = await indexTemplate({
    path,
    urlPathname: requestPath.slice(rootDirectory.length),
    entries: await getDirectoryListing(requestPath),
  });

  return new Response(body, {
    status: 200,
    headers: htmlContentTypeHeaders,
  });
};

// serveAsciidoc
const asciidoctor = Asciidoctor();
export const serveAsciidoc = async (
  requestPath: string,
  serverPort: number,
  serverHost: string = "localhost"
) => {
  let adoc = await Deno.readTextFile(requestPath);
  adoc = `${adoc}\n${createLivereloadBlock({ serverPort, serverHost })}`;
  const html = asciidoctor.convert(adoc) as string;

  return new Response(html, {
    status: 200,
    headers: htmlContentTypeHeaders,
  });
};

// live reload
const createLivereloadBlock = ({
  serverHost,
  serverPort,
}: {
  serverHost: string;
  serverPort: number;
}) => `
++++
<script>
window.LiveReloadOptions = { host: "${serverHost}", port: ${serverPort} };
</script>
<script src="https://cdn.jsdelivr.net/npm/livereload.js@2.2.2/dist/livereload.js"></script>
++++
`;
const helloMessage = JSON.stringify({
  command: "hello",
  protocols: [
    "http://livereload.com/protocols/official-6",
    "http://livereload.com/protocols/official-7",
  ],
});

const createReloadMessage = (p: string) =>
  JSON.stringify({
    command: "reload",
    path: p,
  });
export const handleLivereload = async (
  request: Request,
  fileWatcherEventEmitter: EventEmitter<any>
) => {
  const { socket, response } = Deno.upgradeWebSocket(request);
  const listener = (p: string) => {
    socket.send(createReloadMessage(p));
  };
  fileWatcherEventEmitter.on("update", listener);
  socket.onmessage = (e) => {
    const message = JSON.parse(e.data);
    if (message.command === "hello") {
      socket.send(helloMessage);
    }
  };
  socket.onclose = () => {
    fileWatcherEventEmitter.off("update", listener);
  };
  socket.onerror = (e) => {
    fileWatcherEventEmitter.off("update", listener);
    console.error("WebSocket error:", e);
  };

  return response;
};
