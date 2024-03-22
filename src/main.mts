import { Eta, type OpenAPIV3, P, match, pathJoin } from '../deps.mts'
import { combineSchema } from './combine-schema.mts'
import { computeDataShape } from './compute-data-shape.mts'
import { computeRule } from './compute-rule.mts'
import {
  type Dereferenced,
  type PHPDocTag,
  hasAuthExtension,
  hasFormRequestNameExtension,
  hasRouteModelBindingExtension,
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

      let className: string
      if (hasFormRequestNameExtension(operation)) {
        className = operation['x-magpie-laravel-form-request-name']
      } else if ('operationId' in operation && typeof operation.operationId === 'string') {
        className = `${operation.operationId
          .replaceAll('-', '')
          .replaceAll(' ', '')
          .replace(/^[a-z]/, (c) => c.toUpperCase())}Request`
      } else {
        className = `${method.replace(/^[a-z]/, (c) => c.toUpperCase())}${apiPath
          .split(/[-/_]/)
          .filter((v) => v.length > 0)
          .map((v) => v.replace(/^[a-z]/, (c) => c.toUpperCase()))
          .join('')}Request`
      }

      const docSummary = `${method.toUpperCase()} ${apiPath} - ${operation.summary}`

      const authUsers = hasAuthExtension(operation) ? [operation['x-magpie-laravel-auth']].flat() : []

      const docTags: PHPDocTag[] = (operation.parameters ?? [])
        .filter(hasRouteModelBindingExtension)
        .map(({ 'x-magpie-laravel-route-model-binding': binding, ...param }) => [
          'property-read',
          binding.model,
          `$${binding.key}`,
          binding.description ?? param.description ?? param.schema?.description ?? '',
        ])

      const rootSchema = combineSchema(operation)

      const rules = computeRule(rootSchema, { required: operation.requestBody?.required ?? false }).map(
        ({ name, rule }) => {
          return {
            name,
            rule: `[${rule
              .map((r) =>
                match(r)
                  .with({ raw: P.string }, ({ raw }) => raw)
                  .otherwise((v) => JSON.stringify(v)),
              )
              .join(',')}]`,
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
      waitings.push(Deno.writeTextFile(pathJoin(output, `${className}.php`), rendered))
    }
  }
  await Promise.all(waitings)
}
