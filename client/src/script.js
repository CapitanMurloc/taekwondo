import {client} from "./client.js";

const controls = window;
const LandmarkGrid = window.LandmarkGrid;
const drawingUtils = window;
const mpPose = window;
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d');
// We'll add this to our control panel later, but we'll save it here so we can
// call tick() each time the graph runs.
const fpsControl = new controls.FPS();
// Optimization: Turn off animated spinner after its hiding animation is done.
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};
const landmarkContainer = document.getElementsByClassName('landmark-grid-container')[0];
const grid = new LandmarkGrid(landmarkContainer, {
    connectionColor: 0xCCCCCC,
    definedColors: [{name: 'LEFT', value: 0xffa500}, {name: 'RIGHT', value: 0x00ffff}],
    range: 2,
    fitToGrid: true,
    labelSuffix: 'm',
    landmarkSize: 2,
    numCellsPerAxis: 4,
    showHidden: false,
    centered: true,
});
let activeEffect = 'mask';

async function onResults(results) {
    if (!results.poseLandmarks) {
        grid.updateLandmarks([]);
        return;
    }
    // Hide the spinner.
    document.body.classList.add('loaded');
    // Update the frame rate.
    fpsControl.tick();

    // Draw the overlays.
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    if (results.segmentationMask) {
        canvasCtx.drawImage(results.segmentationMask, 0, 0,
            canvasElement.width, canvasElement.height);

        // Only overwrite existing pixels.
        if (activeEffect === 'mask' || activeEffect === 'both') {
            canvasCtx.globalCompositeOperation = 'source-in';
            // This can be a color or a texture or whatever...
            canvasCtx.fillStyle = '#00FF007F';
            canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        } else {
            canvasCtx.globalCompositeOperation = 'source-out';
            canvasCtx.fillStyle = '#0000FF7F';
            canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        }

        // canvasCtx.globalCompositeOperation = 'source-in';
        // canvasCtx.fillStyle = '#00FF00';
        // canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

        // Only overwrite missing pixels.
        canvasCtx.globalCompositeOperation = 'destination-atop';
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.globalCompositeOperation = 'source-over';
    } else {
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    }

    if(results.poseLandmarks){
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
            {color: '#00FF00', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks,
            {color: '#FF0000', lineWidth: 2});
    }

    canvasCtx.restore();

    if (results.poseWorldLandmarks) {
        grid.updateLandmarks(results.poseWorldLandmarks, mpPose.POSE_CONNECTIONS, [
            {list: Object.values(mpPose.POSE_LANDMARKS_LEFT), color: 'LEFT'},
            {list: Object.values(mpPose.POSE_LANDMARKS_RIGHT), color: 'RIGHT'},
        ]);
        client.send_pose(results.poseWorldLandmarks);
    } else {
        grid.updateLandmarks([]);
    }

    // console.log("results", JSON.stringify(results.poseWorldLandmarks));
}

const pose = new Pose({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${mpPose.VERSION}/${file}`;
    }
});

// pose.setOptions({
//     modelComplexity: 2,
//     selfieMode: true,
//     smoothLandmarks: true,
//     enableSegmentation: true,
//     smoothSegmentation: true,
//     minDetectionConfidence: 0.5,
//     minTrackingConfidence: 0.5,
//     effect: 'background'
// });

pose.onResults(onResults);
// Present a control panel through which the user can manipulate the solution
// options.
new controls
    .ControlPanel(controlsElement, {
        selfieMode: true,
        modelComplexity: 2,
        smoothLandmarks: true,
        enableSegmentation: true,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        connect: false,
        effect: 'background'
    })
    .add([
        new controls.StaticText({title: 'MediaPipe Pose'}),
        fpsControl,
        new controls.Toggle({title: 'Selfie Mode', field: 'selfieMode'}),

        new controls.SourcePicker({
            onSourceChanged: () => {
                // Resets because this model gives better results when reset between
                // source changes.
                pose.reset();
            },
            onFrame: async (input, size) => {
                const aspect = size.height / size.width;
                let width, height;
                if (window.innerWidth > window.innerHeight) {
                    height = window.innerHeight;
                    width = height / aspect;
                } else {
                    width = window.innerWidth;
                    height = width * aspect;
                }
                canvasElement.width = width;
                canvasElement.height = height;
                await pose.send({image: input});
            },
        }),
        new controls.Slider({
            title: 'Model Complexity',
            field: 'modelComplexity',
            discrete: ['Lite', 'Full', 'Heavy'],
        }),
        new controls.Toggle({title: 'Smooth Landmarks', field: 'smoothLandmarks'}),
        new controls.Toggle({title: 'Enable Segmentation', field: 'enableSegmentation'}),
        new controls.Toggle({title: 'Smooth Segmentation', field: 'smoothSegmentation'}),
        new controls.Slider({
            title: 'Min Detection Confidence',
            field: 'minDetectionConfidence',
            range: [0, 1],
            step: 0.01
        }),
        new controls.Slider({
            title: 'Min Tracking Confidence',
            field: 'minTrackingConfidence',
            range: [0, 1],
            step: 0.01
        }),
        new controls.Slider({
            title: 'Effect',
            field: 'effect',
            discrete: {'background': 'Background', 'mask': 'Foreground'},
        }),
        new controls.Toggle({title: 'Connect', field: 'connect'}),
    ])
    .on(x => {
        const options = x;
        videoElement.classList.toggle('selfie', options.selfieMode);
        activeEffect = x['effect'];
        pose.setOptions(options);
        if(options.connect) {
            client.connect();
        }
    });

// const camera = new Camera(videoElement, {
//     onFrame: async () => {
//         await pose.send({image: videoElement});
//     },
//     width: 1280,
//     height: 720
// });
//
// camera.start();
