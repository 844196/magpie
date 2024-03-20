import { match, type OpenAPIV3, P } from '../deps.mts'
import { type Dereferenced } from './types.mts'

export function computeDataShape(
  schema: Dereferenced<OpenAPIV3.SchemaObject>,
  { name = '', nullable = false }: { name?: string | undefined; nullable?: boolean | undefined } = {},
): string {
  if (schema.type === 'array') {
    return (
      (name.length > 0 ? `${name}${nullable ? '?' : ''}:` : '') +
      computeDataShape(schema.items, { name: '', nullable }) +
      '[]'
    )
  }

  if (schema.type === 'object') {
    return (
      (name.length > 0 ? `${name}${nullable ? '?' : ''}:array{` : 'array{') +
      Object.entries(schema.properties ?? {})
        .map(([childName, childSchema]) =>
          computeDataShape(childSchema, {
            name: childName,
            nullable: (schema.required ?? []).includes(childName) === false,
          })
        )
        .join(',') +
      '}'
    )
  }

  const type = match(schema)
    .with(
      { type: P.union('string', 'number').select('type'), enum: P.array(P.any).select('enumValues') },
      ({ type, enumValues }) =>
        `${type === 'number' ? 'int' : 'string'}&(${enumValues.map((x) => JSON.stringify(x)).join('|')})`,
    )
    .with({ type: 'string' }, () => 'string')
    .with({ type: 'integer' }, () => 'int')
    .with({ type: 'number' }, () => 'float')
    .with({ type: 'boolean' }, () => 'bool')
    .otherwise(() => 'mixed')

  return (name.length > 0 ? `${name}${nullable ? '?' : ''}:` : '') + type
}
