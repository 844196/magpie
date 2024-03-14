import * as path from 'std/path'
import { Eta } from 'eta'
import { type OpenAPIV3 } from 'openapi-types'
import { match, P } from 'ts-pattern'
import { combineSchema } from './combineSchema.mts'
import { computeDataShape } from './computeDataShape.mts'
import { computeRule } from './computeRule.mts'
import {
  type Dereferenced,
  hasAuthExtension,
  hasFormRequestNameExtension,
  hasRouteModelBindingExtension,
  type PHPDocTag,
} from './types.mts'

const eta = new Eta()

export async function main(output: string, namespace: string, doc: Dereferenced<OpenAPIV3.Document>, template: string) {
  const waitings = []
  for (const [apiPath, pathItem] of Object.entries(doc.paths)) {
    if (!pathItem) {
      continue
    }

    for (const [method, operation] of Object.entries(pathItem)) {
      if (typeof operation === 'string' || Array.isArray(operation)) {
        continue
      }

      let className
      if (hasFormRequestNameExtension(operation)) {
        className = operation['x-magpie-laravel-form-request-name']
      } else if ('operationId' in operation && typeof operation.operationId === 'string') {
        className = `${
          operation.operationId
            .replaceAll('-', '')
            .replaceAll(' ', '')
            .replace(/^[a-z]/, (c) => c.toUpperCase())
        }Request`
      } else {
        className = `${method.replace(/^[a-z]/, (c) => c.toUpperCase())}${
          apiPath
            .split(/[-/_]/)
            .filter((v) => v.length > 0)
            .map((v) => v.replace(/^[a-z]/, (c) => c.toUpperCase()))
            .join('')
        }Request`
      }

      const docSummary = `${method.toUpperCase()} ${apiPath} - ${operation.summary}`

      const authUsers = hasAuthExtension(operation) ? [operation['x-magpie-laravel-auth']].flat() : []

      const docTags: PHPDocTag[] = (operation.parameters ?? [])
        .filter(hasRouteModelBindingExtension)
        .map(({ 'x-magpie-laravel-route-model-binding': binding, ...param }) => [
          'property-read',
          binding.model,
          `$${binding.key}`,
          binding.description ?? param.description ?? param.schema!.description ?? '',
        ])

      const rootSchema = combineSchema(operation)

      const rules = computeRule(rootSchema, { required: operation.requestBody?.required ?? false }).map(
        ({ name, rule }) => {
          return {
            name,
            rule: `[${
              rule
                .map((r) =>
                  match(r)
                    .with({ raw: P.string }, ({ raw }) => raw)
                    .otherwise((v) => JSON.stringify(v))
                )
                .join(',')
            }]`,
          }
        },
      )

      const dataShape = computeDataShape(rootSchema)

      const rendered = eta.renderString(template, {
        method,
        path: apiPath,
        operation,
        namespace,
        className,
        docSummary,
        docTags,
        authUsers,
        rules,
        dataShape,
      })
      waitings.push(Deno.writeTextFile(path.join(output, `${className}.php`), rendered))
    }
  }
  await Promise.all(waitings)
}
