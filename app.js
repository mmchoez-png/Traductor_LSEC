let modeloActivo = null;
let modoActual = 'abecedario';
let cameraInstance = null;
let handsInstance = null;

// CONTROL DE LETRAS Y TEXTO
let letraRegistradaActual = "";
let sentenceText = "";
let letraCandidata = "";
let contadorEstabilidad = 0;

// CONFIGURACIÓN DE UMBRALES DE SENSIBILIDAD
const FRAMES_REQUERIDOS_ABC = 4;  // Reducido a 4 cuadros (~0.15s) para mayor fluidez
const UMBRAL_CONFIRMAR_ABC  = 50; // Con 50% de confianza ya procesa la letra
const UMBRAL_RESETEO_ABC    = 30; // Si la confianza cae a menos de 30%, busca otra letra

// AUTO-INICIALIZAR AL CARGAR LA PÁGINA
window.addEventListener('DOMContentLoaded', () => {
    initModulo('abecedario');
});

async function initModulo(tipo = 'abecedario') {
    modoActual = tipo;
    const statusEl = document.getElementById('output-class');
    if (statusEl) statusEl.textContent = "Iniciando sistema... ⏳";

    // 1. Cargar el modelo en segundo plano
    await cargarModeloAuto(tipo);

    // 2. Elementos DOM
    const videoElement = document.getElementById('webcam');
    const canvasElement = document.getElementById('output_canvas');
    if (!videoElement || !canvasElement) return;

    const canvasCtx = canvasElement.getContext('2d');

    // 3. Configurar MediaPipe Hands
    handsInstance = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    handsInstance.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
    });

    // 4. Procesamiento de cuadros
    handsInstance.onResults((results) => {
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

        // PREDICCIÓN SEGURA
        try {
            const points = extractLandmarks(results);
            predict(points, handsInFrame);
        } catch (error) {
            console.error("Error durante la predicción:", error);
        }
    });

    // 5. Iniciar Cámara
    try {
        cameraInstance = new Camera(videoElement, {
            onFrame: async () => {
                if (handsInstance) {
                    await handsInstance.send({ image: videoElement });
                }
            },
            width: 640,
            height: 480
        });
        await cameraInstance.start();
    } catch (err) {
        console.error("Error en la cámara:", err);
        if (statusEl) statusEl.textContent = "Error al encender la cámara 📷";
    }
}

async function cargarModeloAuto(modo) {
    const ruta = modo === 'abecedario' ? './modelo_abecedario.json' : './modelo_frases.json';
    const statusEl = document.getElementById('output-class');
    try {
        const res = await fetch(ruta);
        if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
        const data = await res.json();
        
        modeloActivo = data;
        if (statusEl) statusEl.textContent = "Modelo listo. Muestra tu mano 🖐️";
    } catch (e) {
        console.error(`Error cargando ${ruta}:`, e);
        modeloActivo = null;
        if (statusEl) statusEl.textContent = `⚠️ Error en JSON: ${e.message}`;
    }
}

// MOTOR DE PREDICCIÓN CON RESETEO Y FLUIDEZ RÁPIDA
function predict(inputVector, handsInFrame) {
    const confEl = document.getElementById('output-confidence');
    const classEl = document.getElementById('output-class');

    // 1. Si no hay mano detectada
    if (!handsInFrame) {
        if (classEl && modeloActivo) classEl.textContent = "Muestra tu mano frente a la cámara 🖐️";
        if (confEl) confEl.textContent = "Confianza: --";
        letraRegistradaActual = "";
        letraCandidata = "";
        contadorEstabilidad = 0;
        return;
    }

    if (!modeloActivo || !modeloActivo.weights || !modeloActivo.weights[0]) {
        if (classEl) classEl.textContent = "Cargue un modelo_abecedario.json válido ⚠️";
        return;
    }

    // 2. Garantizar longitud exacta del vector de 84 entradas con padding de ceros
    const expectedLen = modeloActivo.weights[0].length;
    if (inputVector.length < expectedLen) {
        const pad = new Array(expectedLen - inputVector.length).fill(0.0);
        inputVector = inputVector.concat(pad);
    } else if (inputVector.length > expectedLen) {
        inputVector = inputVector.slice(0, expectedLen);
    }

    // 3. Cálculo Neuronal Nativo
    let h1 = relu(matMulAdd(inputVector, modeloActivo.weights[0], modeloActivo.biases[0]));
    let h2 = relu(matMulAdd(h1, modeloActivo.weights[1], modeloActivo.biases[1]));
    let logits = matMulAdd(h2, modeloActivo.weights[2], modeloActivo.biases[2]);

    const maxLogit = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxLogit));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map(e => e / sumExps);

    let maxIdx = 0;
    for (let i = 1; i < probs.length; i++) {
        if (probs[i] > probs[maxIdx]) maxIdx = i;
    }

    const bestClass = modeloActivo.classes[maxIdx];
    const confPercent = Math.round(probs[maxIdx] * 100);

    if (classEl) classEl.textContent = `Letra: ${bestClass}`;
    if (confEl) confEl.textContent = `Confianza: ${confPercent}%`;

    // 4. LÓGICA DE DECISIÓN Y CONFIRMACIÓN RÁPIDA
    if (modoActual === 'abecedario') {
        // REGLA A: Si la confianza cae a menos de 30%, se libera inmediatamente
        if (confPercent < UMBRAL_RESETEO_ABC) {
            contadorEstabilidad = 0;
            letraCandidata = "";
            return;
        }

        // REGLA B: Cambio de candidato al instante
        if (bestClass !== letraCandidata) {
            letraCandidata = bestClass;
            contadorEstabilidad = 1;
        } else {
            contadorEstabilidad++;
        }

        // REGLA C: Confirmación de letra (>= 50% y estable por unos fotogramas)
        if (confPercent >= UMBRAL_CONFIRMAR_ABC && contadorEstabilidad >= FRAMES_REQUERIDOS_ABC) {
            if (bestClass !== letraRegistradaActual) {
                reproducirVoz(bestClass);
                sentenceText += bestClass;
                
                const box = document.getElementById('sentence-display');
                if (box) box.textContent = sentenceText;
                
                letraRegistradaActual = bestClass;
                contadorEstabilidad = 0;
            }
        }
    }
}

