/**
 * Clase BarraNavegacionLSEC
 * Renderiza la barra flotante con iconografía SVG temática
 * (Inicio, Traductor con visor de mano y Cartas 3D giratorias).
 */
class BarraNavegacionLSEC {
  constructor(opciones = {}) {
    this.rutas = opciones.rutas || [
      {
        id: 'inicio',
        href: 'index.html',
        texto: 'Inicio',
        coincidencias: ['', 'index.html'],
        svg: `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path class="nav-svg-fill" d="M3 10.5 12 3l9 7.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8.5Z" />
            <path d="M9.5 21v-6a2.5 2.5 0 0 1 5 0v6" />
          </svg>
        `
      },
      {
        id: 'traductor',
        href: 'abecedario.html',
        texto: 'Traductor',
        coincidencias: ['abecedario.html'],
        svg: `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 8V6a2 2 0 0 1 2-2h2" />
            <path d="M16 4h2a2 2 0 0 1 2 2v2" />
            <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
            <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
            <path class="nav-svg-fill" d="M10 11V8.2a.8.8 0 0 1 1.6 0V11m0-3.2a.8.8 0 0 1 1.6 0V11m0-2.4a.8.8 0 0 1 1.6 0v4.9a3.2 3.2 0 0 1-3.2 3.2h-.6a3.2 3.2 0 0 1-2.8-1.7l-1-1.8a.85.85 0 0 1 1.45-.88l.95 1.18V9.2a.8.8 0 0 1 1.6 0V11" />
          </svg>
        `
      },
      {
        id: 'cartas',
        href: 'cartas.html',
        texto: 'Cartas 3D',
        coincidencias: ['cartas.html', 'avatar_test.html'],
        svg: `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 6V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
            <rect class="nav-svg-fill" x="5" y="6" width="11" height="14" rx="2.5" />
            <path d="M8.5 12.5a2.2 2.2 0 0 1 3.6-1.6l.4.4" />
            <path d="M12.5 9.8v1.7h-1.7" />
            <path d="M12.5 13.5a2.2 2.2 0 0 1-3.6 1.6l-.4-.4" />
            <path d="M8.5 16.2v-1.7h1.7" />
          </svg>
        `
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

    const contenedor = document.querySelector('.app-container');
    if (contenedor) {
      contenedor.classList.add('app-container--with-nav');
    }

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
            <span class="nav-ico">${item.svg}</span>
            <span>${item.texto}</span>
          </a>
        `;
      })
      .join('');

    document.body.appendChild(nav);
  }
}

const barraLSEC = new BarraNavegacionLSEC();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => barraLSEC.renderizar());
} else {
  barraLSEC.renderizar();
}