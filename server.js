'use strict'

const querystring = require('querystring')
const async = require('async')

const utils = require('./lib/utils')
const Cookie = require('./lib/cookie')

function Server(dhke, opts) {
  if (!(this instanceof Server)) {
    return new Server(dhke, opts)
  }

  this.dhke = dhke
  this.cookie = Cookie(this.dhke.crypter, opts.domain, opts.cookie)

  this.strategies = {}
  this.apps = {}

  this.serializer = () => {
    throw new Error('serializeUser not defined')
  }
  this.deserializer = () => {
    throw new Error('deserializeUser not defined')
  }
  this.authorizator = (user, app, done) => {
    done(null, user)
  }
}

Server.prototype.authenticate = function() {
  return (req, res, next) => {
    this.cookie.initializeRequest(req, res)

    const query = req.query || {}
    let app_name = null

    if (!query.app) {
      return res.redirect('back')
    }

    if (!(app_name = this.decodeApp(query.app))) {
      return res.status(500).end()
    }

    this
    .getLoggedUser()
    .then((user) => {
      return utils.promisify((resolve, reject) => {
        this.authorizator.call(this, user, app_name, (err, user) => {
          if (err) {
            return reject(err)
          }

          if (!user) {
            return reject(null)
          }

          resolve(user)
        })
      })
    })
    .then((user) => {
      this.send(res, {
        app: app_name,
        user: user,
        params: query
      })
    })
    .catch((err) => {
      next(err)
    })
  }
}

Server.prototype.logIn = function(strategy, opts) {
  opts = opts || {}

  return (req, res, next) => {
    this.cookie.initializeRequest(req, res)

    const body = req.body || {}
    let app_name = null

    if (!(app_name = this.decodeApp(body.app))) {
      return res.status(500).end()
    }

    if (!(strategy = this.strategies[strategy])) {
      return res.status(500).end()
    }

    utils.promisify((resolve, reject) => {
      strategy.call(this, body[opts.usernameField || 'username'], body[opts.passwordField || 'password'], (err, user) => {
        if (err) {
          return reject(err)
        }

        if (!user) {
          return reject(null)
        }

        resolve(user)
      })
    })
    .then((user) => {
      return utils.promisify((resolve, reject) => {
        this.serializer.call(this, user, (err, serialized) => {
          if (err) {
            return reject(err)
          }

          if (!serialized) {
            return reject(null)
          }

          resolve([user, serialized])
        })
      })
    })
    .then(([user, serialized]) => {
      return utils.promisify((resolve, reject) => {
        this.authorizator.call(this, user, app_name, (err, user) => {
          if (err) {
            return reject(err)
          }

          if (!user) {
            return reject(null)
          }

          this.cookie.set(serialized)

          resolve(user)
        })
      })
    })
    .then((user) => {
      this.send(res, {
        app: app_name,
        user: user,
        params: body
      })
    })
    .catch((err) => {
      next(err)
    })
  }
}

Server.prototype.logOut = function(redirect) {
  return (req, res, next) => {
    this.cookie.initializeRequest(req, res)

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

Server.prototype.getLoggedUser = function() {
  return new Promise(
    (resolve, reject) => {
      const cookie_value = this.cookie.get()

      if (!cookie_value) {
        return reject(null)
      }

      this.deserializer.call(this, cookie_value, (err, user) => {
        if (err) {
          return reject(err)
        }

        if (!user) {
          return reject(null)
        }

        resolve(user)
      })
    }
  )
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
  const app = utils.decryptApp(coded_app)

  return this.apps.hasOwnProperty(app) ? app : null
}

module.exports = Server