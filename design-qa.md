# Verificacion del rediseno

final result: passed

## Alcance y evidencia

Adaptacion de Minifolio 001, no clon literal: conservar todos los textos y funciones de la pagina actual, usar proyectos/disciplinas/fotos de Notion y agregar secciones inferiores con scroll normal.

- Referencia escritorio: [captura 1440 x 900](/Users/israelvalencia/.codex/visualizations/2026/10/05/01a10c92-50ab-7fc3-b5f0-06a181e91c99/minifolio-analysis/01-desktop-wheel.jpg).
- Implementacion escritorio: [captura final 1440 x 900](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/desktop-final.jpg).
- Referencia movil: [captura 390 x 844](/Users/israelvalencia/.codex/visualizations/2026/10/05/01a10c92-50ab-7fc3-b5f0-06a181e91c99/minifolio-analysis/10-mobile-wheel.jpg).
- Implementacion movil: [captura final 390 x 844](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/mobile-final.jpg).
- Capturas adicionales: [tablet 820 x 1180](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/tablet-820.jpg), [320 x 700](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/mobile-320.jpg), [biografia movil](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/mobile-about.jpg), [fotos](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/desktop-photos.jpg), [contacto](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/desktop-contact.jpg).
- Comparacion focal: [cabecera de referencia](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/reference-header.jpg) y [cabecera implementada](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/portfolio-header.jpg).

Las referencias y las capturas finales se abrieron juntas en el mismo input de comparacion y se inspeccionaron los archivos guardados. Estado de comparacion principal: portada, rueda, todos los proyectos, menu cerrado, idioma ES. Los pares escritorio/movil usan el mismo viewport y pixeles CSS; imagenes a densidad 1, sin reescalado para comparar. La region focal de cabecera excluye la cinta comercial de la referencia; alturas distintas intencionales, no una comparacion pixel a pixel.

La captura full-page sirve solo para inventariar las secciones inferiores: el canvas puede quedar vacio al capturar toda la pagina debido al proceso de captura/offscreen. Las capturas normales de viewport y sus comprobaciones de pixeles son la evidencia del render 3D. No se usa la imagen full-page para declarar que el canvas funciona.

## Hallazgos y correcciones

No quedan hallazgos P0/P1/P2 accionables en el alcance revisado.

| Iteracion | Hallazgo anterior | Correccion | Evidencia posterior |
| --- | --- | --- | --- |
| 1 | P1: rueda demasiado pequena y tarjetas orientadas como una banda tangencial. | Planos radiales, camara reencuadrada por limites proyectados y proporciones de textura correspondientes a la geometria. | desktop-final.jpg; referencia y resultado comparados en 1440 x 900. |
| 2 | P1: reemplazar el icono del menu hacia que el mismo clic cerrara el menu al propagarse. | Cierre exterior basado en composedPath. | Apertura con seis destinos, cierre con Escape y seleccion de anclas probados. |
| 3 | P2: imagenes espejadas en el reverso de algunas tarjetas. | Dos caras FrontSide con UV coherentes y raycasting recursivo. | Captura final sin texto espejado; clic sobre Llama Academy abre el destino correcto. |
| 4 | P2: retorno al inicio y navegacion de secciones con cabecera persistente. | Ancla home en body; cabecera sticky opaca y scroll-padding. | Regreso al inicio comprobado; fotos y contacto accesibles sin perder menu ni contraste. |

## Superficies visuales

- **Tipografia:** sans serif de sistema con fallback Arial; identidad en dos lineas, pesos contenidos, encabezados compactos y espaciado entre letras 0. Los cuatro parrafos de biografia permanecen completos y legibles. No hay copy truncado para imitar la referencia.
- **Composicion:** rueda abierta y sin marco decorativo, controles discretos y secciones editoriales con separadores. Filtros y descripciones no se superponen al canvas. Grid fotografico asimetrico en escritorio y una columna en movil.
- **Color:** blanco/negro/gris, con color aportado por los proyectos y swatches de disciplinas. Sin el neon, gradientes o esferas decorativas anteriores. Cabecera opaca para conservar contraste sobre fotos.
- **Imagenes:** portadas reales de Notion en archivos locales, sin URLs temporales en el frontend; proporcion de imagen conservada en texturas y DOM. Neoconsulting no tiene portada y conserva una ficha tipografica con su nombre, sin imagen inventada.
- **Copy:** las 51 claves originales de cada idioma se compararon por igualdad completa, incluidos markup/enfasis y simbolos. Se conservaron acciones, encabezados, biografia, cita, estadisticas, ficha, portafolios, contactos y footer. Descripciones, anos y todos los tags siguen disponibles en la ficha y el indice DOM.

Desviaciones intencionales: la referencia repite miniaturas y ofrece poco texto en portada. Aqui hay 15 proyectos unicos y todos los textos actuales, por lo que la rueda es menos densa y aparece mas abajo, especialmente en movil. No se duplica contenido ni se ocultan textos para rellenar el anillo o forzar un viewport. El scroll vertical no gira la rueda porque debe dar acceso a las demas secciones.

