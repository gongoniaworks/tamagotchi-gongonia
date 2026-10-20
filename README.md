# Tomagotchi de Gongonia — v0.2

Prototipo experimental de mascota virtual, creado con HTML, CSS y JavaScript sin dependencias externas.

## Incluye
- Pantalla de carga e inicio con Gonguito y créditos.
- Incubación visible: el huevo permanece en su nido durante 10 minutos.
- Después de la incubación, Gonguito vive 2 horas reales.
- Etapas visuales: recién nacido y bebé (gusanito bebé), adulto y viejo con lentes.
- Lápida con RIP al terminar el ciclo; tocarla regresa al inicio.
- Guarda la hora de inicio en el navegador, de modo que el ciclo sigue avanzando si se cierra la página.
- Melodía fantástica creada con Web Audio, en bucle y con botón para activarla o pausarla. No necesita un archivo de música externo.

## Archivos
- `index.html`: estructura de las pantallas.
- `styles.css`: diseño visual y animaciones.
- `app.js`: etapas de vida, reloj y música.

## Publicación
El proyecto se publica como sitio estático mediante Cloudflare Workers con la carpeta `public` como directorio de recursos. Los archivos de esa carpeta son los que debe servir la versión publicada.

**Versión:** 0.2 experimental.
