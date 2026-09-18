#!/usr/bin/env node
const fs = require('fs')
const https = require('https')
const order = require('./order')

const licenses = []
const deprecated_licenses = []
const exceptions = []
const deprecated_exceptions = []

https.request('https://spdx.org/licenses/exceptions.json', function (response) {
  if (response.statusCode !== 200) {
    console.error('spdx.org responded ' + response.statusCode)
    process.exit(1)
  }
  const chunks = []
  response
    .on('data', function (chunk) {
      chunks.push(chunk)
    })
    .once('end', function () {
      const buffer = Buffer.concat(chunks)
      const parsed = JSON.parse(buffer)

      parsed.exceptions.forEach(object => {
        const id = object.licenseExceptionId
        if (object.isDeprecatedLicenseId) {
          deprecated_exceptions.push(id)
        } else {
          exceptions.push(id)
        }
      })
    })
  })
.end()

https.request('https://spdx.org/licenses/licenses.json', function (response) {
  if (response.statusCode !== 200) {
    console.error('spdx.org responded ' + response.statusCode)
    process.exit(1)
  }
  const chunks = []
  response
    .on('data', function (chunk) {
      chunks.push(chunk)
    })
    .once('end', function () {
      const buffer = Buffer.concat(chunks)
      const parsed = JSON.parse(buffer)

      parsed.licenses.forEach(object => {
        const id = object.licenseId
        if (object.isDeprecatedLicenseId) {
          deprecated_licenses.push(id)
        } else {
          licenses.push(id)
        }
      })
    })
}).end()

https.request('https://scancode-licensedb.aboutcode.org/index.json', function (response) {
  if (response.statusCode !== 200) {
    console.error('aboutcode.org responded ' + response.statusCode)
    process.exit(1)
  }
  const chunks = []
  response
    .on('data', function (chunk) {
      chunks.push(chunk)
    })
    .once('end', function () {
      const buffer = Buffer.concat(chunks)
      const parsed = JSON.parse(buffer)
      parsed.forEach(object => {
        const id = object.spdx_license_key
        if (object.is_exception) {
          if (object.is_deprecated) {
            deprecated_exceptions.push(object.license_key)
          } else {
            exceptions.push(id)
          }
        } else {
          if (!object.is_exception) {
            if (object.is_deprecated) {
              deprecated_licenses.push(object.license_key)
            } else {
              licenses.push(id)
            }
          }
        }
      })

      const deduplicated_licenses = Array.from(new Set(licenses.map(item => JSON.stringify(item)))).map(item => JSON.parse(item));
      const deduplicated_deprecated_licenses = Array.from(new Set(deprecated_licenses.map(item => JSON.stringify(item)))).map(item => JSON.parse(item));
      const deduplicated_exceptions = Array.from(new Set(exceptions.map(item => JSON.stringify(item)))).map(item => JSON.parse(item));
      const deduplicated_deprecated_exceptions = Array.from(new Set(deprecated_exceptions.map(item => JSON.stringify(item)))).map(item => JSON.parse(item));

      write('licenses-index', deduplicated_licenses)
      write('licenses-deprecated', deduplicated_deprecated_licenses)
      write('exceptions-index', deduplicated_exceptions)
      write('exceptions-deprecated', deduplicated_deprecated_exceptions)
    })
}).end()

function write (file, list) {
  fs.writeFileSync(
    file + '.json',
    JSON.stringify(list.sort(order), null, 2) + '\n'
  )
}