## Verificacion funcional

- Todos: 15 proyectos unicos; indice agrupado: 19 apariciones por relaciones multidisciplina. Product Design 9, Branding 3, Visual 5, AI Vibecoding 2.
- Filtros de rueda e indice coherentes; Llama Academy pertenece a Product Design y AI Vibecoding. Cambiar ES/EN conserva filtro y seleccion.
- URLs de paginas vacias validadas: Reebok Green abre Figma y Llama Academy abre su web. Se hizo clic sobre la portada de Llama Academy y se verifico la nueva pestana con https://llama-academy.vercel.app/; se cerro la pestana de prueba.
- Navegacion por flechas y teclado: Bulkmate -> Reebok Green -> DataSigners. Menu abre, cierra con Escape y ofrece los seis accesos.
- Arrastre en viewport movil cambia el canvas sin abrir pestanas. Comparacion de capturas: 13.267 pixeles cambiados en la region comprobada. El scroll sobre el canvas desplaza la pagina normalmente.
- Canvas no vacio: 38.636 pixeles de color en la region inicial de escritorio y 8.771 en la captura movil revisada. Se comprobaron portadas, encuadre y movimiento mediante capturas, no solo por ausencia de errores.
- Viewports revisados: 1440 x 900, 820 x 1180, 390 x 844 y 320 x 700; scrollWidth coincide con innerWidth, sin overflow horizontal.
- Las tres fotos cargan y sus enlaces y textos alternativos se conservan. WhatsApp, LinkedIn, email y ambos portafolios conservan destinos.
- Harness sin WebGL: se activa el indice, se deshabilita Rueda y siguen funcionando los filtros. Harness de un proyecto/disciplinas vacias: controles deshabilitados apropiadamente, estado vacio y movimiento reducido inmediato.
- Consola del sitio normal revisada: sin errores ni warnings. Render bajo demanda; se pausa fuera de pantalla y con pestana oculta, y libera recursos al salir.
- `node --test tests/portfolio.test.cjs`: 7 pruebas aprobadas. Sintaxis de los scripts comprobada.

## Datos y limites

Notion fue consultado de nuevo. Aquatica esta marcado deleted y no aparece en la vista de proyectos: se retiro del snapshot activo, conservando el estado anterior en .verification. Neoconsulting ahora tiene propiedad URL, pero su pagina contiene un video; se sigue abriendo Notion conforme a la regla solicitada. Las cuatro disciplinas y tres fotos permanecen.

No es una certificacion WCAG ni una prueba en un telefono fisico. Los gestos se probaron con entrada de puntero en viewport movil; reduced motion y ausencia de WebGL se comprobaron con harnesses de prueba, sin cambiar preferencias del sistema. No se recorrieron todos los sitios externos ni se envio ningun mensaje/formulario. Notion sigue siendo un snapshot importado, no sincronizacion en vivo.

## Cierre

Preview local: http://127.0.0.1:4173/. No se publico ni se desplego externamente. La web y las capturas finales estan listas para revision del usuario.

## Ajuste posterior: portadas y hover

- Las texturas de la rueda ahora usan cover: llenan 960 x 892 con recorte centrado, conservan proporcion y eliminan el padding blanco agregado. Los archivos originales y las demas galerias no se modifican.
- La card apuntada aumenta suavemente su luminosidad y muestra un halo perimetral. Se limpia al salir, apuntar al espacio vacio, cambiar de filtro, comenzar un arrastre o perder el foco. Las flechas del teclado ofrecen el mismo realce; reduced motion cambia el estado inmediatamente.
- El halo no participa en raycasting ni escribe profundidad; ambas caras conservan su orientacion legible. Se reutiliza la geometria y se libera el material adicional al destruir la rueda.
- `node --test tests/portfolio.test.cjs tests/project-wheel.test.cjs`: 11 pruebas aprobadas. Incluyen recorte horizontal/vertical sin deformacion, cambio y limpieza de hover, ausencia de intercepcion de clics y reduced motion. Sintaxis de project-wheel.js comprobada.
- Capturas revisadas: [rueda completa](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/wheel-cover-final.jpg), [card iluminada](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/covers-hover-final.jpg), [rueda movil](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/wheel-cover-mobile.jpg) y [hover en viewport movil](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/covers-hover-mobile.jpg).
- Verificacion de pixeles: 127.618 pixeles modificados en la region de hover; luminosidad media interior pasa de 57,85 a 66,09 (incluye el realce de escala). Canvas movil no vacio: 12.046 pixeles de color. En 390 x 844, scrollWidth = innerWidth = 390. Sin errores ni warnings en consola.

Resultado del ajuste: passed. El hover movil se verifica con puntero de raton en viewport pequeno, no implica hover en dispositivos tactiles. No se cambiaron contenido, orden, filtros, destinos ni fotografias.

