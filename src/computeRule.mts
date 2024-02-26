import { type OpenAPIV3 } from 'openapi-types'
import { P, match } from 'ts-pattern'
import { hasValidationRuleExtension, type Dereferenced, type FormRequestValidationDefinition } from './types.mjs'

function computeNecessary(opts: {
  type: Required<OpenAPIV3.SchemaObject>['type']
  required: boolean
  minLength?: number
  minItems?: number
}) {
  return match({ minLength: 0, minItems: 0, ...opts })
    .with({ type: 'string', required: true, minLength: 0 }, () => ['present'])
    .with({ type: 'string', required: true, minLength: P.number.positive() }, () => ['required'])
    .with({ type: 'string', required: false, minLength: 0 }, () => ['sometimes'])
    .with({ type: 'string', required: false, minLength: P.number.positive() }, () => ['filled'])
    .with({ type: 'array', required: true, minItems: 0 }, () => ['present'])
    .with({ type: 'array', required: true, minItems: P.number.positive() }, () => ['required'])
    .with({ type: 'array', required: false, minItems: 0 }, () => ['sometimes'])
    .with({ type: 'array', required: false, minItems: P.number.positive() }, () => ['filled'])
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
    return [
      {
        name,
        rule: [
          ...computeNecessary({
            type: schema.type ?? 'object',
            required,
            minLength: schema.minLength ?? 0,
            minItems: schema.minItems ?? 0,
          }),
          ...schema['x-magpie-laravel-validation-rule'],
        ],
      },
    ]
  }

  if (schema.type === 'array') {
    return [
      {
        name,
        rule: [
          ...computeNecessary({ type: 'array', required, minItems: schema.minItems ?? 0 }),
          'array',
          ...match({ minItems: schema.minItems ?? 0, maxItems: schema.maxItems })
            .with({ minItems: P.number.positive(), maxItems: P.number.positive() }, ({ minItems, maxItems }) => [
              `between:${minItems},${maxItems}`,
            ])
            .with({ minItems: 0, maxItems: P.number.positive() }, ({ maxItems }) => [`max:${maxItems}`])
            .with({ minItems: P.number.positive() }, ({ minItems }) => [`min:${minItems}`])
            .otherwise(() => []),
        ],
      },
      ...computeRule(schema.items, { name: `${name}.*` }),
    ]
  }

  if (schema.type === 'object') {
    return Object.entries(schema.properties ?? {}).flatMap(([childName, childSchema]) =>
      computeRule(childSchema, {
        name: name.length > 0 ? `${name}.${childName}` : childName,
        required: required && (schema.required ?? []).includes(childName),
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
        ...computeNecessary({ type: 'string', required, minLength }),
        'string',
        `between:${minLength},${maxLength}`,
        `regex:/${pattern}/`,
      ],
    )
    .with(
      {
        type: 'string',
        minLength: P.number.select('minLength'),
        pattern: P.string.select('pattern'),
      },
      ({ minLength, pattern }) => [
        ...computeNecessary({ type: 'string', required, minLength }),
        'string',
        `min:${minLength}`,
        `regex:/${pattern}/`,
      ],
    )
    .with(
      {
        type: 'string',
        maxLength: P.number.select('maxLength'),
        pattern: P.string.select('pattern'),
      },
      ({ maxLength, pattern }) => [
        ...computeNecessary({ type: 'string', required }),
        'string',
        `max:${maxLength}`,
        `regex:/${pattern}/`,
      ],
    )
    .with(
      {
        type: 'string',
        pattern: P.string.select('pattern'),
      },
      ({ pattern }) => [...computeNecessary({ type: 'string', required }), 'string', `regex:/${pattern}/`],
    )
    .with(
      {
        type: 'string',
        minLength: P.number.select('minLength'),
        maxLength: P.number.select('maxLength'),
      },
      ({ minLength, maxLength }) => [
        ...computeNecessary({ type: 'string', required, minLength }),
        'string',
        `between:${minLength},${maxLength}`,
      ],
    )
    .with(
      {
        type: 'string',
        minLength: P.number.select('minLength'),
      },
      ({ minLength }) => [...computeNecessary({ type: 'string', required, minLength }), 'string', `min:${minLength}`],
    )
    .with(
      {
        type: 'string',
        maxLength: P.number.select('maxLength'),
      },
      ({ maxLength }) => [...computeNecessary({ type: 'string', required }), 'string', `max:${maxLength}`],
    )
    .with(
      {
        type: 'string',
        enum: P.array(P.string),
      },
      ({ enum: values }) => [
        ...computeNecessary({ type: 'string', required }),
        'string',
        { raw: `\\Illuminate\\Validation\\Rule::in(${JSON.stringify(values)})` },
      ],
    )
    .with(
      {
        type: 'string',
        format: 'email',
      },
      () => [...computeNecessary({ type: 'string', required }), 'string', 'email'],
    )
    .with(
      {
        type: 'string',
        format: 'date-time',
      },
      () => [...computeNecessary({ type: 'string', required }), 'string', 'date-format'],
    )
    .with(
      {
        type: 'string',
      },
      () => [...computeNecessary({ type: 'string', required }), 'string'],
    )

    // integer
    .with(
      {
        type: 'integer',
        minimum: P.number.select('minimum'),
        maximum: P.number.select('maximum'),
      },
      ({ minimum, maximum }) => [
        ...computeNecessary({ type: 'integer', required }),
        'integer',
        `between:${minimum},${maximum}`,
      ],
    )
    .with(
      {
        type: 'integer',
        minimum: P.number.select('minimum'),
      },
      ({ minimum }) => [...computeNecessary({ type: 'integer', required }), 'integer', `min:${minimum}`],
    )
    .with(
      {
        type: 'integer',
        maximum: P.number.select('maximum'),
      },
      ({ maximum }) => [...computeNecessary({ type: 'integer', required }), 'integer', `max:${maximum}`],
    )
    .with(
      {
        type: 'integer',
        enum: P.array(P.string),
      },
      ({ enum: values }) => [
        ...computeNecessary({ type: 'integer', required }),
        'integer',
        { raw: `\\Illuminate\\Validation\\Rule::in(${JSON.stringify(values)})` },
      ],
    )
    .with(
      {
        type: 'integer',
      },
      () => [...computeNecessary({ type: 'integer', required }), 'integer'],
    )

    // number
    .with(
      {
        type: 'number',
        minimum: P.number.select('minimum'),
        maximum: P.number.select('maximum'),
      },
      ({ minimum, maximum }) => [
        ...computeNecessary({ type: 'number', required }),
        'numeric',
        `between:${minimum},${maximum}`,
      ],
    )
    .with(
      {
        type: 'number',
        minimum: P.number.select('minimum'),
      },
      ({ minimum }) => [...computeNecessary({ type: 'number', required }), 'numeric', `min:${minimum}`],
    )
    .with(
      {
        type: 'number',
        maximum: P.number.select('maximum'),
      },
      ({ maximum }) => [...computeNecessary({ type: 'number', required }), 'numeric', `max:${maximum}`],
    )
    .with(
      {
        type: 'number',
        enum: P.array(P.string),
      },
      ({ enum: values }) => [
        ...computeNecessary({ type: 'number', required }),
        'numeric',
        { raw: `\\Illuminate\\Validation\\Rule::in(${JSON.stringify(values)})` },
      ],
    )
    .with(
      {
        type: 'number',
      },
      () => [...computeNecessary({ type: 'number', required }), 'numeric'],
    )

    // boolean
    .with(
      {
        type: 'boolean',
      },
      () => [...computeNecessary({ type: 'boolean', required }), 'boolean'],
    )
    .otherwise(() => [])

  return [{ name, rule }]
}
