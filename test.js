'use strict'

const http = require('http')

const app = require('express')()
const bodyParser = require('body-parser')

const Sso = require('./sso')

// server

const sso_s = Sso('server', {
	prime: '9e739ed6d0d63db1c7246b1afc10d5c5f8e85c70f569642d9f7c7d2c5f9080f3',
	listen: 8001
})

const server = sso_s.server({
	cookie: {
		secret: 'password',
		name: 'mase_test',
		keylist: ['foo', 'bar']
	}
})

const sso_c = Sso('client', {
	prime: '9e739ed6d0d63db1c7246b1afc10d5c5f8e85c70f569642d9f7c7d2c5f9080f3',
	listen: 8002
})

const client = sso_c.client({
	verify: 'verify',
	server: {
		name: 'server',
		host: '127.0.0.1',
		port: 3000,
		dh_port: 8001,
		auth_path: '/auth'
	}
})

// middleware
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

/**
 * SERVER
 */

server.addApp('client', {
	redirect: 'http://127.0.0.1:3000/landing'
})

server.strategy('strategy', (user, password, done) => {
	done(null, {
		username: 'daack'
	})
})

server.authorizeUser((user, app, done) => {
	done(null, {
		username: 'daack',
		app: app
	})
})

server.serializeUser((user, done) => {
	done(null, JSON.stringify(user))
})

server.deserializeUser((user, done) => {
	done(null, JSON.parse(user))
})

app.get('/auth', server.authenticate(), (req, res, next) => {
	res.send('<form method="POST" action="/login"><input type="hidden" name="app" value="' + req.query.app + '"><input type="hidden" name="verify" value="' + req.query.verify + '"><input type="submit"></form></form>')
})
app.post('/login', server.logIn('strategy'))

/**
 * CLIENT
 */

app.get('/client_login', (req, res) => {
	client.redirectLogIn(res)
})

app.get('/landing', client.landing(), (req, res) => {
	res.end(req.user)
})

// catch 404 and forward to error handler
app.use((req, res, next) => {
	var err = new Error('Not Found')
	err.status = 404
	next(err)
})

// error handler
app.use(function(err, req, res, next) {
	throw err
	res.status(err.status || 500).json({
		message: err.message
	})
})

const http_server = http.createServer(app)

http_server.listen(3000)

http_server.on('listening', () => {
	const addr = http_server.address()
	const bind = typeof addr === 'string'
	? 'pipe ' + addr
	: 'port ' + addr.port

	console.log('Listening on ' + bind);
})