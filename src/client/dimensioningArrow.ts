import {
    Camera,
    Color,
    ColorRepresentation,
    DoubleSide,
    Group,
    Material,
    Matrix4,
    Mesh,
    NoBlending,
    Object3D,
    PlaneGeometry,
    ShaderMaterial,
    UniformsUtils,
    Vector2,
    Vector3,
    WebGLRenderer,
} from 'three';

export interface DimensioningArrowParameters {
    shaftPixelWidth: number;
    shaftPixelOffset: number;
    arrowPixelWidth: number;
    arrowPixelHeight: number;
    color: ColorRepresentation;
}

export class DimensioningArrow extends Group {
    public parameters: DimensioningArrowParameters;
    public start: Vector3;
    public end: Vector3;
    public startShaft: Mesh;
    public endShaft: Mesh;
    public startShaftMaterial: DimensioningArrowShaftMaterial;
    public endShaftMaterial: DimensioningArrowShaftMaterial;
    public startArrow: Mesh;
    public endArrow: Mesh;
    public startArrowMaterial: DimensioningArrowMaterial;
    public endArrowMaterial: DimensioningArrowMaterial;

    constructor(start: Vector3, end: Vector3, parameters?: any) {
        super();
        this.start = start.clone();
        this.end = end.clone();
        this.parameters = {
            shaftPixelWidth: 10.0,
            shaftPixelOffset: 3.0,
            arrowPixelWidth: 30.0,
            arrowPixelHeight: 50.0,
            color: 0x000000,
            ...parameters,
        }
        this.startShaftMaterial = new DimensioningArrowShaftMaterial();
        this.startShaft = new Mesh(new PlaneGeometry(2, 1).translate(0, 0.5, 0), this.startShaftMaterial);
        this.startShaft.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
            this.updateShaftMaterial(true, renderer, camera, material);
        };
        this.add(this.startShaft);
        this.endShaftMaterial = new DimensioningArrowShaftMaterial();
        this.endShaft = new Mesh(new PlaneGeometry(2, 1).translate(0, 0.5, 0), this.endShaftMaterial);
        this.endShaft.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
            this.updateShaftMaterial(false, renderer, camera, material);
        };
        this.add(this.endShaft);
        this.startArrowMaterial = new DimensioningArrowMaterial();
        this.startArrow = new Mesh(new PlaneGeometry(2, 1).translate(0, 0.5, 0), this.startArrowMaterial);
        this.startArrow.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
            this.updateArrowMaterial(true, renderer, camera, material);
        };
        this.add(this.startArrow);
        this.endArrowMaterial = new DimensioningArrowMaterial();
        this.endArrow = new Mesh(new PlaneGeometry(2, 1).translate(0, 0.5, 0), this.endArrowMaterial);
        this.endArrow.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
            this.updateArrowMaterial(false, renderer, camera, material);
        };
        this.add(this.endArrow);
        this.updateArrow();
    }

    public updateArrow() {
        const direction = this.end.clone().sub(this.start);
        const length = direction.length();
        direction.multiplyScalar(1 / length);
        const rotationAxis = new Vector3(0, 1, 0).cross(direction);
        const rotationAngle = Math.acos(new Vector3(0, 1, 0).dot(direction));
        this.setModelMatrix(this.startShaft, this.start, length, rotationAxis, rotationAngle);
        this.setModelMatrix(this.endShaft, this.end, length, rotationAxis, rotationAngle);
        this.setModelMatrix(this.startArrow, this.start, 1, rotationAxis, rotationAngle);
        this.setModelMatrix(this.endArrow, this.end, 1, rotationAxis, rotationAngle + Math.PI);
    }

    private setModelMatrix(object: Object3D, start: Vector3, length: number, rotationAxis: Vector3, rotationAngle: number) {
        object.scale.set(1, 1, 1);
        object.rotation.set(0, 0, 0);
        object.position.set(0, 0, 0);
        object.applyMatrix4(new Matrix4().makeScale(1, length * 0.5, 1));
        object.applyMatrix4(new Matrix4().makeRotationAxis(rotationAxis, rotationAngle));
        object.applyMatrix4(new Matrix4().makeTranslation(start.x, start.y, start.z));
    }

    public updateShaftMaterial(startArrow: boolean, renderer: WebGLRenderer, camera: Camera, material: Material) {
        if (material instanceof DimensioningArrowShaftMaterial) {
            const renderTarget = renderer.getRenderTarget();
            const viewportSize = new Vector2();
            renderer.getSize(viewportSize);
            const width = renderTarget?.width ?? viewportSize.x;
            const height = renderTarget?.height ?? viewportSize.y;
            material.update({
                width,
                height,
                camera,
                start: startArrow ? this.start : this.end,
                end: startArrow ? this.end : this.start,
                shaftPixelWidth: this.parameters.shaftPixelWidth,
                shaftPixelOffset: this.parameters.shaftPixelOffset,
                arrowPixelSize: new Vector2(this.parameters.arrowPixelWidth, this.parameters.arrowPixelHeight),
                color: this.parameters.color,
            });
        }
    }

    public updateArrowMaterial(startArrow: boolean, renderer: WebGLRenderer, camera: Camera, material: Material) {
        if (material instanceof DimensioningArrowMaterial) {
            const renderTarget = renderer.getRenderTarget();
            const width = renderTarget?.width ?? renderer.domElement.clientWidth;
            const height = renderTarget?.height ?? renderer.domElement.clientHeight;
            material.update({
                width,
                height,
                camera,
                start: startArrow ? this.start : this.end,
                end: startArrow ? this.end : this.start,
                arrowPixelSize: new Vector2(this.parameters.arrowPixelWidth, this.parameters.arrowPixelHeight),
                color: this.parameters.color,
            });
        }
    }
}

