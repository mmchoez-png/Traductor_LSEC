# 🦅 Traductor LSEC — Asistente de Lengua de Señas Ecuatoriana

🌐 **Aplicación en vivo:** [https://mmchoez-png.github.io/Traductor_LSEC/](https://mmchoez-png.github.io/Traductor_LSEC/)

---

## 📖 Descripción del Proyecto

**Traductor LSEC** es una aplicación web educativa de diseño *Mobile-First* orientada al aprendizaje interactivo y la traducción en tiempo real de la **Lengua de Señas Ecuatoriana (LSEC)**. 

El sistema integra visión artificial 3D e inteligencia artificial ejecutada directamente en el navegador (*Edge AI* mediante **MediaPipe Hands** y **ONNX Runtime Web**), lo que permite reconocer configuraciones manuales desde la cámara del dispositivo sin enviar video a servidores externos. Acompañado por la identidad visual del **Cóndor Andino** como guía pedagógico, el aplicativo combina un traductor dactilológico en vivo con formación de palabras, corrección ortográfica automática, síntesis de voz en español y un módulo de tarjetas didácticas animadas en 3D para reforzar el vocabulario cotidiano.

---


## 🎯 Objetivos

### Objetivo General
Facilitar el aprendizaje autónomo y la comunicación inclusiva entre personas sordas y oyentes mediante una plataforma web accesible, gratuita y ejecutada en tiempo real para el reconocimiento y práctica de la Lengua de Señas Ecuatoriana (LSEC).

### Objetivos Específicos
* **Traducción en Tiempo Real (Edge AI):** Interpretar las señas del abecedario LSEC desde la cámara web utilizando extracción geométrica 3D de 85 características espaciales con baja latencia y total privacidad.
* **Aprendizaje Visual e Interactivo:** Brindar material didáctico mediante cartas giratorias 3D (*flashcards*) organizadas por categorías (abecedario, conversación y preguntas) con guías posturales y apoyo auditivo.
* **Asistencia Comunicativa Integral:** Permitir la construcción de palabras y oraciones con corrección léxica automática (distancia de Levenshtein) y lectura en voz alta en español (`es-ES`).
* **Accesibilidad Multiplataforma:** Ofrecer una interfaz moderna, ligera y responsiva adaptable a teléfonos móviles y computadoras, con arquitectura modular preparada para futuras expansiones de vocabulario dinámico.

---

## 🧩 Módulos del Sistema

* **Inicio (`index.html`):** Pantalla principal de bienvenida con acceso directo a los módulos y guía rápida de uso.
* **Traductor en Vivo (`abecedario.html`):** Visor con detección de mano en tiempo real, indicador de confianza, pizarra de construcción de oraciones y lectura por voz.
* **Cartas Animadas 3D (`cartas.html`):** Mazos de estudio interactivos con animación de giro, vista de lista, pronunciación y seguimiento de progreso local.
* **Escenario de Prueba Avatar (`avatar_test.html`):** Entorno de validación y verificación del abecedario LSEC corregido.

---

## 📂 Estructura del Proyecto

```text
Traductor_LSEC/
├── css/
│   ├── avatar.css           # Estilos del escenario de prueba del avatar
│   ├── cartas.css           # Estilos de las tarjetas giratorias 3D
│   ├── home.css             # Estilos de la pantalla de bienvenida
│   ├── navbar.css           # Estilos de la barra de navegación inferior
│   └── traductor.css        # Estilos del visor HUD y pizarra en vivo
├── images/
│   └── condor_logo.jpg      # Avatar guía del Cóndor Andino
├── index.html               # Pantalla de inicio
├── abecedario.html          # Traductor en tiempo real con cámara e IA 3D
├── cartas.html              # Colecciones y cartas interactivas 3D
├── avatar_test.html         # Escenario de prueba de señas LSEC
├── style.css                # Base global, variables (:root) y tokens de diseño
├── app.js                   # Lógica MediaPipe, extractor 3D (85 features), ONNX, NLP y voz
├── navbar.js                # Clase BarraNavegacionLSEC (navegación compartida)
├── lsec_model.onnx          # Modelo neuronal entrenado para el abecedario LSEC
├── modelo_abecedario.json   # Metadatos y clases del modelo LSEC
├── package.json             # Configuración del proyecto
└── README.md                # Documentación del proyecto
