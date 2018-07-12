import { isScalar, assign } from './object'

/* eslint-disable no-labels */

const ARRAY_KEYWORDS = ['anyOf', 'oneOf', 'enum']
export const NUMBER_TYPES = ['number', 'integer']

export function s4 () {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1)
}

export function genId (prefix = '') {
  const suffix = s4() + s4()

  if (prefix) {
    return `${prefix}-${suffix}`
  }

  return suffix
}

export function setCommonFields (schema, field, model = null) {
  if (model !== null) {
    field.attrs.value = model
  } else if (field.attrs.hasOwnProperty('value')) {
    field.attrs.value = field.attrs.value
  } else {
    field.attrs.value = schema.default
  }

  field.order = schema.order
  field.schemaType = schema.type
  field.label = schema.title || ''
  field.description = schema.description || ''
  field.attrs.id = field.attrs.id || genId(field.attrs.name)
  field.attrs.required = schema.required || false
  field.attrs.disabled = schema.disabled || false
}

export function parseDefaultScalarValue (schema, fields, value) {
  if (typeof value !== 'undefined' && isScalar(value)) {
    return value
  }

  if (fields.length) {
    if (fields[0].schemaType === 'boolean') {
      return fields[0].attrs.checked === true
    }

    if (fields[0].attrs.hasOwnProperty('value')) {
      return fields[0].attrs.value
    }
  }

  return undefined
}

export function parseEventValue ({ target, field, data }) {
  switch (field.schemaType) {
    case 'boolean':
      return target.checked === true

    case 'string':
      return data || ''

    case 'integer':
      if (data !== undefined) {
        return parseInt(data)
      }
      break

    case 'number':
      if (data !== undefined) {
        return parseFloat(data)
      }
      break

    case 'array':
      return data || []

    case 'object':
      return data || {}
  }

  return data
}

export function parseDefaultObjectValue (schema, fields, value) {
  const data = schema.type === 'object' ? {} : []

  if (value) {
    assign(data, value)
  }

  fields.forEach((field) => {
    const { type, name } = field.attrs
    const itemValue = field.schemaType === 'boolean'
      ? typeof data[name] === 'boolean'
        ? data[name]
        : field.attrs.checked === true
      : typeof data[name] !== 'undefined'
        ? data[name]
        : field.attrs.value

    const target = {}
    const eventInput = { field, data: itemValue, target }

    switch (field.schemaType) {
      case 'boolean':
        target.checked = itemValue
        data[name] = parseEventValue(eventInput)
        break

      default:
        if (field.isArrayField) {
          if (data[name] instanceof Array) {
            data[name] = data[name].filter((value) => {
              return value !== undefined
            })
          } else {
            data[name] = []
          }

          field.itemsNum = type === 'checkbox'
            ? field.items.length
            : field.minItems
        } else {
          data[name] = parseEventValue(eventInput)
        }
        break
    }
  })

  return data
}

export function loadFields (schema, fields, name = null, model = null) {
  switch (schema.type) {
    case 'object':
      if (schema.required instanceof Array) {
        schema.required.forEach((field) => {
          schema.properties[field].required = true
        })
      }

      const allProperties = Object.keys(schema.properties)
      const properties = schema.order instanceof Array
        ? schema.order
        : allProperties

      if (properties.length < allProperties.length) {
        allProperties.forEach((prop) => {
          if (!properties.includes(prop)) {
            properties.push(prop)
          }
        })
      }

      if (model === null) {
        model = {}
      }

      properties.forEach((key) => {
        loadFields(schema.properties[key], fields, key, model[key] || null)
      })
      break

    case 'boolean':
      fields.push(parseBoolean(schema, name, model))
      break

    case 'array':
      fields.push(parseArray(schema, name, model))
      break

    case 'integer':
    case 'number':
    case 'string':
      for (let keyword of ARRAY_KEYWORDS) {
        if (schema.hasOwnProperty(keyword)) {
          schema.items = {
            type: schema.type,
            enum: schema[keyword]
          }

          fields.push(parseArray(schema, name, model))
          return
        }
      }
      fields.push(parseString(schema, name, model))
      break
  }
}

export function parseBoolean (schema, name = null, model = null) {
  const field = {
    attrs: schema.attrs || {}
  }

  if (name) {
    field.attrs.name = name
  }

  setCommonFields(schema, field, model)

  if (!field.attrs.type) {
    field.attrs.type = 'checkbox'
  }

  if (!field.attrs.hasOwnProperty('checked')) {
    field.attrs.checked = schema.default === true
  }

  delete field.attrs.value

  return field
}

