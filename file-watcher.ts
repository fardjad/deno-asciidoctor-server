import { path, delay, EventEmitter } from "./deps.ts";

export type Events = {
  update: [string];
};

export const fileWatcherEventEmitter = new EventEmitter<Events>();

export const watch = async (rootDirectory: string) => {
  const watcher = Deno.watchFs(rootDirectory, {
    recursive: true,
  });

  const ignorePattern = /_/;

  async function* generateSequence() {
    for await (const event of watcher) {
      if (event.kind === "access") {
        continue;
      }

      for (const eventPath of event.paths) {
        const relativePath = path.join(
          "./",
          eventPath.slice(rootDirectory.length)
        );

        if (ignorePattern.test(relativePath)) {
          continue;
        }

        yield relativePath;
      }
    }
  }

  async function* debounce() {
    const paths = new Set<string>();

    (async () => {
      for await (const p of generateSequence()) {
        paths.add(p);
      }
    })();

    while (true) {
      await delay(300);
      for (const p of paths) {
        yield p;
      }
      paths.clear();
    }
  }

  for await (const p of debounce()) {
    fileWatcherEventEmitter.emit("update", p);
  }
};
