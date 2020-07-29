var express = require("./node_modules/express");
var app = express();
var http = require('http').Server(app)
var io = require('./node_modules/socket.io')(http);

http.listen(3000,"127.0.0.1");

var clients = []

io.on("connection", socket => {
    console.log('connected....');
    socket.on('setUsername', (data) => {
        if(data) {
            clients.push(data);
            console.log(clients.indexOf(data), clients);
            socket.emit('callPeer', {username: data});
            try {
                // let index = clients.indexOf(data);
                // if(index >= 0) {
                // }else {
                //     socket.emit('userExists', data + ' username is taken! Try some other username.');
                // }
            } catch (err) {
                socket.emit('user_error', err)
            }
        }
    })
    socket.on('msg', function(data) {
        io.sockets.emit('newmsg', data);
    })
    socket.on("NewClient", () => {
        console.log('new client')
        if (clients < 2) {
            if (clients == 1) {
                socket.emit('CreatePeer')
            }
        }
        else
            socket.emit('SessionActive')
        clients++;
    })
    
    socket.on('Offer', (offer)=>{
        console.log('front offer')
        socket.broadcast.emit("BackOffer", offer)
    })
    socket.on('Answer', (data)=>{
        console.log('answer')
        socket.broadcast.emit('BackAnswer', data)
    })
    socket.on('disconnect', ()=>{
        console.log('disconneting')
        if (clients.length > 0) {
            if (clients.length <= 2)
                socket.broadcast.emit("Disconnect")
            clients.slice(clients.length-1, 1);
        }
    })
})