import { type OpenAPIV3 } from '../deps.mts'

export type PropertyAnnotation = {
  name: string
  type: string
  description?: string | undefined
}

export type ValidationRule = Array<string | { raw: string } | (string | number)[]>

export type FormRequestValidationDefinition = {
  name: string
  rule: ValidationRule
}

export type PHPDocTag = [tag: string, ...string[]]

export type AuthExtension = string | string[]

export function hasAuthExtension<T extends OpenAPIV3.OperationObject>(
  x: T,
): x is T & { 'x-magpie-laravel-auth': AuthExtension } {
  if (!('x-magpie-laravel-auth' in x)) {
    return false
  }

  return typeof x['x-magpie-laravel-auth'] === 'string' || Array.isArray(x['x-magpie-laravel-auth'])
}

export type ValidationRuleExtension = ValidationRule

export function hasValidationRuleExtension<T extends OpenAPIV3.SchemaObject>(
  x: T,
): x is T & { 'x-magpie-laravel-validation-rule': ValidationRuleExtension } {
  return 'x-magpie-laravel-validation-rule' in x && Array.isArray(x['x-magpie-laravel-validation-rule'])
}

export type RouteModelBindingExtension = {
  key: string
  model: string
  description?: string
}

export function hasRouteModelBindingExtension<T extends OpenAPIV3.ParameterObject>(
  x: T,
): x is T & {
  'x-magpie-laravel-route-model-binding': RouteModelBindingExtension
} {
  if (!('x-magpie-laravel-route-model-binding' in x)) {
    return false
  }

  if (!(typeof x['x-magpie-laravel-route-model-binding'] === 'object')) {
    return false
  }

  return true
}

export type FormRequestNameExtension = string

export function hasFormRequestNameExtension<T extends OpenAPIV3.OperationObject>(
  x: T,
): x is T & { 'x-magpie-laravel-form-request-name': FormRequestNameExtension } {
  if (!('x-magpie-laravel-form-request-name' in x)) {
    return false
  }

  if (typeof x['x-magpie-laravel-form-request-name'] !== 'string') {
    return false
  }

  return true
}

export type Dereferenced<T> = T extends OpenAPIV3.ReferenceObject ? Exclude<T, OpenAPIV3.ReferenceObject>
  : T extends (infer U)[] ? Dereferenced<U>[]
  // deno-lint-ignore ban-types
  : T extends Function | Date | Error | RegExp ? T
  : { [key in keyof T]: Dereferenced<T[key]> }
