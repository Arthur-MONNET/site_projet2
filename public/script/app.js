const BOXID = 1001
let PHOTOID
let filePhoto, audioG
let initRecord = false, recordBool = false;
var leftchannel = [];
var rightchannel = [];
var recorder = null;
var recordingLength = 0;
var volume = null;
var mediaStream = null;
var sampleRate = 44100;
var context = null;
var blob = window.URL || window.webkitURL;
const steps_indicator_wrapper = document.querySelector('.steps')
const steps = document.querySelectorAll('.content_step>div')
let step = 0
const nbStep = steps.length
for (let i = 0; i < nbStep; i++)steps_indicator_wrapper.innerHTML += '<div></div>'
const steps_indicator = document.querySelectorAll('.steps>div')
const nextButtons = document.querySelectorAll('.next')

function changeStep() {
    if (step < nbStep && step >= 0) {
        for (let i = 0; i < nbStep; i++) {
            if (i <= step) steps_indicator[i].classList.add('step-ok')
            else steps_indicator[i].classList.remove('step-ok')
            steps[i].classList.remove('visible')
        }
        steps[step].classList.add('visible')
    }
}
function nextStep() {
    if (step < nbStep - 1) {
        step++
        changeStep()
    }

}
function goToStep(newStep) {
    if (newStep < nbStep && newStep >= 0) {
        step = newStep
        changeStep()
    }
}
nextButtons.forEach(nextButton => {
    nextButton.addEventListener("click", () => {
        nextStep()
    })
})
document.querySelector('.next-passed').addEventListener('click',()=>{
    console.log("passed")
    goToStep(6)
})
for (let i = 0; i < nbStep; i++) {
    steps_indicator[i].addEventListener("click", () => {
        if (steps_indicator[i].classList.contains('step-ok')) goToStep(i)
    })
}

var imagePreviewWrapper = document.querySelector("#img-preview");
var imagePreview = document.querySelector("#img-preview>img");
var buttonPreview = document.querySelector("#button-preview");
var imageNameInput = document.querySelector("#image_name");


imageNameInput.addEventListener('input', () => {
    console.log(filePhoto)
    if (filePhoto) {
        nextButtons[1].classList.remove("hidden")
    } else {
        nextButtons[1].classList.add("hidden")
    }
})
var previewPicture = function (e) {

    // e.files contient un objet FileList
    const [picture] = e.files
    filePhoto = picture
    let imageName = picture.name.substring(0, picture.name.lastIndexOf('.'))
    console.log(imageName)
    // "picture" est un objet File
    if (picture) {
        // On change l'URL de l'image
        imagePreview.src = URL.createObjectURL(picture)
        imagePreviewWrapper.classList.remove('hidden')
        buttonPreview.classList.add('hidden')
        //if(!imageNameInput.value){
        imageNameInput.value = imageName
        //}
        nextButtons[1].classList.remove("hidden")
        document.querySelector(".loader").classList.remove('hidden')
        document.querySelector(".view3D").classList.add('hidden')
        nextButtons[2].classList.add('hidden')
    }
}

var buttonAudioPreview = document.querySelector(".audios>label");
var recordEl = document.querySelector("#record-audio");
var audioPreview = document.querySelector("#audio-preview");
var audioNameInput = document.querySelector("#audio1_name");

audioNameInput.addEventListener('input', () => {
    console.log(audioG)
    if (audioG && audioNameInput.value) {
        nextButtons[3].classList.remove("hidden")
    } else {
        nextButtons[3].classList.add("hidden")
    }
})

var previewAudio = function (e) {

    // e.files contient un objet FileList
    if(e){
        const [audio] = e.files
        audioG = audio
    }
    console.log(audioG)
    let audioName = audioG.name ? audioG.name.substring(0, audioG.name.lastIndexOf('.')):''
    console.log(audioName)
    // "audio" est un objet File
    if (audioG) {
        audioPreview.src = blob.createObjectURL(audioG)
        audioPreview.classList.remove('hidden')
        buttonAudioPreview.classList.add('hidden')
        recordEl.classList.add('hidden')
        //if(!audioNameInput.value){
        audioName ? audioNameInput.value = audioName : ''
        //}
        if(audioNameInput.value){
            nextButtons[3].classList.remove("hidden")
        }
        
    }

}

