'use strict'

const Dh = require('diffie-hellman-key-exchange')

const Server = require('./server')
const Client = require('./client')

module.exports = function(app, dh_opts) {
	const dhke = Dh(app, dh_opts)

	return {
		server: function(opts) {
			return new Server(dhke, opts)
		},
		client: function(opts) {
			dhke.addApp(opts.server.name, {
				host: opts.server.host,
				port: opts.server.dh_port
			})

			return new Client(app, opts, dhke)
		}
	}
}