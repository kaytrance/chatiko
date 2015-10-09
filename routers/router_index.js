var CONFIG   = require( "./../config.js" );
var log4js   = require( "log4js" );
var log      = log4js.getLogger( "router|index" );
var crypto   = require( "crypto" );
var models   = require( "./../models/models.js" );
var utils    = require("./../utils.js");



// redirect, enter chat room
exports.visitRoom = function( req, res ) {
    var room_id = req.params.room_id.toLowerCase();
    var token = req.params.token;
    var client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    log.trace( "visitRoom: trying to acceess room", room_id, token, client_ip );
    utils.checkRights( room_id, token, client_ip ).then( 
        function( user_name ) {
            res.render( "enter.jade", { room_id: room_id, token: token, user: user_name } );
        },
        function() {
            res.render( "index.jade", { message: " Token expired, please relogin." });
        }
    );
};


// POST: receives data from login action on frontend
exports.joinRoom = function( req, res ) {
    var room_id = req.body.room_id.toLowerCase();
    var room_password =  crypto.createHash( 'md5' ).update( req.body.room_password + CONFIG.SALT ).digest( 'hex' );
    var client_name = req.body.client_name;
    var client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    log.trace( "room join:", room_id, room_password, client_name );
    var access_token = crypto.createHash( 'md5' ).update( room_id + client_name + new Date().toISOString() + CONFIG.SALT ).digest( 'hex' );
    var token_entry = new models.tokens( {
        room_id: room_id,
        client_ip: client_ip,
        token: access_token,
        user_name: client_name
    });
    
    models.rooms.findOne( { name: room_id } ).exec( function( e, room ) {
        if( room ) {
            log.trace( "room found", room, room.password );
            if( room.password === room_password ) {
                log.trace("passwords match");
                token_entry.save( function( e, saved ) {
                    res.send( { status: 0, message: access_token } );
                });
            }
            else {
                res.send( { status: -1, message: "Invalid" } );
            }
        }
        else {
            // create room
            log.trace( "no room found", room, ". Creating new one" );
            var new_room = new models.rooms( { name: room_id, password: room_password } );
            new_room.save( function( e, saved ) {
                token_entry.save( function( e, saved ) {
                    res.send( { status: 0, message: access_token } );
                });
            });
        }
        
    });
};