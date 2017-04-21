'use strict'

const util = require('util')

function BadRequest(message) {
  Error.captureStackTrace(this, this.constructor)

  this.name = this.constructor.name
  this.message = message
}

util.inherits(BadRequest, Error)

module.exports = BadRequest