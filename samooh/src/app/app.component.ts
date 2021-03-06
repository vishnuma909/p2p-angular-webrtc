import { Component, OnInit, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';
import * as io from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSidenav } from '@angular/material/sidenav';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit {
  showVideo: any = false;
  username: any = ''
  userinput: any = ""
  client: any = {}
  initvidref: any = {muted: false, isplay: true} ;
  peervidref: any = {muted: false, isplay: true} ;
  socket: any;
  msgs: any = []
  peerVideo: any = false;
  peer: any = {}
  window: any = window;
  isSet: any = false;
  isOpen: any = true;
  @ViewChild('userVid') userVid: ElementRef;
  @ViewChild('peerVid') peerVid: ElementRef;
  @ViewChild('sideNav') sideNav: MatSidenav;
  vidstart: any = false;
  videoObj: any = { video: true, audio: true }
  stream: any;
  constructor(private snackbar: MatSnackBar) {
    this.socket = io("http://localhost:3000");
  }
  ngOnInit() {
    if(window.innerWidth <= 770) {
      this.isOpen = false;
    }
    this.setSocket(this.socket)
  }

  opencloseMsg() {
    this.isOpen = !this.isOpen;
  }

  startVideo() {
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    }).then((stream)=>
    {
      this.stream = stream;
      this.vidstart = true;
      this.initvidref = this.userVid.nativeElement;
      this.peervidref = this.peerVid.nativeElement;
      var uservid: any = this.initvidref;
      if('srcObject' in uservid) {
        uservid['srcObject'] = stream;
      }else {
        uservid['src'] = window.URL.createObjectURL(stream);
      }
      uservid.play();
      this.initvidref.isplay = true;
    }).catch((error) => {console.log(error)})
  }

  muteVideo() {
    this.initvidref.muted = !this.initvidref.muted;
  }

  mutePeerVideo() {
    this.peervidref.muted = !this.peervidref.muted;
  }

  playpause(type) {
    if(type == 'user') {
      if(!this.initvidref.isplay) {
        this.initvidref.play()
        this.initvidref.isplay = true
      }else {
        this.initvidref.pause()
        this.initvidref.isplay = false
      }
    }else {
      if(!this.peervidref.isplay) {
        this.peervidref.play()
        this.peervidref.isplay = true
      }else {
        this.peervidref.pause()
        this.peervidref.isplay = false
      }
    }
  }

  checkIfMe(value) {
    if(value) {
      if(value == this.username) {
        return 'you';
      }else {
        return value;
      }
    }
  }

  setname() {
    if(this.username != '') {
      this.socket.emit('setUsername', this.username)
    }
  }

  addStreamToPeer(stream) {
    this.peer.addStream(stream);
  }

  setSocket(socket) {
    socket.on('userExists', (data) => {
      new Error(data)
    });
    socket.on('exceeded',(data)=> {this.showExceeded(data)})
    socket.on('callPeer', (data) => {
      console.log('userset', 'success', data)
      this.isSet = true;
      this.startVideo();
      //this._makePeer();
    });
    socket.on('newmsg', (data) => {
      if(data) {
        console.log(data)
        this.msgs.push({user: data.user, message: data.message})  
      }
    })
    socket.on('user_error', (data) => {
      document.write(JSON.stringify(data));
    })
    socket.on('BackOffer', (offer) => {this._frontAnswer(offer)})
    socket.on('BackAnswer', (answer) => {this._signalAnswer(answer)})
    socket.on('Disconnect', () => {this._removePeer()})
  }

  showExceeded(data) {
    if(data) {
      this.snackbar.open(data+'🍕','close',{duration: 5000})
    }
  }

  checkEnter(e) {
    if(e) {
      if(e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        this.send()
      }
    }
  }

  send() {
    if(this.userinput != '') {
      let obj = {message: this.userinput, user: this.username}
      this.socket.emit('msg', obj);
      this.userinput = ''
    }
  }

  initialisePeer(type) {
    try {
      var peer = new SimplePeer({initiator: (type == 'init') ? true : false, trickle: false, stream: this.stream})
      peer.on('stream', (stream) => {
        console.log('signaling','peervid:'+JSON.stringify(stream))
        this.addStreamToPeerVideo(stream)
      })
      return peer;
    } catch (err) {
      console.log(err)
    }
  }

  //adds video stream of callee to video tag
  addStreamToPeerVideo(stream) {
    if(stream) {
      try{
        this.peervidref.srcObject = stream
      }catch(err) {
        this.peervidref.src = window.URL.createObjectURL(stream)
      }
      this.peerVideo = true;
      this.peervidref.play();
      this.peervidref.isplay = true;
    }
  }

  _makePeer() {
    this.client.gotAnswer = false;
    let peer = this.initialisePeer('init')
    this.peer = peer;
    this.startVideo();
    peer.on('signal', (data) => {
      console.log('init signaling','makepeer:'+data,'client'+ this.client)
      if (!this.client.gotAnswer) {
        this.socket.emit('Offer', data)
      }
    })
    this.client.peer = peer
  }

  _frontAnswer(offer) {
    console.log('backoffer')
    let peer = this.initialisePeer('notInit')
    this.peer = peer;
    peer.on('signal', (data) => {
      console.log('not init signaling','data:'+data)
      this.socket.emit('Answer', data)
    })
    peer.signal(offer)
    this.client.peer = peer;
  }

  _signalAnswer(answer) {
    this.client.gotAnswer = true
    let peer = this.client.peer
    peer.signal(answer)
  }

  _removePeer() {
    this.vidstart = false;
    if (this.client.peer) {
      this.peer.destroy()
      this.client.peer.destroy()
    }
  }
}
