import React, { useEffect, useRef } from 'react';

const WebRTCComponent = () => {
  const ws = useRef(null);
  const peerConnection = useRef(null);
  const queuedCandidates = useRef([]);
  const localStream = useRef(null);
  const remoteStream = useRef(new MediaStream());
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    // WebSocket creation
    ws.current = new WebSocket('ws://video-chat-app-production-24b6.up.railway.app/video-chat');

    ws.current.onopen = () => {
      console.log("WebSocket online");
    };

    ws.current.onclose = () => {
      console.log("WebSocket offline");
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      if (message.type === 'offer') {
        handleOffer(message);
      } else if (message.type === 'answer') {
        handleAnswer(message);
      } else if (message.type === 'new-ice-candidate') {
        handleNewICECandidateMsg(message);
      }
    };

    // PeerConnection Creation
    peerConnection.current = new RTCPeerConnection({
      // iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      iceServers: [
        {
          urls: [
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
            'stun:stun3.l.google.com:19302',
            'stun:stun4.l.google.com:19302',
          ],
        },
        {
          urls: 'turn:49.36.35.163:3478',
          username: 'example',
          credential: 'pass'
        },
      ],
      iceCandidatePoolSize: 10,
    });

    peerConnection.current.onicecandidate = (ev) => {
      if (ev.candidate) {
        console.log("Sending new ice candidate to socket server: ", ev.candidate);
        sendToSocket({
          type: "new-ice-candidate",
          candidate: ev.candidate
        });
      }
    };

    peerConnection.current.addEventListener("icegatheringstatechange", (ev) => {
      switch (peerConnection.current.iceGatheringState) {
        case "new":
          console.log("new");
          break;
        case "gathering":
          console.log("gathering");
          break;
        case "complete":
          console.log("complete");
          break;
        default:
          console.log("nothing");
      }
    });

    peerConnection.current.onnegotiationneeded = (ev) => {
      peerConnection.current.createOffer()
        .then((offer) => peerConnection.current.setLocalDescription(offer))
        .then(() =>
          sendToSocket({
            type: "video-offer",
            sdp: peerConnection.current.localDescription,
          }),
        )
        .catch((err) => {
          // handle error
          console.log("error while handling negotiation : ", err)
        });
    };

    peerConnection.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => remoteStream.current.addTrack(track));
      remoteVideoRef.current.srcObject = remoteStream.current;
    };

    return () => {
      ws.current.close();
    };
  }, []);

  //----------------------------functions---------------------------------------------------

  const sendToSocket = (message) => {
    console.log("Sending msg to socket:", message);
    ws.current.send(JSON.stringify(message));
  };

  const handleOffer = async (message) => {
    console.log("Handling offer:", message);

    const rtcSessionDescription = new RTCSessionDescription(message.sdp);
    await peerConnection.current.setRemoteDescription(rtcSessionDescription);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    localStream.current = stream;
    localVideoRef.current.srcObject = stream;

    stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    sendToSocket({
      type: "answer",
      sdp: peerConnection.current.localDescription
    });

    // Process queued ICE candidates
    await processQueuedCandidates();
  };

  const handleAnswer = async (message) => {
    console.log("Handling answer:", message);

    const rtcSessionDescription = new RTCSessionDescription(message.sdp);
    await peerConnection.current.setRemoteDescription(rtcSessionDescription);

    // Process queued ICE candidates
    await processQueuedCandidates();
  };

  const handleNewICECandidateMsg = async (message) => {
    console.log("Received ICE candidate:", message.candidate);

    const candidate = new RTCIceCandidate(message.candidate);
    if (peerConnection.current.remoteDescription) {
      try {
        setTimeout(1000);
        await peerConnection.current.addIceCandidate(candidate);
        console.log("Added ICE candidate successfully.");
      } catch (error) {
        console.error("Error adding received ICE candidate", error);
      }
    } else {
      console.log("Remote description not set yet, queuing ICE candidate.");
      queuedCandidates.current.push(candidate);
    }
  };

  const processQueuedCandidates = async () => {
    console.log("Processing queued ICE candidates.");
    for (const candidate of queuedCandidates.current) {
      try {
        console.log("adding ice candidate to queue", candidate)
        await peerConnection.current.addIceCandidate(candidate);
        console.log("Added queued ICE candidate successfully.");
      } catch (error) {
        console.error("Error adding queued ICE candidate", error);
      }
    }
    queuedCandidates.current = [];
  };

  const makeCall = async () => {
    console.log("Call Initiated");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      localStream.current = stream;
      localVideoRef.current.srcObject = stream;

      stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      sendToSocket({
        type: "offer",
        sdp: peerConnection.current.localDescription
      });
    } catch (error) {
      console.warn("Error while creating local offer: ", error);
    }
  };

  return (
    <div>
      <video ref={localVideoRef} autoPlay muted style={{ width: '300px', height: '300px' }} />
      <video ref={remoteVideoRef} autoPlay style={{ width: '300px', height: '300px' }} />
      <button onClick={makeCall}>Start Call</button>
    </div>
  );
};

export default WebRTCComponent;
