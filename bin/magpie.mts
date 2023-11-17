import path from 'node:path'
import url from 'node:url'
import SwaggerParser from '@apidevtools/swagger-parser'
import { Eta } from 'eta'
import { OpenAPIV3 } from 'openapi-types'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { main } from '../src/main.mjs'
import { type Dereferenced } from '../src/types.mjs'

void yargs(hideBin(process.argv))
  .command(
    'generate request <spec>',
    '',
    (args) =>
      args
        .env('MAGPIE')
        .positional('spec', {
          type: 'string',
        })
        .option('namespace', {
          type: 'string',
          default: 'Generated\\Http\\Requests',
          alias: 'n',
        })
        .option('output', {
          type: 'string',
          default: '.generated/Http/Requests',
          alias: 'o',
        })
        .option('templates', {
          type: 'string',
          default: path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../templates'),
          alias: 't',
        }),
    async ({ spec = '', output, namespace, templates }) => {
      await main(
        path.resolve(output),
        namespace,
        (await SwaggerParser.dereference(spec)) as Dereferenced<OpenAPIV3.Document>,
        new Eta({ views: templates }),
      )
    },
  )
  .parse()
