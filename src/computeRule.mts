import { type OpenAPIV3 } from 'openapi-types'
import { P, match } from 'ts-pattern'
import { hasValidationRuleExtension, type Dereferenced, type FormRequestValidationDefinition } from './types.mjs'

function computeNecessary(required: boolean, opts: { minLength?: number } = {}) {
  return match({ required, ...opts })
    .with({ required: true, minLength: 0 }, () => ['present'])
    .with({ required: true, minLength: P.number.positive() }, () => ['required'])
    .with({ required: false, minLength: 0 }, () => ['sometimes'])
    .with({ required: false, minLength: P.number.positive() }, () => ['sometimes', 'required'])
    .with({ required: true }, () => ['required'])
    .with({ required: false }, () => ['sometimes'])
    .otherwise(() => [])
}

export function computeRule(
  schema: Dereferenced<OpenAPIV3.SchemaObject>,
  {
    name = '',
    required = false,
  }: { name?: string | undefined; required?: boolean | undefined; present?: boolean | undefined } = {},
): FormRequestValidationDefinition[] {
  if (hasValidationRuleExtension(schema)) {
    return [{ name, rule: [...computeNecessary(required), ...schema['x-magpie-laravel-validation-rule']] }]
  }

  if (schema.type === 'array') {
    return [
      { name, rule: [...computeNecessary(required), 'array'] },
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
        minLength: P.number.select('minLength'),
        maxLength: P.number.select('maxLength'),
        pattern: P.string.select('pattern'),
      },
      ({ minLength, maxLength, pattern }) => [
        ...computeNecessary(required, { minLength }),
        'string',
        ['between', minLength, maxLength],
        ['regex', `/${pattern}/`],
      ],
    )
    .with(
      {
        type: 'string',
        minLength: P.number.select('minLength'),
        pattern: P.string.select('pattern'),
      },
      ({ minLength, pattern }) => [
        ...computeNecessary(required, { minLength }),
        'string',
        ['min', minLength],
        ['regex', `/${pattern}/`],
      ],
    )
    .with(
      {
        type: 'string',
        maxLength: P.number.select('maxLength'),
        pattern: P.string.select('pattern'),
      },
      ({ maxLength, pattern }) => [
        ...computeNecessary(required),
        'string',
        ['max', maxLength],
        ['regex', `/${pattern}/`],
      ],
    )
    .with(
      {
        type: 'string',
        pattern: P.string.select('pattern'),
      },
      ({ pattern }) => [...computeNecessary(required), 'string', ['regex', `/${pattern}/`]],
    )
    .with(
      {
        type: 'string',
        minLength: P.number.select('minLength'),
        maxLength: P.number.select('maxLength'),
      },
      ({ minLength, maxLength }) => [
        ...computeNecessary(required, { minLength }),
        'string',
        ['between', minLength, maxLength],
      ],
    )
    .with(
      {
        type: 'string',
        minLength: P.number.select('minLength'),
      },
      ({ minLength }) => [...computeNecessary(required, { minLength }), 'string', ['min', minLength]],
    )
    .with(
      {
        type: 'string',
        maxLength: P.number.select('maxLength'),
      },
      ({ maxLength }) => [...computeNecessary(required), 'string', ['max', maxLength]],
    )
    .with(
      {
        type: 'string',
        enum: P.array(P.string),
      },
      ({ enum: values }) => [
        ...computeNecessary(required),
        'string',
        { raw: `\\Illuminate\\Validation\\Rule::in(${JSON.stringify(values)})` },
      ],
    )
    .with(
      {
        type: 'string',
        format: 'email',
      },
      () => [...computeNecessary(required), 'string', 'email'],
    )
    .with(
      {
        type: 'string',
        format: 'date-time',
      },
      () => [...computeNecessary(required), 'string', 'date-format'],
    )
    .with(
      {
        type: 'string',
      },
      () => [...computeNecessary(required), 'string'],
    )

    // integer
    .with(
      {
        type: 'integer',
        minimum: P.number.select('minimum'),
        maximum: P.number.select('maximum'),
      },
      ({ minimum, maximum }) => [...computeNecessary(required), 'integer', ['between', minimum, maximum]],
    )
    .with(
      {
        type: 'integer',
        minimum: P.number.select('minimum'),
      },
      ({ minimum }) => [...computeNecessary(required), 'integer', ['min', minimum]],
    )
    .with(
      {
        type: 'integer',
        maximum: P.number.select('maximum'),
      },
      ({ maximum }) => [...computeNecessary(required), 'integer', ['max', maximum]],
    )
    .with(
      {
        type: 'integer',
        enum: P.array(P.string),
      },
      ({ enum: values }) => [
        ...computeNecessary(required),
        'integer',
        { raw: `\\Illuminate\\Validation\\Rule::in(${JSON.stringify(values)})` },
      ],
    )
    .with(
      {
        type: 'integer',
      },
      () => [...computeNecessary(required), 'integer'],
    )

    // number
    .with(
      {
        type: 'number',
        minimum: P.number.select('minimum'),
        maximum: P.number.select('maximum'),
      },
      ({ minimum, maximum }) => [...computeNecessary(required), 'numeric', ['between', minimum, maximum]],
    )
    .with(
      {
        type: 'number',
        minimum: P.number.select('minimum'),
      },
      ({ minimum }) => [...computeNecessary(required), 'numeric', ['min', minimum]],
    )
    .with(
      {
        type: 'number',
        maximum: P.number.select('maximum'),
      },
      ({ maximum }) => [...computeNecessary(required), 'numeric', ['max', maximum]],
    )
    .with(
      {
        type: 'number',
        enum: P.array(P.string),
      },
      ({ enum: values }) => [
        ...computeNecessary(required),
        'numeric',
        { raw: `\\Illuminate\\Validation\\Rule::in(${JSON.stringify(values)})` },
      ],
    )
    .with(
      {
        type: 'number',
      },
      () => [...computeNecessary(required), 'numeric'],
    )

    // boolean
    .with(
      {
        type: 'boolean',
      },
      () => [...computeNecessary(required), 'boolean'],
    )
    .otherwise(() => [])

  return [{ name, rule }]
}
