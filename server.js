var CONFIG      = require( "./config.js" );

var log4js         = require( "log4js" );
var log            = log4js.getLogger( "server" );

var routers        = require( "./routers" );
var models         = require( "./models/models.js" );

var async          = require( "async" );
var bodyParser     = require( 'body-parser' );
var compress       = require( "compression" );
var consolidate    = require( "consolidate" );
var express        = require( "express" );
var favicon        = require( 'serve-favicon' );
var http           = require( "http" );
var methodOverride = require( "method-override" );
var mongoose       = require( 'mongoose' );
var utils          = require("./utils.js");

var app            = express();
var io             = null;
var httpServer     = null;

app.set( "views", __dirname + "/views");

app.engine( "ejs", consolidate.ejs );
app.engine( "jade", consolidate.jade );

app.use( favicon( __dirname + '/z_build/favicon.ico') );
app.use( compress() );
app.use( bodyParser.json() );
app.use( bodyParser.urlencoded( {
	extended: true,
	limit: 1024 * 1024 * 1          // limit request to 1MB
}));
app.use( methodOverride() );
app.use( express.static( __dirname + "/z_build" ) );





// ========================================================================
// D E F I N E   P A T H S
// ========================================================================
app.get( "/", function( req, res ) { res.render("index.jade"); } );
app.get( '/enter/:room_id/:token', routers.index.visitRoom );
app.post( '/join', routers.index.joinRoom );



// ========================================================================
// L A U N C H   S E R V E R
// ========================================================================
function task_ConnectToDB( callback ) {
	
	// supply your own mongodb connection url
	// format: mongodb://<user>:<password>@<host>:<port>/<database_name>
    var db = mongoose.connect( CONFIG.connect_url );
    db.connection.on( "open", function() {
    	log.debug( "Database connection established" );
    	callback();
    });
    db.connection.on( "error", function(e) {
    	log.error( "db connection error", e );
    });
}


async.parallel( [ task_ConnectToDB ], function() {
	httpServer = http.createServer( app ).listen( process.env.PORT, process.env.IP || "0.0.0.0", function() { 
		log.debug('listening on', process.env.IP, process.env.PORT );
		io = require( 'socket.io' )( httpServer ).of("/gateway");
		io.on('connection', function( socket ) {
			
			socket.on( "join", function( params ) {
				var user_ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
				var user_name = params.user_name;
				
				log.trace("joining room", params.token, socket.id, params.room_id, params.user_name );
				
				utils.checkRights( params.room_id, params.token, user_ip ).then( function() {
					utils.extendTokenTime( params.token, user_name, socket.id );
					socket.join( params.room_id );
					socket.emit( "notification", { message: "you have entered room " + params.room_id } );
					socket.emit( "room connect", {} );
					socket.broadcast.to( params.room_id ).emit( "notification", { user: user_name, message: "is joining the room." } );
					
				},
				function() {
					socket.emit( "denied", {} );
				});
			});
			
			
			socket.on( "message", function( data ) {
				var rooms = socket.rooms;
				log.debug( "message:", socket.id, rooms[1], data );
				var message = { 
					user: data.user, 
					message: data.message, 
					color: data.color 
				};
				socket.broadcast.to( rooms[ 1 ] ).emit( "message", message );
				
				var msg = new models.messages( {
					room_id: rooms[ 1 ],
					message: data.message,
					user: data.user,
					color: data.color
				});
				msg.save();
				utils.extendTokenTime( data.token, data.user, socket.id );
			});
			
			
			socket.on( "history", function() {
				var room_id = socket.rooms[ 1 ] || false;
				log.debug( "getting history for room", room_id );
				if( !room_id ) 
					socket.emit( "history", { messages: null } );
				else {
					models.messages.find( { room_id: room_id } ).sort("-_id").limit( 30 ).exec( function( e, messages ) {
						messages = messages.sort( function( a, b ) {
							if( a._id > b._id ) return 1;
							else if( a._id < b._id ) return -1;
							else return 0;
						});
						socket.emit( "history", { messages: messages } );	
					});
				}
			});
			
			
			socket.on( "change color", function(data) {
				log.debug( "new color request", data, socket.id );
				var rooms = socket.rooms;
				var message = { 
					user: data.user,
					message: " changed his/her chat color.", 
					color: data.color 
				};
				socket.broadcast.to( rooms[ 1 ] ).emit( "notification", message );
				socket.emit( "notification", message );
			});
			
			
			socket.on( "disconnect", function( data ) {
				models.tokens.findOne( { socket_id: socket.id } ).exec( function( e, data ) {
					log.debug( "socket disconnected", data.socket_id, data.user_name, "from room", data.room_id );
					if( e ) {
						log.error( e );
						return;
					}
					if( data )
						socket.broadcast.to( data.room_id ).emit( "notification", { user: data.user_name, message: " has left this room."} );
				});
			});
		}); 
	});
});
