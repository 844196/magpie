import { type OpenAPIV3 } from 'openapi-types'
import { P, match } from 'ts-pattern'
import { hasValidationRuleExtension, type Dereferenced, type FormRequestValidationDefinition } from './types.mjs'

export function computeRule(
  schema: Dereferenced<OpenAPIV3.SchemaObject>,
  { name = '', required = false }: { name?: string | undefined; required?: boolean | undefined } = {},
): FormRequestValidationDefinition[] {
  if (hasValidationRuleExtension(schema)) {
    return [{ name, rule: [required ? 'required' : 'sometimes', ...schema['x-magpie-laravel-validation-rule']] }]
  }

  if (schema.type === 'array') {
    return [
      { name, rule: [required ? 'required' : 'sometimes', 'array'] },
      ...computeRule(schema.items, { name: `${name}.*` }),
    ]
  }

  if (schema.type === 'object') {
    return Object.entries(schema.properties ?? {}).flatMap(([childName, childSchema]) =>
      computeRule(childSchema, {
        name: name.length > 0 ? `${name}.${childName}` : childName,
        required: (schema.required ?? []).includes(childName),
      }),
    )
  }

  const rule = match(schema)
    // string
    .with(
      {
        type: 'string',
        minLength: P.number.select('min'),
        maxLength: P.number.select('max'),
        pattern: P.string.select('pattern'),
      },
      ({ min, max, pattern }) => ['string', ['between', min, max], ['regex', `/${pattern}/`]],
    )
    .with(
      {
        type: 'string',
        minLength: P.number.select('min'),
        pattern: P.string.select('pattern'),
      },
      ({ min, pattern }) => ['string', ['min', min], ['regex', `/${pattern}/`]],
    )
    .with(
      {
        type: 'string',
        maxLength: P.number.select('max'),
        pattern: P.string.select('pattern'),
      },
      ({ max, pattern }) => ['string', ['max', max], ['regex', `/${pattern}/`]],
    )
    .with(
      {
        type: 'string',
        pattern: P.string.select('pattern'),
      },
      ({ pattern }) => ['string', ['regex', `/${pattern}/`]],
    )
    .with(
      {
        type: 'string',
        minLength: P.number.select('min'),
        maxLength: P.number.select('max'),
      },
      ({ min, max }) => ['string', ['between', min, max]],
    )
    .with(
      {
        type: 'string',
        minLength: P.number.select('min'),
      },
      ({ min }) => ['string', ['min', min]],
    )
    .with(
      {
        type: 'string',
        maxLength: P.number.select('max'),
      },
      ({ max }) => ['string', ['max', max]],
    )
    .with(
      {
        type: 'string',
        enum: P.array(P.string),
      },
      ({ enum: values }) => ['string', { raw: `\\Illuminate\\Validation\\Rule::in(${JSON.stringify(values)})` }],
    )
    .with(
      {
        type: 'string',
        format: 'email',
      },
      () => ['string', 'email'],
    )
    .with(
      {
        type: 'string',
        format: 'date-time',
      },
      () => ['string', 'date-format'],
    )
    .with(
      {
        type: 'string',
      },
      () => ['string'],
    )

    // integer
    .with(
      {
        type: 'integer',
        minimum: P.number.select('min'),
        maximum: P.number.select('max'),
      },
      ({ min, max }) => ['integer', ['between', min, max]],
    )
    .with(
      {
        type: 'integer',
        minimum: P.number.select('min'),
      },
      ({ min }) => ['integer', ['min', min]],
    )
    .with(
      {
        type: 'integer',
        maximum: P.number.select('max'),
      },
      ({ max }) => ['integer', ['max', max]],
    )
    .with(
      {
        type: 'integer',
        enum: P.array(P.string),
      },
      ({ enum: values }) => ['integer', { raw: `\\Illuminate\\Validation\\Rule::in(${JSON.stringify(values)})` }],
    )
    .with(
      {
        type: 'integer',
      },
      () => ['integer'],
    )

    // number
    .with(
      {
        type: 'number',
        minimum: P.number.select('min'),
        maximum: P.number.select('max'),
      },
      ({ min, max }) => ['numeric', ['between', min, max]],
    )
    .with(
      {
        type: 'number',
        minimum: P.number.select('min'),
      },
      ({ min }) => ['numeric', ['min', min]],
    )
    .with(
      {
        type: 'number',
        maximum: P.number.select('max'),
      },
      ({ max }) => ['numeric', ['max', max]],
    )
    .with(
      {
        type: 'number',
        enum: P.array(P.string),
      },
      ({ enum: values }) => ['numeric', { raw: `\\Illuminate\\Validation\\Rule::in(${JSON.stringify(values)})` }],
    )
    .with(
      {
        type: 'number',
      },
      () => ['numeric'],
    )

    // boolean
    .with(
      {
        type: 'boolean',
      },
      () => ['boolean'],
    )
    .otherwise(() => [])

  return [{ name, rule: [required ? 'required' : 'sometimes', ...rule] }]
}
