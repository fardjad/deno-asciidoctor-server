// The following is mostly taken from https://deno.land/x/port@1.0.0.
// It seems that the author has abandoned the module and the code has an issue
// that prevents importing the module.

export interface IPortRange {
  start: number;
  end: number;
}

export interface IListenerOptions {
  port: number;
  hostname?: string;
  transport?: "tcp";
}

export interface IOptions {
  port?: number[] | IPortRange;
  hostname?: string;
  transport?: "tcp";
}

/**
 * Finds a random number between the given range
 * @param min
 * @param max
 */
function random(min: number, max: number): number {
  return Math.round(Math.random() * (max - min)) + min;
}

/**
 * Checks if a port is available
 * Requires `--allow-net` flag
 * @param options
 */
export function isPortAvailable(options: IListenerOptions): boolean {
  try {
    const listener = Deno.listen({
      port: options.port,
      ...(options.hostname ? { hostname: options.hostname } : {}),
      ...(options.transport ? { transport: options.transport } : {}),
    });
    listener.close();
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.AddrInUse) {
      return false;
    }
    throw error;
  }
}

/**
 * Finds a random available port in range 0-65535
 * @param options
 */
async function getRandomPort(options: IOptions): Promise<number> {
  const randomPort = random(0, 65535);
  if (
    await isPortAvailable({
      port: randomPort,
      ...(options.hostname ? { hostname: options.hostname } : {}),
      ...(options.transport ? { transport: options.transport } : {}),
    })
  ) {
    return randomPort;
  } else {
    return getRandomPort(options);
  }
}

/**
 * Checks if the given port is within range of 0-65535
 * @param port
 */
function withinRange(port: number): boolean {
  return port >= 0 && port <= 65535;
}

export async function getAvailablePort(
  options: IOptions = { transport: "tcp" }
): Promise<number | undefined> {
  if (options.port === undefined) {
    return getRandomPort(options);
  } else if (Array.isArray(options.port)) {
    const portList = options.port;
    for (let i = 0; i < portList.length; i++) {
      if (withinRange(portList[i])) {
        const portAvailable = await isPortAvailable({
          port: portList[i],
          ...(options.hostname ? { hostname: options.hostname } : {}),
          ...(options.transport ? { transport: options.transport } : {}),
        });
        if (portAvailable) {
          return portList[i];
        } else {
          continue;
        }
      } else {
        continue;
      }
    }
  } else if (
    options.port.start !== undefined &&
    options.port.end !== undefined
  ) {
    const start = options.port.start;
    const end = options.port.end;
    if (start >= 0 && end <= 65535 && start <= end) {
      for (let p = start; p <= end; p++) {
        const portAvailable = await isPortAvailable({
          port: p,
          ...(options.hostname ? { hostname: options.hostname } : {}),
          ...(options.transport ? { transport: options.transport } : {}),
        });
        if (portAvailable) {
          return p;
        } else {
          continue;
        }
      }
    } else {
      throw new Error(
        "Range should be between 0 - 65535 and start should be less than end"
      );
    }
  }
}
