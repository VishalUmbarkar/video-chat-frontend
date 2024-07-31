import React, { useEffect, useState, useRef } from 'react';
import SimplePeer from 'simple-peer';

const VideoChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [peer, setPeer] = useState(null);
  const ws = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket('ws://video-chat-app-production-24b6.up.railway.app/video-chat');

    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received WebSocket message:', message);

      if (message.type === 'signal') {
        console.log('Received signal data:', message.data);
        if (peer) {
          peer.signal(message.data);
        }
      } else {
        const newMessage = message.data;
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.current.close();
    };
  }, [peer]);

  useEffect(() => {
    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log('Local stream obtained:', stream);
        localVideoRef.current.srcObject = stream;

        const isInitiator = window.location.hash === '#init';
        const newPeer = new SimplePeer({
          initiator: isInitiator,
          trickle: true, // Enable trickling for ICE candidates
          stream: stream,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' }
            ]
          }
        });

        newPeer.on('signal', (data) => {
          console.log("Generated signal data: ", data);
          ws.current.send(JSON.stringify({ type: 'signal', data }));
        });

        newPeer.on('stream', (remoteStream) => {
          console.log('Received remote stream:', remoteStream);
          remoteVideoRef.current.srcObject = remoteStream;
        });

        newPeer.on('error', (err) => {
          console.error('Peer error:', err);
        });

        newPeer.on('connect', () => {
          console.log('Peer connected');
        });

        newPeer.on('iceStateChange', (state) => {
          console.log('ICE state change:', state);
        });

        newPeer.on('iceConnectionStateChange', (state) => {
          console.log('ICE connection state change:', state);
        });

        newPeer.on('iceConnectionStateChange', () => {
          console.log('ICE connection state:', newPeer.iceConnectionState);
        });

        newPeer.on('iceGatheringStateChange', () => {
          console.log('ICE gathering state:', newPeer.iceGatheringState);
        });

        setPeer(newPeer);
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    setupMedia();
  }, []);

  const sendMessage = () => {
    if (ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'message', data: input }));
      setInput('');
    }
  };

  return (
    
    <div>
      <h1>Video Chat</h1>
      {/* {newPeer && ( */}
      <div className="video-container">
        <video ref={localVideoRef} autoPlay muted />
        <video ref={remoteVideoRef} autoPlay muted />
      </div>
      {/* )} */}
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
    
  );
};

export default VideoChat;
