var mongoose = require( 'mongoose' );
var moment   = require( "moment" );


exports.rooms = mongoose.model( "room", {
    name: String,
    password: String,
});

exports.messages = mongoose.model( "message", {
    room_id: String,
    timestamp: { type: Date, default: moment().toDate() },
    message: String,
    user: String,
    color: Number
});

exports.tokens = mongoose.model( "tokens", {
    room_id: String,
    client_ip: String,
    token: String,
    expires_at: { type: Date, default: moment().add( 6, "hours" ).toDate() },
    user_name: String,
    socket_id: String
});