export function parseString (schema, name = null, model = null) {
  const field = {
    attrs: schema.attrs || {}
  }

  if (schema.pattern) {
    field.attrs.pattern = schema.pattern
  }

  if (schema.format) {
    switch (schema.format) {
      case 'email':
        if (!field.attrs.type) {
          field.attrs.type = 'email'
        }
        break

      case 'uri':
        if (!field.attrs.type) {
          field.attrs.type = 'url'
        }
        break
    }
  }

  if (!field.attrs.type) {
    switch (schema.type) {
      case 'number':
      case 'integer':
        field.attrs.type = 'number'
        break
      default:
        field.attrs.type = 'text'
    }
  }

  if (name) {
    field.attrs.name = name
  }

  setCommonFields(schema, field, model)

  if (schema.minLength) {
    field.attrs.minlength = schema.minLength
  }

  if (schema.maxLength) {
    field.attrs.maxlength = schema.maxLength
  }

  return field
}

export function parseItems (items) {
  return items.map((item) => {
    if (typeof item !== 'object') {
      return { value: item, label: item }
    }

    return item
  })
}

export const setItemName = (name, isRadio = false) => (item, i) => {
  if (isRadio) {
    item.name = name
  }

  if (!item.name) {
    item.name = name ? `${name}-` : ''
    item.name += item.label.replace(/\s+/g, '-')
  }

  if (name) {
    item.ref = `${name}-${i}`
  }

  if (!item.id) {
    item.id = genId(item.name || name)
  }

  return item
}

export function arrayOrderedValues (field) {
  return field.items.map((item) => item.checked ? item.value : undefined)
}

export function arrayUnorderedValues (field) {
  return field.items
    .filter((item) => (item.checked || item.selected))
    .map((item) => item.value)
}

export function singleValue (field) {
  const item = field.items.reverse().find((item) => item.checked || item.selected)

  return item ? item.value : ''
}

const NOT_ARRAY = ['radio', 'checkbox', 'switch']

export function parseArray (schema, name = null, model = null) {
  const field = {
    attrs: schema.attrs || {}
  }

  if (name) {
    field.attrs.name = name
  }

  setCommonFields(schema, field, model)

  field.items = []
  field.minItems = parseInt(schema.minItems) || 1
  field.maxItems = parseInt(schema.maxItems) || 1000

  loop:
  for (let keyword of ARRAY_KEYWORDS) {
    if (schema.hasOwnProperty(keyword)) {
      switch (keyword) {
        case 'enum':
          if (!field.attrs.type) {
            field.attrs.type = 'select'
          }

          field.items = parseItems(schema[keyword])

          if (field.attrs.value === void (0) || field.attrs.value.length === 0) {
            field.attrs.value = field.schemaType === 'array'
              ? arrayUnorderedValues(field)
              : singleValue(field)
          }
          break loop

        case 'oneOf':
          field.attrs.type = 'radio'
          field.attrs.value = field.attrs.value || ''

          field.items = parseItems(schema[keyword]).map(setItemName(name, true))

          if (field.attrs.value === void (0) || field.attrs.value.length === 0) {
            field.attrs.value = singleValue(field)
          }
          break loop

        case 'anyOf':
          field.attrs.type = 'checkbox'
          field.attrs.value = field.attrs.value || []

          field.items = parseItems(schema[keyword]).map(setItemName(name))
          field.isArrayField = true

          if (field.attrs.value === void (0) || field.attrs.value.length === 0) {
            field.attrs.value = arrayOrderedValues(field)
          }
          break loop
      }
    }
  }

  if (!field.attrs.type) {
    field.isArrayField = true
    field.attrs.type = schema.items && NUMBER_TYPES.includes(schema.items.type)
      ? schema.items.type
      : 'text'
  } else if (field.attrs.type === 'select') {
    field.attrs.multiple = field.schemaType === 'array'
    field.attrs.value = field.attrs.value || field.attrs.multiple ? [] : ''

    if (field.attrs.value === void (0) || field.attrs.value.length === 0) {
      if (field.attrs.multiple) {
        field.isArrayField = true
        field.attrs.value = arrayUnorderedValues(field)
      } else {
        field.attrs.value = singleValue(field)
      }
    }
  } else if (!NOT_ARRAY.includes(field.attrs.type)) {
    field.isArrayField = true
  }

  return field
}
