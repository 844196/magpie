import SwaggerParser from '@apidevtools/swagger-parser'
import { type OpenAPIV3 } from 'openapi-types'
import { main } from './main.mts'
import { type Dereferenced } from './types.mts'
import { Command, CompletionsCommand } from 'cliffy/command'
import VERSION from '../version.json' with { type: 'json' }
import BUILTIN_TEMPLATE from './template.json' with { type: 'json' }

await new Command()
  .name('magpie')
  .version(VERSION)
  .command('form-request <OPENAPI_SPEC>')
  .description('Generate Laravel FormRequest from OpenAPI')
  .option('-n, --namespace <NAMESPACE>', 'Namespace for the generated code', { default: 'Generated\\Http\\Requests' })
  .option('-o, --output <OUTPUT_DIR>', 'Output directory path for the generated code', {
    default: '.generated/Http/Requests',
  })
  .option('-t, --template <TEMPLATE_PATH>', 'Path to the template file')
  .action(async ({ output: outputPath, namespace, template: templatePath }, spec) => {
    let template = BUILTIN_TEMPLATE
    if (templatePath !== undefined) {
      template = await Deno.readTextFile(templatePath)
    }

    await Deno.mkdir(outputPath, { recursive: true })

    await main(
      outputPath,
      namespace,
      (await SwaggerParser.dereference(spec)) as Dereferenced<OpenAPIV3.Document>,
      template,
    )
  })
  .command('completions', new CompletionsCommand())
  .parse(Deno.args)
