'use strict';

var faye = require('faye'),
    config = require('./config'),
    frame = require('./frame'),
    user = require('./user'),
    debug = require('debug')('openframe:pubsub'),
    ps = module.exports = {};

ps.client = {};

ps.init = function(fc) {
    var network = config.ofrc.network,
        pubsub_url = network.pubsub_protocol + '://' + network.pubsub_domain + ':' + network.pubsub_port,
        clientAuth = {
            outgoing: function(message, callback) {
                // leave non-subscribe messages alone
                if (message.channel !== '/meta/subscribe') {
                    return callback(message);
                }

                // Add ext field if it's not present
                if (!message.ext) {
                    message.ext = {};
                }

                // Set the auth token
                message.ext.accessToken = user.state.access_token;

                // Carry on and send the message to the server
                callback(message);
            }
        };

    // add a pubsub client for the API server
    ps.client = new faye.Client(pubsub_url + '/faye');
    ps.client.addExtension(clientAuth);
    // handlers for pubsub connection events
    ps.client.on('transport:down', function() {
        // the pubsub client is offline
        debug('pubsub client dsconnected');
    });

    ps.client.on('transport:up', function() {
        // the pubsub client is online
        debug('pubsub client connected');
        ps.client.publish('/frame/connected', frame.state.id);
    });

    ps.client.subscribe('/frame/' + frame.state.id + '/updated', function(data) {
        debug('/frame/' + frame.state.id + '/updated');

        // frame updated event handled, hand off frame updating logic to frame controller
        fc.updateFrame();
    });

    return ps.client;
};
