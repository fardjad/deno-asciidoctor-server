const value = `::set-output name=TARGET_INFO::${Deno.build.target}`;
await Deno.stdout.write(new TextEncoder().encode(value));