const glslShaftVertexShader = 
`varying vec2 centerPixel;
varying vec2 posPixel;
varying vec2 arrowDir;

uniform vec2 resolution;
uniform vec3 start;
uniform vec3 end;
uniform float shaftPixelWidth;
uniform float shaftPixelOffset;
uniform vec2 arrowPixelSize;

vec2 pixelToNdcScale(vec4 hVec) {
    return vec2(2.0 * hVec.w) / resolution.xy;
}

void main() {
    vec4 viewPos = modelViewMatrix * vec4(0.0, 0.0, position.z, 1.0);
    gl_Position = projectionMatrix * viewPos;
    vec4 clipStart = projectionMatrix * viewMatrix * vec4(start, 1.0);
    vec4 clipEnd = projectionMatrix * viewMatrix * vec4(end, 1.0);
    vec2 clipDir = normalize((clipEnd.xy / clipEnd.w - clipStart.xy / clipStart.w) * resolution.xy);
    gl_Position.xy = mix(clipStart.xy / clipStart.w, clipEnd.xy / clipEnd.w, position.y * 0.5) * gl_Position.w;
    gl_Position.xy += vec2(-clipDir.y, clipDir.x) * position.x * shaftPixelWidth * 0.5 * pixelToNdcScale(gl_Position);

    vec4 clipCenter = clipStart;
    float d = arrowPixelSize.y * (1.0 + RADIUS_RATIO) - length(arrowPixelSize * vec2(0.5, RADIUS_RATIO));
    clipCenter.xy += clipDir * (d + shaftPixelOffset + shaftPixelWidth * 0.5) * pixelToNdcScale(gl_Position);
    centerPixel = (clipCenter.xy / gl_Position.w * 0.5 + 0.5) * resolution;
    posPixel = (gl_Position.xy / gl_Position.w * 0.5 + 0.5) * resolution;
    arrowDir = clipDir;
}`;

const glslShaftFragmentShader = 
`varying vec2 centerPixel;
varying vec2 posPixel;
varying vec2 arrowDir;

uniform float shaftPixelWidth;
uniform vec3 color;

void main() {
    if (dot(arrowDir, posPixel - centerPixel) < 0.0 && length(posPixel - centerPixel) > shaftPixelWidth * 0.5)
        discard;
    gl_FragColor = vec4(color, 1.0);
}`;

export class DimensioningArrowShaftMaterial extends ShaderMaterial {
    private static shader: any = {
        uniforms: {
            resolution: { value: new Vector2() },
            start: { value: new Vector3() },
            end: { value: new Vector3() },
            shaftPixelWidth: { value: 10.0 },
            shaftPixelOffset: { value: 10.0 },
            arrowPixelSize: { value: new Vector2() },
            color: { value: new Color() },
        },
        defines: {
            RADIUS_RATIO: 0.5,
        },
        vertexShader: glslShaftVertexShader,
        fragmentShader: glslShaftFragmentShader,
    };

    constructor(parameters?: any) {
        super({
            defines: Object.assign({}, DimensioningArrowShaftMaterial.shader.defines),
            uniforms: UniformsUtils.clone(DimensioningArrowShaftMaterial.shader.uniforms),
            vertexShader: DimensioningArrowShaftMaterial.shader.vertexShader,
            fragmentShader: DimensioningArrowShaftMaterial.shader.fragmentShader,
            blending: NoBlending,
            side: DoubleSide
        });
        this.update(parameters);
    }

