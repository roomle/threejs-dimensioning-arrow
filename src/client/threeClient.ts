import { DimensioningArrow } from './dimensioningArrow';
import {
    AxesHelper,
    BoxGeometry,
    Color,
    DirectionalLight,
    GridHelper,
    LinearEncoding,
    Mesh,
    MeshPhysicalMaterial,
    PerspectiveCamera,
    PCFSoftShadowMap,
    PlaneGeometry,
    PMREMGenerator,
    Scene,
    ShadowMaterial,
    sRGBEncoding,
    Vector3,
    WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
// @ts-ignore
import Stats from 'three/examples/jsm/libs/stats.module' 
import { GUI } from 'dat.gui'

export const helloCube = (canvas: any) => {
    const renderer = new WebGLRenderer({canvas: canvas, antialias: true, alpha: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    //renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    //renderer.outputEncoding = sRGBEncoding;

    const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 3;
    camera.position.z = 6;
    const controls = new OrbitControls(camera, renderer.domElement);

    const scene = new Scene();
    scene.background = new Color(0xffffff);
    const pmremGenerator = new PMREMGenerator(renderer);
    const environmentTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environmentTexture;
    //scene.background = environmentTexture;

    const gridHelper = new GridHelper(10, 10);
    scene.add(gridHelper);
    const axesHelper = new AxesHelper(2);
    scene.add(axesHelper);

    const directionalLight = new DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 3, 1);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    const lightTransformControl = new TransformControls(camera, renderer.domElement);
    lightTransformControl.addEventListener( 'dragging-changed', (event: any) => {
        controls.enabled = !event.value;
    });
    lightTransformControl.attach(directionalLight);
    lightTransformControl.visible = false;
    scene.add(lightTransformControl);
    
    const groundGeometry = new PlaneGeometry(10, 10);
    groundGeometry.rotateX(-Math.PI / 2);
    const groundMaterial = new ShadowMaterial();
    const groundMesh = new Mesh(groundGeometry, groundMaterial);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshPhysicalMaterial({color: 0xe02020});
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.y = 0.5;
    scene.add(mesh);
    const meshTransformControl = new TransformControls(camera, renderer.domElement);
    meshTransformControl.addEventListener( 'dragging-changed', (event: any) => {
        controls.enabled = !event.value;
    });
    meshTransformControl.attach(mesh);
    meshTransformControl.visible = false;
    scene.add(meshTransformControl);

    const arrow = new DimensioningArrow(new Vector3(1.5, 0, 1.5), new Vector3(3, 0, 0), { color: 0x000000 });
    scene.add(arrow);

    // @ts-ignore
    const stats = new Stats();
    document.body.appendChild(stats.dom);
    const gui = new GUI();
    const uiProperties = {
        'mesh transform control': meshTransformControl.visible,
        'light transform control': lightTransformControl.visible,
    }
    gui.add(uiProperties, 'mesh transform control').onChange((value) => meshTransformControl.visible = value);
    gui.add(uiProperties, 'light transform control').onChange((value) => lightTransformControl.visible = value);

    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }, false);

    let previousTimeStamp: number | undefined;
    const animate = (timestamp: number) => {
        const deltaTimeMs = timestamp - (previousTimeStamp ?? timestamp);
        previousTimeStamp = timestamp;
        requestAnimationFrame(animate);
        //mesh.rotation.y += 45 * Math.PI / 180 * deltaTimeMs / 1000;
        controls.update();
        render();
        stats.update()
    }

    const render = () => {
        renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
}

// @ts-ignore
helloCube(three_canvas);
