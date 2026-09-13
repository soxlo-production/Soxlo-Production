(()=>{
  'use strict';

  // Lower camera load on phones and improve direct WebRTC candidate discovery.
  openMedia=async function(){
    if(localStream)return localStream;
    const video=window.__soxloCallMode==='video'
      ?{facingMode:'user',width:{ideal:640,max:960},height:{ideal:480,max:720},frameRate:{ideal:24,max:30}}
      :false;
    localStream=await navigator.mediaDevices.getUserMedia({
      video,
      audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}
    });
    localVideo.srcObject=localStream;
    if(callOverlay)callOverlay.dataset.mode=window.__soxloCallMode||'video';
    return localStream;
  };

  createPeer=function(){
    signalReady=false;pendingLocalIce=[];pendingRemoteIce=[];
    peer=new RTCPeerConnection({
      iceServers:[
        {urls:['stun:stun.cloudflare.com:3478']},
        {urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}
      ],
      iceCandidatePoolSize:4,
      bundlePolicy:'max-bundle',
      rtcpMuxPolicy:'require'
    });
    localStream.getTracks().forEach(t=>peer.addTrack(t,localStream));
    peer.ontrack=e=>{
      remoteVideo.srcObject=e.streams[0];
      callState.textContent='Secure call connected';
    };
    peer.onicecandidate=e=>{
      if(!e.candidate)return;
      const c=e.candidate.toJSON();
      if(signalReady)sendSignal('ice',c).catch(()=>{});else pendingLocalIce.push(c);
    };
    peer.oniceconnectionstatechange=()=>{
      if(!peer)return;
      const s=peer.iceConnectionState;
      if(s==='checking')callState.textContent='Connecting securely…';
      if(s==='connected'||s==='completed')callState.textContent='Secure call connected';
      if(s==='failed')callState.textContent='Direct connection blocked — TURN relay required';
    };
    peer.onconnectionstatechange=()=>{
      if(!peer)return;
      const s=peer.connectionState;
      if(s==='connected')callState.textContent='Secure call connected';
      else if(s==='failed')callState.textContent='Connection failed — relay may be required';
      else if(s==='disconnected')callState.textContent='Reconnecting…';
      else if(s==='connecting'||s==='new')callState.textContent='Connecting securely…';
      if(s==='closed')endCall(false);
    };
  };

  // Reduce simultaneous REST polling. Calls stay responsive while idle traffic is much lighter.
  let signalTick=0;
  startTimers=function(){
    stopTimers();
    messagePoll=setInterval(()=>{
      if(!session||document.hidden)return;
      if(activeContact)loadMessages(false).catch(()=>{});
      if(typeof pollNewIncoming==='function')pollNewIncoming().catch(()=>{});
    },2200);
    contactPoll=setInterval(()=>{
      if(session&&!document.hidden)loadContacts().catch(()=>{});
    },20000);
    signalPoll=setInterval(()=>{
      if(!session||document.hidden)return;
      signalTick++;
      if(currentCallId&&peer)pollCallSignals().catch(()=>{});
      else if(signalTick%2===0)pollIncomingOffers().catch(()=>{});
    },700);
  };

  // Restart timers immediately if Messenger is already open.
  try{
    if(session&&appView&&!appView.hidden)startTimers();
  }catch{}
})();
