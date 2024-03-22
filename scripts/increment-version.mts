#!/usr/bin/env -S deno run -A

import { $, Command, EnumType, type ReleaseType, format, increment, parse } from '../dev_deps.mts'
import current from '../version.json' with { type: 'json' }

const releaseType = new EnumType<ReleaseType>(['major', 'minor', 'patch'])

await new Command()
  .type('release-type', releaseType)
  .arguments('<major|minor|patch:release-type>')
  .action(async (_, to) => {
    const incremented = format(increment(parse(current), to))

    await Deno.writeTextFile('version.json', `${JSON.stringify(incremented)}\n`)
    await $`git add version.json`
    await $`git commit -m ':bookmark: v${incremented}'`
  })
  .parse(Deno.args)
