const CLASES_DEFAULT_LSEC = [
    "A", "B", "C", "CH", "D", "E", "F", "G", "H", "I",
    "J", "K", "L", "LL", "M", "N", "O", "P", "Q", "R",
    "RR", "S", "T", "U", "V", "W", "X", "Y", "Z", "Ñ"
];

let onnxSession = null;
let clasesLSEC = [...CLASES_DEFAULT_LSEC];
let errorCargaONNX = "";

let modoActual = 'abecedario';
let cameraInstance = null;
let handsInstance = null;
let facingModeActual = 'user';
let isPredicting = false;

// CONTROL DE LETRAS Y TEXTO
let letraRegistradaActual = "";
let sentenceText = "";
let letraCandidata = "";
let contadorEstabilidad = 0;

// UMBRALES CALIBRADOS
const FRAMES_REQUERIDOS_ABC = 12; // ~0.4s manteniendo la seña firme antes de registrarla
const UMBRAL_CONFIRMAR_ABC  = 70; // 70% de confianza mínima para auto-escribir
const UMBRAL_RESETEO_ABC    = 35;

// DICCIONARIO BASE LSEC PARA CORRECCIÓN SINTÁCTICA (FASE 5 - NLP)
const DICCIONARIO_LSEC = [
    "HOLA", "BUENOS", "DIAS", "TARDES", "NOCHES", "GRACIAS", "POR", "FAVOR",
    "PROFESOR", "UNIVERSIDAD", "LSEC", "ECUADOR", "NOMBRE", "COMO", "ESTAS",
    "BIEN", "MAL", "AYUDA", "ESTUDIANTE", "PROYECTO", "INVESTIGACION", "ADIOS"
];

window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('webcam')) {
        initModulo('abecedario');
    }
});

async function asegurarONNXRuntime() {
    if (typeof window.ort === 'undefined') {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/ort.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error("No se pudo descargar ort.min.js"));
            document.head.appendChild(script);
        });
    }
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/";
    ort.env.wasm.numThreads = 1;
}

async function initModulo(tipo = 'abecedario') {
    modoActual = tipo;
    const statusEl = document.getElementById('output-class');
    if (statusEl) statusEl.textContent = "Iniciando sistema Edge AI... ⏳";

    await cargarModeloAuto();

    const videoElement = document.getElementById('webcam');
    const canvasElement = document.getElementById('output_canvas');
    if (!videoElement || !canvasElement) return;

    const canvasCtx = canvasElement.getContext('2d');

    handsInstance = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    handsInstance.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.65
    });

    handsInstance.onResults(async (results) => {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        const handsInFrame = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
        if (handsInFrame) {
            for (const landmarks of results.multiHandLandmarks) {
                drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#0891b2', lineWidth: 3 });
                drawLandmarks(canvasCtx, landmarks, { color: '#f59e0b', fillColor: '#ffffff', lineWidth: 1, radius: 4 });
            }
        }
        canvasCtx.restore();

        if (isPredicting) return;
        isPredicting = true;
        try {
            const w = videoElement.videoWidth || canvasElement.width || 640;
            const h = videoElement.videoHeight || canvasElement.height || 480;
            await predict(results, handsInFrame, w, h);
        } catch (error) {
            console.error("Error durante la predicción:", error);
        } finally {
            isPredicting = false;
        }
    });

    await iniciarCamara(videoElement, statusEl);
}

async function iniciarCamara(videoElement, statusEl) {
    try {
        if (cameraInstance) {
            await cameraInstance.stop();
        }
        cameraInstance = new Camera(videoElement, {
            onFrame: async () => {
                if (handsInstance) {
                    await handsInstance.send({ image: videoElement });
                }
            },
            facingMode: facingModeActual,
            width: 640,
            height: 480
        });
        await cameraInstance.start();
    } catch (err) {
        console.error("Error en la cámara:", err);
        if (statusEl) statusEl.textContent = "Error al encender la cámara 📷";
    }
}

async function toggleCamera() {
    facingModeActual = facingModeActual === 'user' ? 'environment' : 'user';
    const videoElement = document.getElementById('webcam');
    const statusEl = document.getElementById('output-class');
    if (videoElement) {
        await iniciarCamara(videoElement, statusEl);
    }
}

async function cargarModeloAuto() {
    const statusEl = document.getElementById('output-class');
    errorCargaONNX = "";

    // 1. Cargar lista exacta de clases exportada por Colab
    try {
        const res = await fetch('./clases_lsec.json');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.classes) && data.classes.length > 0) {
                clasesLSEC = data.classes;
            }
        }
    } catch (e) {
        console.warn("Usando orden de clases por defecto:", e);
    }

    // 2. Inicializar sesión ONNX
    try {
        await asegurarONNXRuntime();
        onnxSession = await ort.InferenceSession.create('./lsec_model.onnx', {
            executionProviders: ['wasm']
        });
        console.log("✅ Modelo ONNX (85 features) listo:", clasesLSEC);
        if (statusEl) statusEl.textContent = "Modelo 3D listo. Muestra tu mano 🖐️";
    } catch (err) {
        console.error("❌ Error cargando lsec_model.onnx:", err);
        errorCargaONNX = `⚠️ Error ONNX: ${err.message || err}`;
        onnxSession = null;
        if (statusEl) statusEl.textContent = errorCargaONNX;
    }
}

