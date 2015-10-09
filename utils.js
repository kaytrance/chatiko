var log4js = require( "log4js" );
var log    = log4js.getLogger( "utils" );
var models = require( "./models/models.js" );
var moment = require( "moment" );


exports.checkRights = function( room_id, token, ip ) {
	return new Promise( function( resolve, reject ) {
		log.debug( "check: checking rights for token", token, "room", room_id, "(" + ip + ")" );
		models.tokens.findOne( { token: token, client_ip: ip, room_id: room_id } ).exec( function( e, token ) {
			if( token ) {
                var now = new Date().valueOf();
                var expires = moment( token.expires_at ).valueOf();
                log.trace( "..token located, checking expiration" );
                if( now < expires ) {
                	log.trace( "..token still valid, granting access.." );
					resolve( token.user_name );
                }
				else {
					log.trace( "..token expired", now, expires );
					reject();
				}
			}
			else {
                log.trace("check: no token found, exiting..");
				reject();
			}
		});
	});
};

exports.extendTokenTime = function( token, name, socket_id ) {
	return new Promise( function( resolve, reject ) {
		log.debug( "extending token time", token, name, socket_id );
		models.tokens.findOne( { token: token } ).exec( function( e, token ) {
			if( token ) {
				var date_diff = moment( token.expires_at).diff( moment(), "minutes" );
				if(  date_diff <= 30 && date_diff > 0 ) {
					log.trace( "extended for 3 hours" );
            		token.expires_at = moment( token.expires_at ).add( 3, "hours" ).toDate();
				}
				token.user_name = name;
				token.socket_id = socket_id;
				token.save( function(){} );
				resolve();
			}
			else {
				reject();
			}
		});
	});
};