import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('./ts-resolver.mjs', {
  parentURL: import.meta.url,
})
