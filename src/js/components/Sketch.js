/* eslint-disable no-unreachable */
import * as T from 'three';
import dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// import fragment from './shader/fragment.glsl';
// import vertex from '../../shader/vertex.glsl';
import map from './earth.jpg';

export default class Sketch {
	constructor(options) {
		this.scene = new T.Scene();

		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new T.WebGLRenderer();
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(0xeeeeee, 1);
		this.renderer.outputEncoding = T.sRGBEncoding;

		this.container.appendChild(this.renderer.domElement);

		this.camera = new T.PerspectiveCamera(
			70,
			window.innerWidth / window.innerHeight,
			0.001,
			1000,
		);

		// var frustumSize = 10;
		// var aspect = window.innerWidth / window.innerHeight;
		// this.camera = new T.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -1000, 1000 );
		this.camera.position.set(0, 0, 2);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.time = 0;

		this.isPlaying = true;

		this.loadObjects().then(() => {
			this.addObjects();
			this.resize();
			this.render();
			this.setupResize();
		});
	}

	settings() {
		let that = this;
		this.settings = {
			progress: 0,
		};
		this.gui = new dat.GUI();
		this.gui.add(this.settings, 'progress', 0, 1, 0.01);
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this));
	}

	resize() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
	}

	loadObjects() {
		const loader = new T.FileLoader();

		const fragment = new Promise((resolve, reject) => {
			loader.load(
				'./shader/fragment.glsl',
				(data) => {
					this.fragment = data;
					resolve();
				},
				() => {},
				(err) => {
					console.log(err);
					reject();
				},
			);
		});

		const vertex = new Promise((resolve, reject) => {
			loader.load(
				'./shader/vertex.glsl',
				(data) => {
					this.vertex = data;
					resolve();
				},
				() => {},
				(err) => {
					console.log(err);
					reject();
				},
			);
		});

		return Promise.all([fragment, vertex]);
	}

	addObjects() {
		let that = this;

		this.shaderMaterial = new T.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable',
			},
			side: T.DoubleSide,
			uniforms: {
				time: { type: 'f', value: 0 },
				resolution: { type: 'v4', value: new T.Vector4() },
				uvRate1: {
					value: new T.Vector2(1, 1),
				},
			},
			// wireframe: true,
			transparent: true,
			vertexShader: this.vertex,
			fragmentShader: this.fragment,
		});

		this.material = new T.MeshBasicMaterial({
			map: new T.TextureLoader().load(map),
		});

		this.geometry = new T.SphereGeometry(1, 30, 30);

		this.planet = new T.Mesh(this.geometry, this.material);
		this.scene.add(this.planet);

		const createMesh = (color) => {
			return new T.Mesh(
				new T.SphereGeometry(0.02, 20, 20),
				new T.MeshBasicMaterial({
					color,
				}),
			);
		};

		const points = [
			{
				name: 'Kiyv',
				color: 0xff0000,
				lat: 50.450001,
				lng: 30.523333,
			},
			{
				name: 'Washington DC',
				color: 0x00ff00,
				lat: 38.8951,
				lng: -77.0364,
			},
			{
				name: 'Pekin',
				color: 0x00ff00,
				lat: 40.568459,
				lng: 89.643028,
			},
			{
				name: 'Kyoto',
				color: 0xff0000,
				lat: 35.011665,
				lng: 135.768326,
			},
		];

		const { sin, cos, PI } = Math;

		const getPosition = ({ lat, lng }) => {
			const radian = (PI / 180);
			const phi = (90 - lat) * radian;
			const theta = (lng + 180) * radian;

			const sinPhi = sin(phi);
			const cosPhi = cos(phi);
			const sinTheta = sin(theta);
			const cosTheta = cos(theta);

			return [
				-(sinPhi * cosTheta), // x
				cosPhi, // y
				sinPhi * sinTheta, // z
			];
		};

		points.forEach((
			{
				color,
			},
			i,
		) => {
			const mesh = createMesh(color);
			const pos = getPosition(points[i]);
			mesh.position.set(...pos);
			this.scene.add(mesh);

			points[i].pos = pos;
		});

		points.reduce((a, b) => {
			this.getCurve(a.pos, b.pos);
			return b;
		});
	}

	getCurve(p1, p2) {
		const vector1 = new T.Vector3(...p1);
		const vector2 = new T.Vector3(...p2);

		const pointsArray = [];

		for (let i = 1; i < 30; i += 1) {
			const p = new T.Vector3().lerpVectors(vector1, vector2, i / 30);
			p.normalize();
			p.multiplyScalar(1 + 0.04 * Math.sin((Math.PI * i) / 30));

			pointsArray.push(p);
		}

		const path = new T.CatmullRomCurve3(pointsArray);

		const geometry = new T.TubeGeometry(path, 20, 0.0025, 8, false);
		const material = this.shaderMaterial;
		const mesh = new T.Mesh(geometry, material);
		this.scene.add(mesh);
	}

	stop() {
		this.isPlaying = false;
	}

	play() {
		if (!this.isPlaying) {
			this.render();
			this.isPlaying = true;
		}
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;
		this.shaderMaterial.uniforms.time.value = this.time;
		window.requestAnimationFrame(this.render.bind(this));
		this.renderer.render(this.scene, this.camera);
	}
}