function relu(arr) { return arr.map(v => Math.max(0, v)); }

function matMulAdd(input, W, b) {
    const M = b.length;
    const N = input.length;
    const output = new Array(M).fill(0);
    for (let j = 0; j < M; j++) {
        let sum = b[j];
        for (let i = 0; i < N; i++) sum += input[i] * W[i][j];
        output[j] = sum;
    }
    return output;
}

// EXTRAER Y NORMALIZAR PUNTOS (CON CORRECCIÓN DE ESPEJO PARA WEBCAM)
function extractLandmarks(results) {
    let mano1 = [], mano2 = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        let lm1 = results.multiHandLandmarks[0];
        
        // Inversión horizontal (1.0 - x) para emparejar con el dataset de entrenamiento
        let w1_x = 1.0 - lm1[0].x;
        let w1_y = lm1[0].y;
        let pt9_x = 1.0 - lm1[9].x;
        let dist1 = Math.hypot(pt9_x - w1_x, lm1[9].y - w1_y) || 1.0;

        lm1.forEach(pt => {
            let px = 1.0 - pt.x;
            mano1.push((px - w1_x) / dist1, (pt.y - w1_y) / dist1);
        });

        if (results.multiHandLandmarks.length > 1) {
            let lm2 = results.multiHandLandmarks[1];
            let w2_x = 1.0 - lm2[0].x;
            let w2_y = lm2[0].y;
            let pt9_2x = 1.0 - lm2[9].x;
            let dist2 = Math.hypot(pt9_2x - w2_x, lm2[9].y - w2_y) || 1.0;

            lm2.forEach(pt => {
                let px = 1.0 - pt.x;
                mano2.push((px - w2_x) / dist2, (pt.y - w2_y) / dist2);
            });
        } else {
            mano2 = new Array(42).fill(0.0);
        }
    } else {
        mano1 = new Array(42).fill(0.0);
        mano2 = new Array(42).fill(0.0);
    }

    return [...mano1, ...mano2];
}

// VOZ EN ESPAÑOL
function reproducirVoz(texto, esLecturaCompleta = false) {
    window.speechSynthesis.cancel();
    let textoAjustado = esLecturaCompleta ? texto.toLowerCase() : texto;
    const utterance = new SpeechSynthesisUtterance(textoAjustado);
    utterance.lang = 'es-ES';
    utterance.rate = esLecturaCompleta ? 0.9 : 1.1;
    window.speechSynthesis.speak(utterance);
}

// BOTONES DE INTERFAZ
function agregarLetraDetectada() {
    if (letraCandidata) {
        sentenceText += letraCandidata;
        const box = document.getElementById('sentence-display');
        if (box) box.textContent = sentenceText;
        reproducirVoz(letraCandidata);
    }
}

function agregarEspacio() {
    sentenceText += " ";
    const box = document.getElementById('sentence-display');
    if (box) box.textContent = sentenceText;
}

function borrarPalabra() {
    let words = sentenceText.trim().split(" ");
    words.pop();
    sentenceText = words.join(" ") + (words.length > 0 ? " " : "");
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
    if (sentenceText.trim()) reproducirVoz(sentenceText, true);
}