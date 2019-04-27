var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;

//////////////////////////////////////////////

var room = 'foo';
var socket = io.connect();

if (room !== "") {
    socket.emit('create or join', room);
    console.log('尝试或加入房间： ' + room);
}

socket.on('created', function(room, clientId) {
    isInitiator = true;
    console.log('创建房间：' + room + ' 成功')
});

socket.on('full', function(room) {
    console.log('房间 ' + room + ' 已满');
});

socket.on('ipaddr', function(ipaddr) {
    console.log('服务器 ip 为： ' + ipaddr);
});

socket.on('join', function (room){
    console.log('另一个节点请求加入： ' + room);
    console.log('当前节点为房间 ' + room + ' 的创建者!');
    isChannelReady = true;
});

socket.on('joined', function(room) {
    console.log('已加入: ' + room);
    isChannelReady = true;
});

socket.on('log', function(array) {
    console.log.apply(console, array);
});

////////////////////////////

function sendMessage(message) {
    console.log('客户端发送消息: ', message);
    socket.emit('message', message);
}

// 消息处理
socket.on('message', function(message) {
    console.log('客户端接收到消息:', message);
    if (message === 'got user media') {
        maybeStart();
    } else if (message.type === 'offer') {
        if (!isInitiator && !isStarted) {
            maybeStart();
        }
        pc.setRemoteDescription(new RTCSessionDescription(message));
        doAnswer();
    } else if (message.type === 'answer' && isStarted) {
        pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' && isStarted) {
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });
        pc.addIceCandidate(candidate);
    } else if (message === 'bye' && isStarted) {
        handleRemoteHangup();
    }
});

//////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

navigator.mediaDevices.getUserMedia({
    audio: false,
    video: true})
    .then(gotStream)
    .catch(function(e) {
        alert('获得媒体错误: ' + e.name);
    });

function gotStream(stream) {
    console.log('正在添加本地流');
    localStream = stream;
    localVideo.srcObject = stream;
    sendMessage('got user media');
}

function maybeStart() {
    console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
    if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
        console.log('>>>>>> 正在创建 peer connection');
        createPeerConnection();
        pc.addStream(localStream);
        isStarted = true;
        console.log('isInitiator', isInitiator);
        if (isInitiator) {
            doCall();
        }
    }
}

window.onbeforeunload = function() {
    sendMessage('bye');
};

///////////////////////////////////

function createPeerConnection() {
    try {
        pc = new RTCPeerConnection(null);
        pc.onicecandidate = handleIceCandidate;
        pc.onaddstream = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
        console.log('RTCPeerConnnection 已创建');
    } catch (e) {
        console.log('创建失败 PeerConnection, exception: ' + e.message);
        alert('RTCPeerConnection 创建失败');
    }
}

function handleIceCandidate(event) {
    console.log('icecandidate event: ', event);
    if (event.candidate) {
        sendMessage({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        });
    } else {
        console.log('End of candidates.');
    }
}

function handleCreateOfferError(event) {
    console.log('createOffer() error: ', event);
}

function doCall() {
    console.log('发送 offer 到节点');
    pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
    console.log('发送 answer 到节点.');
    pc.createAnswer().then(
        setLocalAndSendMessage,
        onCreateSessionDescriptionError
    );
}

function setLocalAndSendMessage(sessionDescription) {
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage 正在发送消息', sessionDescription);
    sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
    trace('创建 session 失败: ' + error.toString());
}

function handleRemoteStreamAdded(event) {
    console.log('远程媒体流设置.');
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
    console.log('远程媒体流已删除. Event: ', event);
}

function hangup() {
    console.log('挂机.');
    stop();
    sendMessage('bye');
}

function handleRemoteHangup() {
    console.log('Session 结束.');
    stop();
    isInitiator = false;
}

function stop() {
    isStarted = false;
    pc.close();
    pc = null;
}


