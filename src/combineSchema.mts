import { type OpenAPIV3 } from 'openapi-types'
import { P, match } from 'ts-pattern'
import { hasRouteModelBindingExtension, type Dereferenced } from './types.mjs'

export function combineSchema({
  parameters = [],
  requestBody,
}: Dereferenced<OpenAPIV3.OperationObject>): Dereferenced<OpenAPIV3.NonArraySchemaObject> {
  const root = match(requestBody)
    .returnType<Dereferenced<OpenAPIV3.NonArraySchemaObject>>()
    .with(
      {
        required: P.optional(P.select('bodyRequired')),
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: P.optional(P.select('properties')),
              required: P.optional(P.select('requiredProperties')),
            },
          },
        },
      },
      ({ bodyRequired = false, properties = {}, requiredProperties = [] }) => ({
        type: 'object',
        properties,
        required: bodyRequired ? requiredProperties : [],
      }),
    )
    .otherwise(() => ({ type: 'object', properties: {}, required: [] }))

  for (const parameter of parameters) {
    if (hasRouteModelBindingExtension(parameter)) {
      continue
    }

    root.properties![parameter.name] = parameter.schema!
    if (parameter.required) {
      root.required!.push(parameter.name)
    }
  }

  return root
}
