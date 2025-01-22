const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const displaySize = {
    width: window.innerWidth,
    height: window.innerHeight
};

// Initialize Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, displaySize.width / displaySize.height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(displaySize.width, displaySize.height);
document.body.appendChild(renderer.domElement);

// Add light to the scene
const light = new THREE.AmbientLight(0xffffff, 1);
scene.add(light);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Shiny metal material
const shinyMetalMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xC0C0C0,
    metalness: 1.0,
    roughness: 0.2,
    reflectivity: 3.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    emissive: 0xFFFFFF,
    emissiveIntensity: 0.7,
});

// Load the 3D model
const loader = new THREE.GLTFLoader();
let leftEarModel, rightEarModel;
loader.load('models/your_model.glb', (gltf) => {
    leftEarModel = gltf.scene.clone();
    rightEarModel = gltf.scene.clone();

    leftEarModel.traverse((child) => {
        if (child.isMesh) child.material = shinyMetalMaterial;
    });
    rightEarModel.traverse((child) => {
        if (child.isMesh) child.material = shinyMetalMaterial;
    });

    leftEarModel.scale.set(0.3, 0.3, 0.3);
    rightEarModel.scale.set(0.3, 0.3, 0.3);

    scene.add(leftEarModel);
    scene.add(rightEarModel);
});

// Load the "HELLO" text in 3D
const fontLoader = new THREE.FontLoader();
let helloTextMesh;
fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    const textGeometry = new THREE.TextGeometry("Ceci n'est pas un cog", {
        font: font,
        size: 0.2,
        height: 0.1,
    });
    helloTextMesh = new THREE.Mesh(textGeometry, shinyMetalMaterial);
    helloTextMesh.position.set(0, 1, -3);
    scene.add(helloTextMesh);
});

// Initialize video stream
navigator.mediaDevices.getUserMedia({ video: {} })
    .then((stream) => {
        video.srcObject = stream;
    })
    .catch((err) => console.error('Error accessing webcam:', err));

// Load face-api.js models
async function loadModels() {
    await faceapi.nets.ssdMobilenetv1.loadFromUri('./models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
    console.log('Models loaded');
    detectFace();
}

// Detect faces and update objects
async function detectFace() {
    const detections = await faceapi.detectAllFaces(video).withFaceLandmarks();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    canvas?.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    if (resizedDetections.length > 0) {
        const landmarks = resizedDetections[0].landmarks;

        const leftEarApprox = landmarks.getLeftEye()[3];
        const rightEarApprox = landmarks.getRightEye()[3];
        const forehead = landmarks.getNose()[0];

        const normalize = (coord, max) => (coord / max) * 2 - 1;

        const normalizedLeftEar = {
            x: normalize(leftEarApprox.x, displaySize.width),
            y: normalize(leftEarApprox.y, displaySize.height),
        };
        const normalizedRightEar = {
            x: normalize(rightEarApprox.x, displaySize.width),
            y: normalize(rightEarApprox.y, displaySize.height),
        };

        const normalizedForehead = {
            x: normalize(forehead.x, displaySize.width),
            y: normalize(forehead.y, displaySize.height),
        };

        if (leftEarModel && rightEarModel) {
            leftEarModel.position.set(normalizedLeftEar.x + 1.2, -normalizedLeftEar.y, -3);
            rightEarModel.position.set(normalizedRightEar.x - 1.2, -normalizedRightEar.y, -3);
        }

        if (helloTextMesh) {
            helloTextMesh.position.set(
                normalizedForehead.x - 1,
                normalizedForehead.y,
                -3
            );
        }
    }

    if (leftEarModel && rightEarModel) {
        leftEarModel.rotation.x += -0.01;
        rightEarModel.rotation.x += 0.03;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(detectFace);
}

// Set up the canvas and load models
video.onplaying = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    loadModels();

    camera.position.z = 2;
};

// Resize the renderer and canvas when the window is resized
window.addEventListener('resize', () => {
    displaySize.width = window.innerWidth;
    displaySize.height = window.innerHeight;
    renderer.setSize(displaySize.width, displaySize.height);
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;
    camera.aspect = displaySize.width / displaySize.height;
    camera.updateProjectionMatrix();
});
