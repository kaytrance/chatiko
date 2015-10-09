var app = angular.module( "myApp", [] )

app
.controller( "roomCtrl", [ "$scope", "$http", function( $scope, $http ) {

    $scope.socket = io( "/gateway" );
    $scope.socket.nickname = "tetsss";
    
    var room_id = window.location.href.split("/")[4];
    var token = window.location.href.split("/")[5];
    var myname = $( "#user" ).text();
    var mycolor = parseInt( Math.random() * 250 );
    $scope.messages = [];
    var timerId = null;
    var new_title = "****";
    $scope.canChat = false;
    
    $scope.socket.emit( "join", { room_id: room_id, token: token, user_name: myname } );
    $scope.socket.emit( "history" );
    
    $scope.socket.on( "history", function( data ) {
        if( data.messages === null )
            setTimeout( function() { $scope.socket.emit( "history" ); }, 3000 );
        else {
            $scope.messages = data.messages.concat( $scope.messages );
            $scope.$apply();
            scrollWindow();
        }
    });
    
    $scope.socket.on( "message", function( msg ) {
        console.log( "mesage received", msg );
        $scope.messages.push( makeMsg( msg ) );
        startNotify();
        $scope.$apply();
        scrollWindow();
    });
    
    $scope.socket.on( "notification", function( msg ) {
        console.log("notification received", msg );
        showNotification( msg.user, msg.message );
        $scope.$apply();
        scrollWindow();
    });
    
    $scope.socket.on( "disconnect", function( msg ) {
        console.log( "disconnected" );
        showNotification( "", "disconnected from room :(" );
        stopNotify();
        $scope.canChat = false;
        $scope.$apply();
        scrollWindow();
    });
    
    $scope.socket.on( "reconnect_attempt", function( num ) {
        console.log( "reconnect_attempt",num );
        showNotification( "", "attempting to reconnect.." );
        $scope.canChat = false;
        $scope.$apply();
        scrollWindow();
    });
    
    $scope.socket.on( "reconnect_failed", function() {
        console.log( "reconnect_failed" );
        showNotification( "", "failed to reconnect. Please refresh the page!" );
        $scope.canChat = false;
        $scope.$apply();
        scrollWindow();
    });
    
    $scope.socket.on( "reconnect", function() {
        var room_id = window.location.href.split("/")[4];
        console.log( "reconnect at", room_id );
        showNotification( "", "YES! Successfully reconnected!" );
        $scope.socket.emit( "join", { room_id: room_id, token: token, user_name: myname } );
        $scope.canChat = true;
        $scope.$apply();
        scrollWindow();
    });
    
    $scope.socket.on( "connect", function() {
        console.log( "room connected" );
        $scope.canChat = true;
    });
    
    function scrollWindow() {
        $("#chat").animate( { scrollTop: $("#chat ul").height() }, "slow");
    }
    
    $scope.sendMessage = function( event ) {
        if( event.keyCode === 13 ) {
            if( $scope.mymessage.toLowerCase() === "/color" ) {
                $scope.mymessage = "";
                event.preventDefault();
                mycolor = parseInt( Math.random() * 250, 10 );
                $scope.socket.emit( "change color", { user: myname, color: mycolor } );
                scrollWindow();
            }
            else if( $scope.mymessage.toLowerCase() === "/clear" ) {
                $scope.messages = [];
                $scope.mymessage = "";
                event.preventDefault();
                scrollWindow();
            }
            else {
                $scope.socket.emit( "message", { message: $scope.mymessage, user: myname, color: mycolor, token: token } );
                $scope.messages.push( makeMsg( $scope.mymessage ) );
                $scope.mymessage = "";
                event.preventDefault();
                scrollWindow();
            }
        }
    }; 
    
    function showNotification( user, msg ) {
        var notification = {
            user: user,
            isOut: false,
            tick: "",
            time: getTime(),
            color: null,
            message: msg,
            isMessage: false
        };
        $scope.messages.push( notification );
        startNotify();
    }    
    
    function startNotify() {
        if( !document.hasFocus() ) {
            clearInterval( timerId );
            timerId = setInterval( function() { cycleTitle(); }, 1000 );
        }
    }
    
    function stopNotify() {
        clearInterval( timerId );
        document.title = 'joined room "' + room_id +'"';
    }
    
    function cycleTitle() {
        if( document.title !== new_title ) document.title = new_title;
        else document.title = 'joined room "' + room_id +'"';
        if( document.hasFocus() ) stopNotify();
    }
    
    function makeMsg( message, isOut ) {
        var isOut = typeof message === "object" ? 0 : 1;
        var tick = isOut ? " << " : " >> "; 
        var incoming = {
            user: message.user,
            isOut: isOut,
            tick: tick,
            time: getTime(),
            color: message.color,
            message: message.message,
            isMessage: true
        };
        
        var outgoing = {
            user: myname,
            isOut: isOut,
            tick: tick,
            time: getTime(),
            color: mycolor,
            message: $scope.mymessage,
            isMessage: true
        };
        
        return isOut ? outgoing : incoming;
    }
    
    function getColor( color ) {
        return "hsl(" + color + ",67%,61%)";
    }
    
    $scope.getStyle = function( color ) {
        if( color !== null )
            return { "border-left": "5px solid " + getColor( color ) };
        else return {};
        
    };
    
    function getTime() {
       var d = new Date();
       var hours = d.getHours();
       var minutes = d.getMinutes();
       hours = hours < 10 ? "0" + hours : hours;
       minutes = minutes < 10 ? "0" + minutes : minutes;
       return "[" + hours + ":" + minutes + "]"; 
        
    }
    
    $( window ).resize( function() {
        scrollWindow();  
    });  
}]);