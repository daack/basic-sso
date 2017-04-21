'use strict'

const util = require('util')

function Unauthorized(message) {
  Error.captureStackTrace(this, this.constructor)

  this.name = this.constructor.name
  this.message = message
}

util.inherits(Unauthorized, Error)

module.exports = Unauthorized