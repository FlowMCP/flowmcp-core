import { getSchemas, getAllServerParams } from './helpers/utils2.mjs'
import { FlowMCP, Validation } from './../src/index.mjs'
import path from 'path'


const schemas = getSchemas({ dirPath: './schemas' })
  // .filter((a) => a.path.includes('.mjs'))
  // .filter((a) => !a.path.includes('moralis'))
  // .filter((a) => !a.path.includes('uniswap'))
  // .filter((a) => !a.path.includes('whale'))
  // .filter((a) => a.path.includes('ethereumPrices.mjs'))
  .filter( ( a ) => a.path.includes('erc725/universalProfile.mjs'))

// Globale Server-Parameter laden
const { allServerParams } = await getAllServerParams({
  schemas,
  envPath: `./../../../.env`
})


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))


const padRaw = (str, length) => {
  const safeStr = String(str ?? "")
  return safeStr.length > length
    ? safeStr.slice(0, length - 1) + "…"
    : safeStr.padEnd(length, " ")
}


const colorize = (text, color) => {
  const code = color === "green" ? "\x1b[32m" : "\x1b[31m"
  return `${code}${text}\x1b[0m`
}


for (const _schema of schemas) {
  const { path: schemaPath } = _schema
  const { schema } = await import(schemaPath)

  const validation = Validation.schema({ schema })
  if (!validation) {
    console.warn('⚠️ Schema validation failed.\n')
    continue
  }

  
  const shortPath = schemaPath.split("schemas/")[1] || path.basename(schemaPath)
  console.log(`\n📦 ${shortPath} → ${schema['name']}`)

  const { allServerParams: serverParams } = await getAllServerParams({
    schemas: [_schema],
    envPath: `./../../../.env`
  })

  const tests = FlowMCP.getAllTests({ schema })


  console.log(
    padRaw("Route Name", 26) +
    padRaw("Status", 8) +
    padRaw("Success", 10) +
    padRaw("Message", 25) +
    "Data Preview"
  )
  console.log("-".repeat(100))

 
  for (const test of tests) {
    const { routeName, userParams } = test
    const { status, messages, dataAsString } = await FlowMCP.fetch({
      schema,
      userParams,
      routeName,
      serverParams
    })

    const statusRaw = padRaw(status ? "OK" : "FAIL", 8)
    const statusText = status
      ? colorize(statusRaw, "green")
      : colorize(statusRaw, "red")

    const preview = dataAsString ? dataAsString.substring(0, 40) : "(no data)"
    const message = Array.isArray(messages) && messages.length > 0
      ? messages[0]
      : (typeof messages === 'string' && messages !== '' ? messages : "(empty)")

    console.log(
      padRaw(routeName, 26) +
      statusText +
      padRaw(status.toString(), 10) +
      padRaw(message, 25) +
      preview
    )

    await delay(3000)
  }
}