// ==========================================================================
// EXTRACTOR DE 85 CARACTERÍSTICAS 3D CANÓNICAS (SINCRONIZADO CON PYTHON)
// ==========================================================================
function extraerCaracteristicas85(landmarks, width, height) {
    // 1. Corregir relación de aspecto y centrar en la muñeca (punto 0)
    const raw = landmarks.map(p => [p.x * width, p.y * height, p.z * width]);
    const wrist = raw[0];
    const shifted = raw.map(p => [p[0] - wrist[0], p[1] - wrist[1], p[2] - wrist[2]]);
    const palmSize = Math.hypot(shifted[9][0], shifted[9][1], shifted[9][2]) + 1e-7;
    const normPts = shifted.map(p => [p[0] / palmSize, p[1] / palmSize, p[2] / palmSize]);

    const features = [];

    // A. 60 Coordenadas 3D normalizadas (puntos 1 al 20)
    for (let i = 1; i < 21; i++) {
        features.push(normPts[i][0], normPts[i][1], normPts[i][2]);
    }

    // B. 15 Ángulos articulares normalizados [0, 1]
    const triplets = [
        [0, 1, 2], [1, 2, 3], [2, 3, 4],        // Pulgar
        [0, 5, 6], [5, 6, 7], [6, 7, 8],        // Índice
        [0, 9, 10], [9, 10, 11], [10, 11, 12],  // Medio
        [0, 13, 14], [13, 14, 15], [14, 15, 16],// Anular
        [0, 17, 18], [17, 18, 19], [18, 19, 20] // Meñique
    ];
    for (const [a, b, c] of triplets) {
        const ba = [normPts[a][0] - normPts[b][0], normPts[a][1] - normPts[b][1], normPts[a][2] - normPts[b][2]];
        const bc = [normPts[c][0] - normPts[b][0], normPts[c][1] - normPts[b][1], normPts[c][2] - normPts[b][2]];
        const dot = ba[0] * bc[0] + ba[1] * bc[1] + ba[2] * bc[2];
        const denom = (Math.hypot(ba[0], ba[1], ba[2]) * Math.hypot(bc[0], bc[1], bc[2])) + 1e-7;
        const cosVal = Math.max(-1.0, Math.min(1.0, dot / denom));
        features.push(Math.acos(cosVal) / Math.PI);
    }

    // C. 10 Distancias clave pulgar-dedos e interdigitales
    const keyPairs = [
        [4, 8], [4, 12], [4, 16], [4, 20], [4, 5], [4, 9], [4, 13],
        [8, 12], [12, 16], [16, 20]
    ];
    for (const [p1, p2] of keyPairs) {
        features.push(Math.hypot(
            normPts[p1][0] - normPts[p2][0],
            normPts[p1][1] - normPts[p2][1],
            normPts[p1][2] - normPts[p2][2]
        ));
    }

    return new Float32Array(features);
}

