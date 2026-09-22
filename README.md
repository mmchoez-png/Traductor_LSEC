# Traductor_LSEC
# LSEC: Pipeline Automatizado de MLOps con UiPath y Python



Sistema automatizado de arquitectura MLOps diseñado para orquestar el ciclo de vida y reentrenamiento continuo de un modelo de Machine Learning aplicado al reconocimiento de Lengua de Señas (LSEC). Combina la potencia de **UiPath Studio** para la detección e orquestación basada en eventos de archivos, con un script CLI en **Python** para la ejecución del entrenamiento, versionamiento de artefactos y trazabilidad en logs.

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología | Rol en el Sistema |
| :--- | :--- | :--- |
| **Orquestador RPA** | UiPath Studio | Monitoreo del directorio de datos y disparador por eventos. |
| **Motor de ML** | Python 3.10+ | Ejecución del script `train_cli.py` y generación del modelo JSON. |
| **Gobierno / Storage** | Windows File System | Almacenamiento versionado (`D:\backups-LSEC`) y dataset local. |
| **Auditoría** | CSV Logging | Trazabilidad del historial de ejecuciones y marcas de tiempo. |

