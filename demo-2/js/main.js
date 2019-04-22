// 媒体流配置
const mediaStreamConstraints = {
    video: true
};

// 设置只传输视频
const offerOptions = {
    offerToReceiveVideo: 1,
};

let startTime = null;

// 获得button
const startButton = document.getElementById('startBtn');
const callButton = document.getElementById('callBtn');
const hangupButton = document.getElementById('hangupBtn');

// 获得 video 标签元素
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// 媒体流对象
let localStream;
let remoteStream;

// peer connection
let localPeerConnection;
let remotePeerConnection;

// 回调保存本地媒体流对象并把流传到 video 标签。允许拨号
function gotLocalMediaStream(mediaStream) {
    localStream = mediaStream;
    localVideo.srcObject = mediaStream;
    trace("接收本地媒体流中...");
    callButton.disabled = false;   // 允许拨打
}

// handle 错误信息
function handleLocalMediaStreamError(error) {
    console.log("打开本地视频流错误: ", error)
}

// 回调保存远程媒体流对象并把流传到 video 标签
function gotRemoteMediaStream(event) {
    const mediaStream = event.stream;
    remoteVideo.srcObject = mediaStream;
    remoteStream = mediaStream;
    trace("远程节点链接成功，接收远程媒体流中...");
}


// 添加视频流事件日志
// 打印视频信息
function logVideoLoaded(event) {
    const video = event.target;
    trace(`${video.id} videoWidth: ${video.videoWidth}px, ` +
        `videoHeight: ${video.videoHeight}px.`);
}

// 打印视频信息
// 这个事件会在视频流开始缓冲的时候发生
function logResizedVideo(event) {
    logVideoLoaded(event);

    if (startTime) {
        const elapsedTime = window.performance.now() - startTime;
        startTime = null;
        trace(`Setup time: ${elapsedTime.toFixed(3)}ms.`);
    }
}

localVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('onresize', logResizedVideo);


// 定义 RTC peer connection
function handleConnection(event) {
    const peerConnection = event.target;
    const iceCandidate = event.candidate;

    if (iceCandidate) {
        const newIceCanidate = new RTCIceCandidate(iceCandidate);
        const otherPeer = getOtherPeer(peerConnection);

        otherPeer.addIceCandidate(newIceCanidate)
            .then(() => {
                handleConnectionSuccess(peerConnection);
            }).catch((error) => {
             handleConnectionFailure(peerConnection, error);
            });

        trace(`${getPeerName(peerConnection)} ICE candidate:\n` +
            `${event.candidate.candidate}.`);
    }
}

// 打印连接成功日志
function handleConnectionSuccess(peerConnection) {
    trace(`${getPeerName(peerConnection)} addIceCandidate success.`);
}

// 打印连接失败日志
function handleConnectionFailure(peerConnection, error) {
    trace(`${getPeerName(peerConnection)} failed to add ICE Candidate:\n`+
        `${error.toString()}.`);
}

// 打印当连接的状态改变
function handleConnectionChange(event) {
    const peerConnection = event.target;
    console.log('ICE 状态改变: ', event);
    trace(`${getPeerName(peerConnection)} ICE 状态: ` +
        `${peerConnection.iceConnectionState}.`);
}

// 打印当设置 session 的时候失败
function setSessionDescriptionError(error) {
    trace(`创建 session 失败: ${error.toString()}.`);
}

// 打印当设置 session 的时候成功
function setDescriptionSuccess(peerConnection, functionName) {
    const peerName = getPeerName(peerConnection);
    trace(`${peerName} ${functionName} 完成.`);
}

// 打印当 localDescription 设置成功
function setLocalDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

// 打印当 remoteDescription 设置成功
function setRemoteDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

// 创建 offer
function createdOffer(description) {
    trace(`Offer from localPeerConnection:\n${description.sdp}`);

    trace('localPeerConnection setLocalDescription 开始.');
    localPeerConnection.setLocalDescription(description)
        .then(() => {
            setLocalDescriptionSuccess(localPeerConnection);
        }).catch(setSessionDescriptionError);

    trace('remotePeerConnection setRemoteDescription 开始.');
    remotePeerConnection.setRemoteDescription(description)
        .then(() => {
            setRemoteDescriptionSuccess(remotePeerConnection);
        }).catch(setSessionDescriptionError);

    trace('remotePeerConnection createAnswer 开始.');
    remotePeerConnection.createAnswer()
        .then(createdAnswer)
        .catch(setSessionDescriptionError);
}

// 创建 answer
function createdAnswer(description) {
    trace(`Answer from remotePeerConnection:\n${description.sdp}.`);

    trace('remotePeerConnection setLocalDescription 开始.');
    remotePeerConnection.setLocalDescription(description)
        .then(() => {
            setLocalDescriptionSuccess(remotePeerConnection);
        }).catch(setSessionDescriptionError);

    trace('localPeerConnection setRemoteDescription 开始.');
    localPeerConnection.setRemoteDescription(description)
        .then(() => {
            setRemoteDescriptionSuccess(localPeerConnection);
        }).catch(setSessionDescriptionError);
}

// 设置按钮操作
// 初始化时，禁用拨打和挂起
callButton.disabled = true;
hangupButton.disabled = true;


// 开始按钮，打开本地媒体流
function startAction() {
    startButton.disabled = true;
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
        .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
    trace('本地媒体流打开中...');
}

// 拨打按钮， 创建 peer connection
function callAction() {
    callButton.disabled = true;
    hangupButton.disabled = false;

    trace("开始拨打...");
    startTime = window.performance.now();

    // 获得本地媒体流记录
    const videoTracks = localStream.getVideoTracks();
    const audioTracks = localStream.getAudioTracks();

    if (videoTracks.length > 0) {
        trace(`使用中的视频设备: ${videoTracks[0].label}.`);
    }
    if (audioTracks.length > 0) {
        trace(`使用中的音频设备: ${audioTracks[0].label}.`);
    }


    const servers = null;  // RTC 服务器配置

    // 创建 peer connetcions 并添加事件
    localPeerConnection = new RTCPeerConnection(servers);
    trace("创建本地 peer connetcion 对象");

    localPeerConnection.addEventListener('icecandidate', handleConnection);
    localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);

    remotePeerConnection = new RTCPeerConnection(servers);
    trace("创建远程 peer connetcion 对象");

    remotePeerConnection.addEventListener('icecandidate', handleConnection);
    remotePeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);
    remotePeerConnection.addEventListener('addstream', gotRemoteMediaStream);

    // 添加本地流到连接中并创建连接
    localPeerConnection.addStream(localStream);
    trace("添加本地流到本地 PeerConnection");

    trace("开始创建本地 PeerConnection offer");
    localPeerConnection.createOffer(offerOptions)
        .then(createdOffer).catch(setSessionDescriptionError);
}

// 挂机
function hangupAction() {
    localPeerConnection.close();
    remotePeerConnection.close();
    localPeerConnection = null;
    remotePeerConnection = null;
    hangupButton.disabled = true;
    callButton.disabled = false;
    trace('Ending call.');
}

// 添加按钮事件绑定
startButton.addEventListener('click', startAction);
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);

// 工具方法
// 获得其他 peer connection.
function getOtherPeer(peerConnection) {
    return (peerConnection === localPeerConnection) ?
        remotePeerConnection : localPeerConnection;
}

// 获得 peer connection 名称.
function getPeerName(peerConnection) {
    return (peerConnection === localPeerConnection) ?
        'localPeerConnection' : 'remotePeerConnection';
}

// 打印包含时间的日志
function trace(text) {
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);
    console.log(now, text);
}