// ==========================================================================
// PREDICCIÓN EN TIEMPO REAL
// ==========================================================================
async function predict(results, handsInFrame, width, height) {
    const confEl = document.getElementById('output-confidence');
    const classEl = document.getElementById('output-class');

    if (!handsInFrame) {
        if (classEl) {
            classEl.textContent = onnxSession
                ? "Muestra tu mano frente a la cámara 🖐️"
                : (errorCargaONNX || "Iniciando modelo... ⏳");
        }
        if (confEl) confEl.textContent = "Confianza: --";
        letraRegistradaActual = "";
        letraCandidata = "";
        contadorEstabilidad = 0;
        return;
    }

    if (!onnxSession) {
        if (classEl) classEl.textContent = errorCargaONNX || "Cargue lsec_model.onnx ⚠️";
        return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const vector85 = extraerCaracteristicas85(landmarks, width, height);
    const inputName = onnxSession.inputNames[0];
    const outputName = onnxSession.outputNames[0];

    const tensorInput = new ort.Tensor('float32', vector85, [1, 85]);
    const outputs = await onnxSession.run({ [inputName]: tensorInput });
    const probs = Array.from(outputs[outputName].data);

    const ranked = probs
        .map((p, idx) => ({ prob: p, label: clasesLSEC[idx] || CLASES_DEFAULT_LSEC[idx] }))
        .sort((a, b) => b.prob - a.prob);

    const top1 = ranked[0];
    const top2 = ranked[1];
    const bestClass = top1.label;
    const confPercent = Math.round(top1.prob * 100);
    const altPercent = top2 ? Math.round(top2.prob * 100) : 0;

    if (confEl) {
        confEl.textContent = top2 && altPercent >= 10
            ? `Confianza: ${confPercent}% (Alt: ${top2.label} ${altPercent}%)`
            : `Confianza: ${confPercent}%`;
    }

    if (confPercent < UMBRAL_RESETEO_ABC) {
        contadorEstabilidad = 0;
        letraCandidata = "";
        if (classEl) classEl.textContent = `Letra: ${bestClass} (Baja confianza)`;
        return;
    }

    if (bestClass !== letraCandidata) {
        letraCandidata = bestClass;
        contadorEstabilidad = 1;
    } else {
        contadorEstabilidad++;
    }

    if (confPercent >= UMBRAL_CONFIRMAR_ABC) {
        if (contadorEstabilidad < FRAMES_REQUERIDOS_ABC) {
            if (classEl) classEl.textContent = `Letra: ${bestClass} (${contadorEstabilidad}/${FRAMES_REQUERIDOS_ABC})`;
        } else {
            if (classEl) classEl.textContent = `Letra: ${bestClass} ✅`;
            if (bestClass !== letraRegistradaActual) {
                reproducirVoz(bestClass);
                sentenceText += bestClass;

                const box = document.getElementById('sentence-display');
                if (box) box.textContent = sentenceText;

                letraRegistradaActual = bestClass;
            }
        }
    } else {
        if (classEl) classEl.textContent = `Letra: ${bestClass}`;
    }
}

// ==========================================================================
// FASE 5: CORRECTOR SINTÁCTICO NLP (DISTANCIA DE LEVENSHTEIN)
// ==========================================================================
function levenshteinDistance(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, () => []);
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[a.length][b.length];
}

function sugerirCorreccionPalabra(palabraIncompleta, diccionario) {
    if (!palabraIncompleta || palabraIncompleta.length < 3) return palabraIncompleta;

    let mejorMatch = palabraIncompleta;
    let menorDistancia = Infinity;

    diccionario.forEach(palabraValida => {
        const dist = levenshteinDistance(palabraIncompleta.toLowerCase(), palabraValida.toLowerCase());
        if (dist < menorDistancia && dist <= 2) {
            menorDistancia = dist;
            mejorMatch = palabraValida;
        }
    });

    return mejorMatch;
}

function aplicarCorreccionUltimaPalabra() {
    const trimmed = sentenceText.trim();
    if (!trimmed) return;

    const palabras = trimmed.split(" ");
    const ultimaPalabra = palabras[palabras.length - 1];
    const palabraCorregida = sugerirCorreccionPalabra(ultimaPalabra, DICCIONARIO_LSEC);

    if (palabraCorregida !== ultimaPalabra) {
        palabras[palabras.length - 1] = palabraCorregida;
        sentenceText = palabras.join(" ");
        console.log(`✨ NLP Corrección aplicada: '${ultimaPalabra}' ➔ '${palabraCorregida}'`);
    }
}

// ==========================================================================
// VOZ EN ESPAÑOL Y BOTONES DE INTERFAZ
// ==========================================================================
function reproducirVoz(texto, esLecturaCompleta = false) {
    window.speechSynthesis.cancel();
    let textoAjustado = esLecturaCompleta ? texto.toLowerCase() : texto;
    const utterance = new SpeechSynthesisUtterance(textoAjustado);
    utterance.lang = 'es-ES';
    utterance.rate = esLecturaCompleta ? 0.9 : 1.1;
    window.speechSynthesis.speak(utterance);
}

function agregarLetraDetectada() {
    if (letraCandidata) {
        sentenceText += letraCandidata;
        letraRegistradaActual = letraCandidata;
        const box = document.getElementById('sentence-display');
        if (box) box.textContent = sentenceText;
        reproducirVoz(letraCandidata);
    }
}

function agregarEspacio() {
    aplicarCorreccionUltimaPalabra();
    sentenceText += " ";
    letraRegistradaActual = "";
    const box = document.getElementById('sentence-display');
    if (box) box.textContent = sentenceText;
}

function borrarPalabra() {
    let words = sentenceText.trim().split(" ");
    words.pop();
    sentenceText = words.join(" ") + (words.length > 0 ? " " : "");
    letraRegistradaActual = "";
    const box = document.getElementById('sentence-display');
    if (box) box.textContent = sentenceText || "...";
}

function limpiarTexto() {
    sentenceText = "";
    letraRegistradaActual = "";
    const box = document.getElementById('sentence-display');
    if (box) box.textContent = "...";
}

function leerOracion() {
    aplicarCorreccionUltimaPalabra();
    const box = document.getElementById('sentence-display');
    if (box && sentenceText.trim()) box.textContent = sentenceText;
    if (sentenceText.trim()) reproducirVoz(sentenceText, true);
}