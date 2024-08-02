import React, { useEffect, useRef } from 'react';

const WebRTCComponent = () => {
  // const localVideoRef = useRef(null);
  // const remoteVideoRef = useRef(null);
  // const [localStream, setLocalStream] = useState(null);
  const ws = useRef(null);

  //websocket creation
  ws.current = new WebSocket('ws://video-chat-app-production-24b6.up.railway.app/video-chat');

  //PeerConnection Creation
  const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });


//-------------------Utility Functions-----------------------------------

const sendToSocket =(message)=>{
  console.log("Sending msg to socket:", message);
  ws.current.send(JSON.stringify({message}));
}


 async function handleOffer(message) {
  console.log(message);
  const obj = message.message;
  console.log("obj: ",obj)
  const rtcSessionDescription = new RTCSessionDescription({
    type: obj.sdp.type,
    sdp: obj.sdp.sdp
  });
  await peerConnection
    .setRemoteDescription(rtcSessionDescription)
    .then(() => navigator.mediaDevices.getUserMedia({audio:"false", video:"true"}))
    // .then((stream) => {
    //   document.getElementById("local_video").srcObject = stream;
    //   return peerConnection.addStream(stream);
    // })
    .then(() => peerConnection.createAnswer())
    .then((answer) => peerConnection.setLocalDescription(answer))
    .then(() => {
      // Send the answer to the remote peer using the signaling server
      sendToSocket(peerConnection.localDescription);
      console.log(peerConnection.localDescription)
    })
    .catch("handleGetUserMediaError");
}

async function handleAnswer(message) {
  console.log(message);
  const obj = message.message;
  console.log("obj: ", obj);
  const rtcSessionDescription = new RTCSessionDescription({
    type: obj.sdp.type,
    sdp: obj.sdp.sdp
  });

  await peerConnection
    .setRemoteDescription(rtcSessionDescription)
    .then(() => {
      console.log("Remote description set successfully with answer: ", rtcSessionDescription);
    })
    .catch((error) => {
      console.error('Error setting remote description with answer:', error);
    });
} 

//-------------------Web Socket Events---------------------------------------

  ws.current.onopen = ()=>{
    console.log("Websocket online");
  }

  ws.current.onclose = ()=>{
    console.log("Websocket offline");
  }

  useEffect(()=>{
  ws.current.onmessage = (event) => {
    const receivedString = event.data;
    const type = event.data;
    console.log(type);
    console.log("received string: ",receivedString);
    const message = JSON.parse(receivedString);
    console.log(message.type);
    handleOffer(message);
    
    
    
  }
},[])

  // ws.current.onmessage = (event) => {
  //   const receivedString = event.data;
  //   console.log("received string: ",receivedString);
  //   const message = JSON.parse(receivedString);
  //   if (message.type === "answer") {
  //     handleAnswer(message);
  //   }
    
  // }

//----------------------------------------------------------------------------

//---------------------Peer Connection Events---------------------------------

peerConnection.onicecandidate = (ev) => {
  if (ev.candidate !== null) {
    sendToSocket({
      type: "new-ice-candidate",
      candidate: ev.candidate,
    });
  }
};


peerConnection.addEventListener("icegatheringstatechange", (ev) => {
  switch (peerConnection.iceGatheringState) {
    case "new":
      /* gathering is either just starting or has been reset */
      console.log("new")
      break;
    case "gathering":
      /* gathering has begun or is ongoing */
      console.log("gathering")
      break;
    case "complete":
      /* gathering has ended */
      console.log("completed")
      break;
     default:
      console.log("nothing")
  }
});


peerConnection.onicecandidate = (ev) => {
  if(ev.candidate){
    console.log("candidate is null");
  }
  if (ev.candidate !== null) {
    console.log("Sending new ice candidate to socket server: ", ev.candidate);
    sendToSocket({
      type: "new-ice-candidate",
      candidate: ev.candidate,
    });
  }
};



const makeCall = ()=>{
  console.log("Call Initiated");
  try {
    peerConnection.createOffer()
    .then((offer)=> peerConnection.setLocalDescription(offer))
    .then(()=> {
      sendToSocket({type: "offer", sdp: peerConnection.localDescription,});
      // console.log("localDescription: ", localDescription);
    })
    // console.log("Offer created: ", offer);
  } catch (error) {
    console.warn("Error while creating local offer : ", error);
  }
  
}


  return (
    <div>
      {/* <video ref={localVideoRef} autoPlay muted></video> */}
      {/* <video ref={remoteVideoRef} autoPlay></video> */}
      <button onClick={makeCall}>Start Call</button>
    </div>
  );
};

export default WebRTCComponent;



