'use strict'

const crypto = require('crypto')

function Crypter(secret) {
  if (!(this instanceof Crypter)) {
    return new Crypter(secret)
  }

  this.secret = secret
  this.algorithm = 'aes-256-ctr'
  this.dh = crypto.createDiffieHellman(Buffer.from(this.secret, 'hex'))

  this.dh.generateKeys()
}

Crypter.prototype.encrypt = function(text, public_key) {
  const cipher = crypto.createCipher(this.algorithm, this.getSecret(public_key))

  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
}

Crypter.prototype.decrypt = function(text, public_key) {
  const decipher = crypto.createDecipher(this.algorithm, this.getSecret(public_key))

  return decipher.update(text, 'hex', 'utf8') + decipher.final('utf8')
}

Crypter.prototype.getSecret = function(public_key) {
  if (public_key) {
    return this.dh.computeSecret(public_key, 'hex', 'hex')
  }

  return this.secret
}

Crypter.prototype.getPublicKey = function() {
  return this.dh.getPublicKey('hex')
}

module.exports = Crypter