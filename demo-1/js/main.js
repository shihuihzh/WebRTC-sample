// 媒体流配置
const mediaStreamConstraints = {
    video: true
    // video: {
    //     width: {
    //         min: 1280
    //     },
    //     height: {
    //         min: 720
    //     }
    // }
};

// 获得 video 标签元素
const localVideo = document.querySelector("video");

// 媒体流对象
let localStream;

// 回调保存视频流对象并把流传到 video 标签
function gotLocalMediaStream(mediaStream) {
    localStream = mediaStream;
    localVideo.srcObject = mediaStream;
}

// handle 错误信息
function handleLocalMediaStreamError(error) {
    console.log("打开本地视频流错误: ", error)
}

// fire!!
navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
    .then(gotLocalMediaStream)
    .catch(handleLocalMediaStreamError);