    public update(parameters?: any): DimensioningArrowShaftMaterial {
        if (parameters?.width || parameters?.height) {
            const width = parameters?.width ?? this.uniforms.resolution.value.x;
            const height = parameters?.height ?? this.uniforms.resolution.value.y;
            this.uniforms.resolution.value.set(width, height);
        }
        if (parameters?.start !== undefined) {
            this.uniforms.start.value.copy(parameters.start);
        }
        if (parameters?.end !== undefined) {
            this.uniforms.end.value.copy(parameters.end);
        }
        if (parameters?.shaftPixelWidth !== undefined) {
            this.uniforms.shaftPixelWidth.value = parameters.shaftPixelWidth;
        }
        if (parameters?.shaftPixelOffset !== undefined) {
            this.uniforms.shaftPixelOffset.value = parameters.shaftPixelOffset;
        }
        if (parameters?.arrowPixelSize !== undefined) {
            this.uniforms.arrowPixelSize.value.copy(parameters.arrowPixelSize);
        }
        if (parameters?.color !== undefined) {
            this.uniforms.color.value = new Color(parameters.color);
        }
        return this;
    }
}

const glslArrowVertexShader = 
`varying vec2 arrowUv;
varying vec2 centerPixel;
varying vec2 posPixel;

uniform vec2 resolution;
uniform vec3 start;
uniform vec3 end;
uniform vec2 arrowPixelSize;

vec2 pixelToNdcScale(vec4 hVec) {
    return vec2(2.0 * hVec.w) / resolution.xy;
}

void main() {
    vec4 viewPos = modelViewMatrix * vec4(0.0, 0.0, position.z, 1.0);
    gl_Position = projectionMatrix * viewPos;
    vec4 clipStart = projectionMatrix * viewMatrix * vec4(start, 1.0);
    vec4 clipEnd = projectionMatrix * viewMatrix * vec4(end, 1.0);
    vec2 clipDir = normalize((clipEnd.xy / clipEnd.w - clipStart.xy / clipStart.w) * resolution.xy);
    gl_Position.xy += clipDir * position.y * arrowPixelSize.y * pixelToNdcScale(gl_Position);
    gl_Position.xy += vec2(-clipDir.y, clipDir.x) * position.x * arrowPixelSize.x * 0.5 * pixelToNdcScale(gl_Position);

    arrowUv = position.xy;

    vec4 clipCenter = clipStart;
    clipCenter.xy += clipDir * arrowPixelSize.y * (1.0 + RADIUS_RATIO) * pixelToNdcScale(gl_Position);
    centerPixel = (clipCenter.xy / gl_Position.w * 0.5 + 0.5) * resolution;
    posPixel = (gl_Position.xy / gl_Position.w * 0.5 + 0.5) * resolution;
}`;

const glslArrowFragmentShader = 
`varying vec2 arrowUv;
varying vec2 centerPixel;
varying vec2 posPixel;

uniform vec2 resolution;
uniform vec2 arrowPixelSize;
uniform vec3 color;

void main() {
    if (abs(arrowUv.x) > abs(arrowUv.y))
        discard;
    if (length(posPixel - centerPixel) < length(arrowPixelSize * vec2(0.5, RADIUS_RATIO)))
        discard;
    gl_FragColor = vec4(color, 1.0);
}`;

export class DimensioningArrowMaterial extends ShaderMaterial {
    private static shader: any = {
        uniforms: {
            resolution: { value: new Vector2() },
            start: { value: new Vector3() },
            end: { value: new Vector3() },
            arrowPixelSize: { value: new Vector2() },
            color: { value: new Color() },
        },
        defines: {
            RADIUS_RATIO: 0.5,
        },
        vertexShader: glslArrowVertexShader,
        fragmentShader: glslArrowFragmentShader,
    };

    constructor(parameters?: any) {
        super({
            defines: Object.assign({}, DimensioningArrowMaterial.shader.defines),
            uniforms: UniformsUtils.clone(DimensioningArrowMaterial.shader.uniforms),
            vertexShader: DimensioningArrowMaterial.shader.vertexShader,
            fragmentShader: DimensioningArrowMaterial.shader.fragmentShader,
            blending: NoBlending,
            side: DoubleSide
        });
        this.update(parameters);
    }

    public update(parameters?: any): DimensioningArrowMaterial {
        if (parameters?.width || parameters?.height) {
            const width = parameters?.width ?? this.uniforms.resolution.value.x;
            const height = parameters?.height ?? this.uniforms.resolution.value.y;
            this.uniforms.resolution.value.set(width, height);
        }
        if (parameters?.start !== undefined) {
            this.uniforms.start.value.copy(parameters.start);
        }
        if (parameters?.end !== undefined) {
            this.uniforms.end.value.copy(parameters.end);
        }
        if (parameters?.arrowPixelSize !== undefined) {
            this.uniforms.arrowPixelSize.value.copy(parameters.arrowPixelSize);
        }
        if (parameters?.color !== undefined) {
            this.uniforms.color.value = new Color(parameters.color);
        }
        return this;
    }
}
