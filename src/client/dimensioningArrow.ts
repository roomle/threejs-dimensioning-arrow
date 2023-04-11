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
    arrowPixelWidth: number;
    arrowPixelHeight: number;
    color: ColorRepresentation;
}

export class DimensioningArrow extends Group {
    public parameters: DimensioningArrowParameters;
    public start: Vector3;
    public end: Vector3;
    public shaft: Mesh;
    public shaftMaterial: DimensioningArrowShaftMaterial;
    public startArrow: Mesh;
    public endArrow: Mesh;
    public arrowMaterial: DimensioningArrowMaterial;

    constructor(start: Vector3, end: Vector3, parameters?: any) {
        super();
        this.start = start.clone();
        this.end = end.clone();
        this.parameters = {
            shaftPixelWidth: 10.0,
            arrowPixelWidth: 30.0,
            arrowPixelHeight: 50.0,
            color: 0x000000,
            ...parameters,
        }
        this.shaftMaterial = new DimensioningArrowShaftMaterial();
        this.shaft = new Mesh(new PlaneGeometry(2, 2).translate(0, 1, 0), this.shaftMaterial);
        this.shaft.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
            this.updateShaftMaterial(renderer, camera, material);
        };
        this.add(this.shaft);
        this.arrowMaterial = new DimensioningArrowMaterial();
        this.startArrow = new Mesh(new PlaneGeometry(2, 1).translate(0, 0.5, 0), this.arrowMaterial);
        this.startArrow.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
            this.updateArrowMaterial(true, renderer, camera, material);
        };
        this.add(this.startArrow);
        this.endArrow = new Mesh(new PlaneGeometry(2, 1).translate(0, -0.5, 0), this.arrowMaterial);
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
        this.setModelMatrix(this.shaft, this.start, length, rotationAxis, rotationAngle);
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

    public updateShaftMaterial(renderer: WebGLRenderer, camera: Camera, material: Material) {
        if (material instanceof DimensioningArrowShaftMaterial) {
            const renderTarget = renderer.getRenderTarget();
            const width = renderTarget?.width ?? renderer.domElement.clientWidth;
            const height = renderTarget?.height ?? renderer.domElement.clientHeight;
            material.update({
                width,
                height,
                camera,
                start: this.start,
                end: this.end,
                shaftPixelWidth: this.parameters.shaftPixelWidth,
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
                arrowPixelWidth: this.parameters.arrowPixelWidth,
                arrowPixelHeight: this.parameters.arrowPixelHeight,
                color: this.parameters.color,
            });
        }
    }
}

const glslShaftVertexShader = 
`uniform vec2 resolution;
uniform vec3 start;
uniform vec3 end;
uniform float shaftPixelWidth;

void main() {
    vec4 viewPos = modelViewMatrix * vec4(0.0, position.yz, 1.0);
    gl_Position = projectionMatrix * viewPos;
    vec4 clipStart = projectionMatrix * viewMatrix * vec4(start, 1.0);
    vec4 clipEnd = projectionMatrix * viewMatrix * vec4(end, 1.0);
    vec2 clipDir = normalize((clipEnd.xy / clipEnd.w - clipStart.xy / clipStart.w) * resolution.xy);
    gl_Position.xy += vec2(-clipDir.y, clipDir.x) * gl_Position.w * position.x * shaftPixelWidth * 0.5 / resolution.xy;
}`;

const glslShaftFragmentShader = 
`uniform vec3 color;

void main() {
    gl_FragColor = vec4(color, 1.0);
}`;

export class DimensioningArrowShaftMaterial extends ShaderMaterial {
    private static shader: any = {
        uniforms: {
            resolution: { value: new Vector2(0, 0) },
            start: { value: new Vector3() },
            end: { value: new Vector3() },
            shaftPixelWidth: { value: 10.0 },
            color: { value: new Color(0x000000) },
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
        if (parameters?.color !== undefined) {
            this.uniforms.color.value = new Color(parameters.color);
        }
        return this;
    }
}

const glslArrowVertexShader = 
`uniform vec2 resolution;
uniform vec3 start;
uniform vec3 end;
uniform float arrowPixelWidth;
uniform float arrowPixelHeight;

void main() {
    vec4 viewPos = modelViewMatrix * vec4(0.0, 0.0, position.z, 1.0);
    gl_Position = projectionMatrix * viewPos;
    vec4 clipStart = projectionMatrix * viewMatrix * vec4(start, 1.0);
    vec4 clipEnd = projectionMatrix * viewMatrix * vec4(end, 1.0);
    vec2 clipDir = normalize((clipEnd.xy / clipEnd.w - clipStart.xy / clipStart.w) * resolution.xy);
    gl_Position.xy += clipDir * gl_Position.w * position.y * arrowPixelHeight / resolution.xy;
    gl_Position.xy += vec2(-clipDir.y, clipDir.x) * gl_Position.w * position.x * arrowPixelWidth * 0.5 / resolution.xy;
}`;

const glslArrowFragmentShader = 
`uniform vec3 color;

void main() {
    gl_FragColor = vec4(color, 1.0);
}`;

export class DimensioningArrowMaterial extends ShaderMaterial {
    private static shader: any = {
        uniforms: {
            resolution: { value: new Vector2(0, 0) },
            start: { value: new Vector3() },
            end: { value: new Vector3() },
            arrowPixelWidth: { value: 30.0 },
            arrowPixelHeight: { value: 50.0 },
            color: { value: new Color(0x000000) },
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
        if (parameters?.arrowPixelWidth !== undefined) {
            this.uniforms.arrowPixelWidth.value = parameters.arrowPixelWidth;
        }
        if (parameters?.arrowPixelHeight !== undefined) {
            this.uniforms.arrowPixelHeight.value = parameters.arrowPixelHeight;
        }
        if (parameters?.color !== undefined) {
            this.uniforms.color.value = new Color(parameters.color);
        }
        return this;
    }
}