function startRecord() {
    // Initialize recorder
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    navigator.getUserMedia(
        {
            audio: true
        },
        function (e) {
            console.log("user consent");

            // creates the audio context
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            context = new AudioContext();

            // creates an audio node from the microphone incoming stream
            mediaStream = context.createMediaStreamSource(e);

            // https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createScriptProcessor
            // bufferSize: the onaudioprocess event is called when the buffer is full
            var bufferSize = 2048;
            var numberOfInputChannels = 2;
            var numberOfOutputChannels = 2;
            if (context.createScriptProcessor) {
                recorder = context.createScriptProcessor(bufferSize, numberOfInputChannels, numberOfOutputChannels);
            } else {
                recorder = context.createJavaScriptNode(bufferSize, numberOfInputChannels, numberOfOutputChannels);
            }

            recorder.onaudioprocess = function (e) {
                leftchannel.push(new Float32Array(e.inputBuffer.getChannelData(0)));
                rightchannel.push(new Float32Array(e.inputBuffer.getChannelData(1)));
                recordingLength += bufferSize;
            }

            // we connect the recorder
            mediaStream.connect(recorder);
            recorder.connect(context.destination);
        },
        function (e) {
            console.error(e);
        });
}
function stopRecord() {

    // stop recording
    recorder.disconnect(context.destination);
    mediaStream.disconnect(recorder);

    // we flat the left and right channels down
    // Float32Array[] => Float32Array
    var leftBuffer = flattenArray(leftchannel, recordingLength);
    var rightBuffer = flattenArray(rightchannel, recordingLength);
    // we interleave both channels together
    // [left[0],right[0],left[1],right[1],...]
    var interleaved = interleave(leftBuffer, rightBuffer);

    // we create our wav file
    var buffer = new ArrayBuffer(44 + interleaved.length * 2);
    var view = new DataView(buffer);

    // RIFF chunk descriptor
    writeUTFBytes(view, 0, 'RIFF');
    view.setUint32(4, 44 + interleaved.length * 2, true);
    writeUTFBytes(view, 8, 'WAVE');
    // FMT sub-chunk
    writeUTFBytes(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // chunkSize
    view.setUint16(20, 1, true); // wFormatTag
    view.setUint16(22, 2, true); // wChannels: stereo (2 channels)
    view.setUint32(24, sampleRate, true); // dwSamplesPerSec
    view.setUint32(28, sampleRate * 4, true); // dwAvgBytesPerSec
    view.setUint16(32, 4, true); // wBlockAlign
    view.setUint16(34, 16, true); // wBitsPerSample
    // data sub-chunk
    writeUTFBytes(view, 36, 'data');
    view.setUint32(40, interleaved.length * 2, true);

    // write the PCM samples
    var index = 44;
    var volume = 1;
    for (var i = 0; i < interleaved.length; i++) {
        view.setInt16(index, interleaved[i] * (0x7FFF * volume), true);
        index += 2;
    }

    // our final audioG
    audioG = new Blob([view], { type: 'audio/wav'});
}
function postAudio(type) {
    if (audioG == null) {
        return;
    }
    console.info(audioG)
    if (PHOTOID) {
        const file = new File([audioG], 'audio_recording.wav', {type: audioG.type})
        const formData = new FormData()
        console.info(file)
        formData.append('dataFile', file, file.name)
        formData.append('photoID', PHOTOID)
        formData.append('type', type)
        fetch('http://localhost:4000/upload-audio', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                console.log(data)
            })
            .catch(error => {
                console.log(error)
            })
    } else console.log("missing photo")
}


function flattenArray(channelBuffer, recordingLength) {
    var result = new Float32Array(recordingLength);
    var offset = 0;
    for (var i = 0; i < channelBuffer.length; i++) {
        var buffer = channelBuffer[i];
        result.set(buffer, offset);
        offset += buffer.length;
    }
    return result;
}

function interleave(leftChannel, rightChannel) {
    var length = leftChannel.length + rightChannel.length;
    var result = new Float32Array(length);

    var inputIndex = 0;

    for (var index = 0; index < length;) {
        result[index++] = leftChannel[inputIndex];
        result[index++] = rightChannel[inputIndex];
        inputIndex++;
    }
    return result;
}

function writeUTFBytes(view, offset, string) {
    for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

recordEl.addEventListener('click',(e)=>{
    //console.log(e.target.id == "circle-record")
    if(!initRecord){
        initRecord = true
        recordEl.style.marginLeft = 0
        buttonAudioPreview.classList.add("hidden-tr")
    }
    console.log(recordBool)
    if(recordBool === false){
        recordBool = true
        recordEl.innerHTML = '<div id="circle-record" class="icon circle-anim"></div>Recording...'
        startRecord();
    }else if(e.target.id === "circle-record"){
        stopRecord()
        recordBool = false
        recordEl.innerHTML = '<div id="circle-record" class="icon"></div>PAUSE'
    }else{
        stopRecord()
        previewAudio()
    }
    console.log(recordBool)
})






function handlePhoto() {
    const formData = new FormData()
    console.info(filePhoto)
    formData.append('dataFile', filePhoto, filePhoto.name)
    formData.append('boxID', BOXID)
    fetch('http://localhost:4000/upload-image', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            console.log(data)
            PHOTOID = data.photoID
        })
        .catch(error => {
            console.log(error)
        })
}

function generate3D() {
    console.log("start generate 3D")
    setTimeout(() => {
        console.log("3D generated")
        document.querySelector(".loader").classList.add('hidden')
        document.querySelector(".view3D").classList.remove('hidden')
        nextButtons[2].classList.remove('hidden')
    }, 3000);
}

nextButtons[1].addEventListener('click', () => {
    console.log("click")
    if (document.querySelector(".view3D").classList.contains('hidden')) generate3D()
})

changeStep()