## Ajuste posterior: footer y datos academicos

- Footer centrado en columna: copyright, navegacion y firma. Los tres centros coinciden con el viewport en escritorio (720 de 1440) y movil (160 de 320), con tolerancia inferior a 0,01 px.
- Valores solicitados por el usuario: `U. de Lima/ U. Pacifico` y `Comunicaciones / Ing. Industrial`. No se modifica el parrafo biografico.
- Verificado en 1440 x 900 y 320 x 700. En movil, las cuatro celdas de datos no desbordan y scrollWidth = innerWidth = 320. Las 11 pruebas siguen aprobadas.
- Evidencia: [footer centrado](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/footer-centered-mobile.jpg) y [datos actualizados](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/studies-update-mobile.jpg).

Resultado del ajuste: passed.

## Ajuste posterior: controles y selector de vista

- Selector de vista trasladado a la izquierda de la barra inferior. Flechas centradas directamente bajo la rueda; la ficha permanece a la derecha en escritorio y debajo en movil. Los centros de flechas/canvas coinciden: 720 px en escritorio, 195 px en movil y 160 px en 320 px de ancho.
- El selector esta fuera de wheel-view y sigue disponible en el indice. Flechas y ficha se ocultan en modo indice; cambiar filtro o idioma no vuelve a mostrar la ficha por error.
- Descripciones distintas para rueda/lista, en ES/EN, con role=tooltip y aria-describedby. Verificados hover real, foco de teclado, cierre con Escape y recuperacion del tooltip al volver a enfocar. El tooltip de lista ocupa x=58..259,45 en viewport de 320 px, sin desbordamiento.
- Se restringen los listeners a button[data-view], separando botones del estado data-view del contenedor. Se versiona la carga de portfolio.js para evitar reutilizar el script anterior.
- Pruebas de navegador: rueda -> indice (19 filas agrupadas) -> filtro AI Vibecoding (2 filas) -> EN -> rueda (01 / 02), conservando filtro. Flechas: Bulkmate -> Reebok Green -> Bulkmate. Sin errores ni warnings en consola.
- 13 pruebas Node aprobadas, incluida la relacion entre botones y descripciones accesibles en ambos idiomas. Sintaxis de portfolio.js comprobada.
- Canvas visible: 57.072 pixeles de color en la region de escritorio y 12.562 en movil. En 390 px y 320 px, scrollWidth coincide con innerWidth.
- Capturas: [hover y controles finales](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/navigation-hover-final.jpg), [movil](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/navigation-controls-mobile.jpg) y [tooltip a 320 px](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/navigation-tooltip-320.jpg).

Resultado del ajuste: passed.

## Ajuste posterior: encuadre de DataSigners

- Solo `bfeaf8f94f118273815f81f48a820cf3` usa `wheelCoverPosition` con alineacion derecha y centro vertical. El recorte incluye cabeza, torso y brazo de la persona, llena el plano y no modifica el archivo original. Todas las demas cards conservan su recorte centrado.
- 12 pruebas aprobadas, incluida una comprobacion del encuadre de esta portada y de que los demas proyectos no se desplazan. Sin errores ni warnings en consola.
- Resultado revisado en [escritorio](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/datasigners-crop-desktop.jpg) y [movil](/Users/israelvalencia/Downloads/Portfolio1-main/.verification/screenshots/datasigners-crop-mobile.jpg), con canvas visible y rostro/torso reconocibles.

Resultado del ajuste: passed.

## Revision responsive y mobile first

- Estilos movil por defecto y ampliaciones con `min-width: 601px`, `1001px` y `1550px`; sin breakpoints `max-width`.
- Anchos revisados en el navegador: 320, 390, 600, 601, 820, 1000, 1001, 1440 y 1920 px. Sin scroll horizontal ni textos desbordados en encabezados, parrafos, datos personales y enlaces de portafolio.
- Controles de idioma, filtros, selector de vista y flechas con dimensiones tactiles de al menos 44 px en movil. La regla `pointer: coarse` extiende los ajustes a tabletas tactiles. El canvas conserva `touch-action: pan-y`.
- Verificados filtro AI Vibecoding, indice, idiomas ES/EN y menu de contacto a 320 px; tres fotos locales cargadas y galeria de una columna a 390 px. Sin errores ni warnings de consola.
- Canvas visible: 11376 pixeles de color en la region de la rueda movil. Evidencias en `.verification/screenshots/mobile-first-wheel.jpg`, `mobile-first-photos.jpg`, `mobile-first-contact.jpg` y `mobile-first-desktop.jpg`.
- 14 pruebas automatizadas aprobadas, incluida una nueva comprobacion de viewport, breakpoints ascendentes y controles tactiles. Pruebas realizadas con viewports de navegador, no en dispositivos fisicos.

Resultado de la revision: passed.
