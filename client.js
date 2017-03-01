'use strict'

const http = require('http')
const url = require('url')
const btoa = require('btoa')
const querystring = require('querystring')

function Client(app, opts, dhke) {
  if (!(this instanceof Client)) {
    return new Client(app, opts, dhke)
  }

  this.app = app
  this.verify = opts.verify
  this.server = opts.server
  this.dhke = dhke
}

Client.prototype.redirectLogIn = function(res) {
  this
  .dhke
  .initalizeSession(this.server.name, (secret) => {
    const query = {
      app: btoa(this.app),
      verify: this.verify
    }

    res.redirect(url.format({
      protocol: this.server.protocol || 'http:',
      hostname: this.server.host,
      port: this.server.port || 80,
      pathname: this.server.auth_path,
      search: querystring.stringify(query)
    }))
  })
}

Client.prototype.landing = function() {
  return (req, res, next) => {
    const query = req.query || {}

    req.user = null

    if (!query.user) {
      return next()
    }

    if (this.verify && query.verify != this.verify) {
      return next()
    }

    req.user = this.dhke.decrypt(this.server.name, query.user)

    next()
  }
}

module.exports = Client