/**
 * Clase BarraNavegacionLSEC
 * Gestiona y conecta la barra de navegación inferior entre index.html,
 * abecedario.html y cartas.html sin duplicar código HTML.
 */
class BarraNavegacionLSEC {
  constructor(opciones = {}) {
    this.rutas = opciones.rutas || [
      {
        id: 'inicio',
        href: 'index.html',
        icono: '🏠',
        texto: 'Inicio',
        coincidencias: ['', 'index.html']
      },
      {
        id: 'traductor',
        href: 'abecedario.html',
        icono: '📷',
        texto: 'Traductor',
        coincidencias: ['abecedario.html']
      },
      {
        id: 'cartas',
        href: 'cartas.html',
        icono: '🃏',
        texto: 'Cartas 3D',
        coincidencias: ['cartas.html', 'avatar_test.html']
      }
    ];
  }

  obtenerArchivoActual() {
    const ruta = window.location.pathname;
    const archivo = ruta.substring(ruta.lastIndexOf('/') + 1).toLowerCase();
    return archivo || 'index.html';
  }

  esRutaActiva(item, archivoActual) {
    return item.coincidencias.includes(archivoActual);
  }

  renderizar() {
    const archivoActual = this.obtenerArchivoActual();

    // Asegurar margen inferior en el contenedor principal de la vista
    const contenedor = document.querySelector('.app-container');
    if (contenedor) {
      contenedor.classList.add('app-container--with-nav');
    }

    // Eliminar cualquier barra estática previa para evitar duplicados
    const barraPrevia = document.querySelector('nav.bottom-nav');
    if (barraPrevia) {
      barraPrevia.remove();
    }

    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('aria-label', 'Navegación principal');

    nav.innerHTML = this.rutas
      .map((item) => {
        const activa = this.esRutaActiva(item, archivoActual);
        return `
          <a href="${item.href}"
             class="bottom-nav-item ${activa ? 'active' : ''}"
             ${activa ? 'aria-current="page"' : ''}>
            <span class="nav-ico" aria-hidden="true">${item.icono}</span>
            <span>${item.texto}</span>
          </a>
        `;
      })
      .join('');

    document.body.appendChild(nav);
  }
}

// Inicialización automática al cargar cualquier pantalla
const barraLSEC = new BarraNavegacionLSEC();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => barraLSEC.renderizar());
} else {
  barraLSEC.renderizar();
}