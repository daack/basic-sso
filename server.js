'use strict'

const atob = require('atob')
const querystring = require('querystring')
const async = require('async')

const Cookie = require('./lib/cookie')

function Server(dhke, opts) {
  if (!(this instanceof Server)) {
    return new Server(dhke, opts)
  }

  this.dhke = dhke
  this.cookie = Cookie(this.dhke.crypter, opts.cookie)

  this.strategies = {}
  this.apps = {}

  this.serializer = () => { throw new Error('serializeUser not defined') }
  this.deserializer = () => { throw new Error('deserializeUser not defined') }
  this.authorizator = (user, app, done) => {
    done(null, user)
  }
}

Server.prototype.authenticate = function() {
  return [
    (req, res, next) => {
      this.cookie.initializeRequest(req, res)

      req.sso = {}

      const query = req.query || {}

      if (!query.app) {
        return res.redirect('back')
      }

      if (!(req.sso.app_name = this.decodeApp(query.app))) {
        return res.status(500).end()
      }

      next()
    },
    (req, res, next) => {
      this.getLoggedUser((err, user) => {
        req.sso.user = user

        next()
      })
    },
    (req, res, next) => {
      if (!req.sso.user) {
        return next()
      }

      this.authorizator.call(this, req.sso.user, req.sso.app_name, (err, user) => {
        if (err || !user) return next()

        this.send(res, {
          app: req.sso.app_name,
          user: req.sso.user,
          params: req.query || {}
        })
      })
    }
  ]
}

Server.prototype.logIn = function(strategy, opts) {
  opts = opts || {}

  return [
    (req, res, next) => {
      this.cookie.initializeRequest(req, res)

      req.sso = {}

      const body = req.body || {}

      if (!(req.sso.app_name = this.decodeApp(body.app))) {
        return res.status(500).end()
      }

      req.sso.credentials = {
        user: body[opts.usernameField || 'username'],
        password: body[opts.passwordField || 'password']
      }

      next()
    },
    (req, res, next) => {
      const credentials = req.sso.credentials

      this.strategies[strategy].call(this, credentials.user, credentials.password, (err, user) => {
        if (err || !user) return res.redirect('back')

        req.sso.user = user

        next()
      })
    },
    (req, res, next) => {
      this.serializer.call(this, req.sso.user, (err, serialized) => {
        if (err || !serialized) return res.status(500).end()

        req.sso.serialized_user = serialized

        next()
      })
    },
    (req, res, next) => {
      this.authorizator.call(this, req.sso.user, req.sso.app_name, (err, user) => {
        if (err || !user) return res.status(500).end()

        this.cookie.set(req.sso.serialized_user)

        this.send(res, {
          app: req.sso.app_name,
          user: user,
          params: req.body || {}
        })
      })
    }
  ]
}

Server.prototype.logOut = function(redirect) {
  return (req, res, next) => {
    this.cookie.delete()

    if (redirect) {
      return res.redirect(redirect)
    }

    next()
  }
}

Server.prototype.addApp = function(app, info) {
  if (typeof app != 'object') {
    let tmp = {}
    tmp[app] = info
    app = tmp
  }

  for (var app_name in app) {
    let info = app[app_name]

    if (typeof info != 'object' || !info.redirect) {
      throw new Error('Configuration missing for app: ' + app_name)
    }

    this.apps[app_name] = info
  }

  return this
}

Server.prototype.strategy = function(strategy, cb) {
  this.strategies[strategy] = cb

  return this
}

Server.prototype.authorizeUser = function(cb) {
  this.authorizator = cb

  return this
}

Server.prototype.serializeUser = function(cb) {
  this.serializer = cb

  return this
}

Server.prototype.deserializeUser = function(cb) {
  this.deserializer = cb

  return this
}

Server.prototype.getLoggedUser = function(cb) {
  const cookie_value = this.cookie.get()

  if (!cookie_value) {
    return cb(null, null);
  }

  try {
    this.deserializer.call(this, cookie_value, cb)
  } catch(err) {
    cb(err)
  }
}

Server.prototype.send = function(res, opts) {
  const info = this.apps[opts.app]

  if (!info) {
    return res.status(500).end()
  }

  const query = {
    verify: opts.params.verify || '',
    user: this.dhke.encrypt(opts.app, JSON.stringify(opts.user))
  }

  res.redirect(info.redirect + '?' + querystring.stringify(query))
}

Server.prototype.decodeApp = function(coded_app) {
  const app = atob(decodeURIComponent(coded_app))

  return this.apps.hasOwnProperty(app) ? app : null
}

module.exports = Server