# Plan de rediseno: Israel Valencia

Estado: implementado y verificado. El analisis original se conserva como referencia; el resultado y las pruebas se documentan en [design-qa.md](/Users/israelvalencia/Downloads/Portfolio1-main/design-qa.md).
Revision de alcance: conservar TODOS los contenidos, textos y funciones de la pagina actual; adaptar su presentacion al lenguaje visual de la referencia.
Fecha: 2026-10-05.
Referencia: [Minifolio 001](https://minifolio001.framer.website/).

## 1. Direccion visual

La referencia usa fondo blanco, texto negro, tipografia sans serif y grandes espacios vacios. Las imagenes aportan el color. Su identidad aparece arriba a la izquierda en dos lineas; el menu circular gris esta arriba a la derecha. La rueda es la experiencia principal, no una ilustracion que acompana a un titular.

La composicion de la rueda es tridimensional: planos verticales distribuidos alrededor de un anillo horizontal, visto desde una camara elevada. La perspectiva produce una elipse, profundidad, solapamientos y variaciones de escala. No se reproduce fielmente con un carrusel plano ni con tarjetas posicionadas en un circulo CSS.

Adaptacion propuesta: identidad visible "Israel Valencia", presentacion completa de la pagina actual, rueda con los proyectos reales de Notion y una interfaz editorial discreta. Sustituir SOLO el tratamiento decorativo del hero actual, no sus textos ni sus llamadas a la accion. Omitir la cinta comercial "Buy This Template", los textos de estudio, los proyectos de ejemplo y el formulario/mapa de la plantilla.

![Rueda de referencia en escritorio](/Users/israelvalencia/.codex/visualizations/2026/10/05/01a10c92-50ab-7fc3-b5f0-06a181e91c99/minifolio-analysis/01-desktop-wheel.jpg)

## 2. Recorrido auditado

| Paso | Observacion y estado general | Implicacion para nuestra web |
| --- | --- | --- |
| Portada, escritorio 1440 x 900 | Composicion clara y memorable; el proyecto depende casi completamente de sus imagenes. | Mantener rueda central y espacio libre; mostrar nombre y disciplina del proyecto seleccionado. |
| Scroll sobre portada | Cambia la orientacion de la rueda; la pagina permanece en la misma posicion vertical. | No bloquear el scroll vertical: nuestra pagina necesita secciones debajo. |
| Hover sobre proyectos | Aparece una miniatura y el titulo abajo a la derecha. Buena identificacion contextual, pero depende del puntero. | Preview equivalente en escritorio y ficha visible debajo de la rueda en movil. |
| Seleccion de proyecto | Abre una pagina de detalle. Al intentar arrastrar tambien se abrio un proyecto. | Separar clic de arrastre mediante un umbral de movimiento. La inercia de arrastre de la referencia no quedo verificada. |
| Detalle | Texto y metadatos compactos, imagenes grandes y scroll convencional. La identidad negra pierde contraste sobre algunas imagenes oscuras. | Conservar los destinos existentes; no crear casos de estudio locales en esta fase. Evitar cabecera sin contraste sobre fotos. |
| Menu | Boton circular que pasa de dos lineas a una X; enlaces pequenos apilados debajo, sin overlay de pantalla completa. | Menu compacto con anclas a las secciones reales y cierre al seleccionar o pulsar Escape. |
| Index | Tabla compacta con separadores finos y filtros de Year/Category. Category redujo los resultados de 9 a 4 al seleccionar Brand Strategy. | La referencia SI tiene filtro en Index; el filtro de disciplina se debe incorporar a nuestra rueda. |
| About | Parrafo estrecho centrado y mucho espacio libre. Jerarquia tranquila, adecuada para lectura breve. | Aplicar esa sobriedad a la biografia de Notion, dentro de la misma pagina. |
| Contact | Collage de papeleria, formulario y mapa. Expresivo, pero responde a otro negocio. No se envio el formulario. | Usar los contactos reales: correo, WhatsApp y LinkedIn. No agregar un formulario sin servicio de envio. |
| Movil 390 x 844 | Rueda escalada al ancho y menu vertical. Las miniaturas son pequenas. | Ajustar tamano, vista seleccionada, controles tactiles y filtros sin solapamientos. |

Limites del analisis: inspeccion visual y DOM de la web publicada. No se inspecciono su codigo privado ni se midieron curvas/duraciones exactas. La vista movil fue una emulacion de viewport, no una prueba tactil en dispositivo real. No es una auditoria completa de accesibilidad. En el estado inicial observado, las fichas del canvas no tenian enlaces de proyecto navegables en el DOM.

### Evidencias adicionales

![Hover y preview del proyecto](/Users/israelvalencia/.codex/visualizations/2026/10/05/01a10c92-50ab-7fc3-b5f0-06a181e91c99/minifolio-analysis/02-wheel-scroll.jpg)

![Detalle con imagenes grandes y contraste de cabecera a resolver](/Users/israelvalencia/.codex/visualizations/2026/10/05/01a10c92-50ab-7fc3-b5f0-06a181e91c99/minifolio-analysis/04-project-detail.jpg)

![Index; captura durante su transicion de entrada, no del resultado filtrado](/Users/israelvalencia/.codex/visualizations/2026/10/05/01a10c92-50ab-7fc3-b5f0-06a181e91c99/minifolio-analysis/06-project-index.jpg)

![Composicion de About](/Users/israelvalencia/.codex/visualizations/2026/10/05/01a10c92-50ab-7fc3-b5f0-06a181e91c99/minifolio-analysis/08-about.jpg)

![Composicion de Contact](/Users/israelvalencia/.codex/visualizations/2026/10/05/01a10c92-50ab-7fc3-b5f0-06a181e91c99/minifolio-analysis/09-contact.jpg)

![Portada en movil](/Users/israelvalencia/.codex/visualizations/2026/10/05/01a10c92-50ab-7fc3-b5f0-06a181e91c99/minifolio-analysis/10-mobile-wheel.jpg)

![Menu abierto en movil](/Users/israelvalencia/.codex/visualizations/2026/10/05/01a10c92-50ab-7fc3-b5f0-06a181e91c99/minifolio-analysis/11-mobile-menu.jpg)

## 3. Estructura propuesta

1. Cabecera: identidad Israel Valencia, selector ES/EN y menu circular. Conservar las entradas Disciplinas, Proyectos, Sobre mi, Portafolios y Conectemos; sumar acceso al grid de fotos.
2. Apertura integrada con la rueda: Product Design, saludo, nombre, introduccion completa, Ver proyectos, Contactar e indicador de exploracion. Texto compacto en el layout abierto, sin tarjeta ni hero separado que empuje los proyectos fuera de la primera pantalla.
3. Disciplinas y proyectos: conservar ambos encabezados, etiquetas y textos introductorios en un bloque integrado. Filtros, contadores, rueda y ficha del proyecto seleccionado. Selector con iconos para alternar Rueda/Indice, con nombres accesibles y tooltips. Mantener las anclas `#disciplines` y `#projects`.
4. Conoceme: cuatro parrafos completos, cita, cuatro estadisticas y ficha personal con estudios, carrera, ubicacion y enfoque. Columna de lectura y columna secundaria de datos; ambas apiladas en movil.
5. Fotos: grid de la database, asociado a Conoceme como en la pagina actual, con todas las imagenes y textos alternativos, conservando proporciones y sin recortes destructivos.
6. Mas portafolios: encabezado, introduccion, los dos titulos, descripciones completas, URLs visibles e iconos de enlace externo.
7. Contacto: encabezado, los tres parrafos actuales y enlaces de WhatsApp, LinkedIn y Email, conservando sus textos secundarios.
8. Footer: copyright, identidad, enlaces Inicio/Proyectos/Contacto y mensaje de cierre completo.

Las secciones seran bandas o layouts abiertos, no tarjetas flotantes. La primera pantalla mostrara la rueda y una pista de la siguiente seccion. Los filtros quedaran fuera del anillo y del preview, nunca superpuestos sobre las portadas. En movil podran envolver en varias lineas sin cortar etiquetas.

### 3.1. Regla de conservacion editorial

El rediseno cambia composicion, tipografia, color, iconografia y movimiento; NO es una simplificacion del contenido. No borrar, resumir, sustituir ni reescribir textos para parecerse a la plantilla. Se permite cambiar escala tipografica, saltos de linea y posicion, conservando el texto completo, sus enfasis y su significado. Un cambio editorial posterior necesita una indicacion explicita del usuario.

Fuentes locales de inventario: [pagina actual](/Users/israelvalencia/Downloads/Portfolio1-main/index.html:1076), [textos ES/EN](/Users/israelvalencia/Downloads/Portfolio1-main/index.html:1343), [datos de proyectos y fotos](/Users/israelvalencia/Downloads/Portfolio1-main/portfolio-data.js) y [elementos generados](/Users/israelvalencia/Downloads/Portfolio1-main/portfolio.js). Esos textos son la referencia exacta, incluidas tildes, signos, enfasis, simbolos y ambas traducciones; las etiquetas sin tildes de este documento no sustituyen el copy original.

### 3.2. Mapa completo de elementos y textos

| Elemento actual | Contenido que se conserva | Adaptacion y destino |
| --- | --- | --- |
| Identidad y navegacion | Israel Valencia; `nav_disciplines`, `nav_projects`, `nav_about`, `nav_portfolios`, `nav_cta`; destinos de anclas. | Identidad arriba a la izquierda y menu circular con TODOS los accesos. Los iconos decorativos pueden convertirse en iconos coherentes con el nuevo sistema, sin perder su funcion. |
| Idiomas | ES/EN, todas las traducciones de `translations.es` y `translations.en`, atributos de idioma y estados de botones. | Control discreto y siempre utilizable; no se pierde filtro ni seleccion al alternar. |
| Presentacion | `hero_badge`, `hero_greeting`, Israel Valencia, `hero_intro`, incluido su enfasis en mis trabajos y proyectos. | Franja editorial compacta por encima de la rueda, en el mismo espacio abierto. La rueda sigue siendo el elemento visual dominante. |
| Acciones de apertura | `hero_cta_primary`, `hero_cta_secondary`, destinos Proyectos/Contacto e icono de flecha. | Enlaces visibles Ver proyectos y Contactar, conservando su texto. No reemplazarlos exclusivamente por iconos. |
| Indicador de exploracion | `hero_scroll` y senal visual de continuidad. | Mantener texto y adaptar la linea animada a una senal discreta para las secciones inferiores, con alternativa reduced motion. |
| Disciplinas | `disc_label`, `disc_title`, `disc_sub`, `disc_all`; nombres de la database, conteos, seleccion y resumen dinamico de resultados. | Encabezado compacto Lo que hago/Disciplinas, descripcion completa y filtros junto a la rueda. Conservar el estado anunciado por `filter-hint`. |
| Proyectos: encabezado | `proj_label`, `proj_title`, `proj_sub` y mensaje `noscript`. | Mantener Mi trabajo/Proyectos y su descripcion; la organizacion por disciplinas se refleja en orden y alternativa DOM. Conservar el mensaje sin JavaScript y plantear listado estatico de respaldo. |
| Cada proyecto | Nombre, descripcion completa disponible en cada idioma, anos, todas las disciplinas/tags, portada o nombre en ausencia de portada, URL y estado de destino. | Rueda con portada; ficha seleccionada con TODO el contenido textual. Indice DOM con el mismo contenido accesible, no solo nombre/ano. Nada se elimina porque no quepa dentro del canvas. |
| Agrupaciones | Nombres de grupos, cantidades, orden de disciplinas y grupo de proyectos sin disciplina conocida si existe. | Rueda ordenada por grupos sin duplicar entidades; indice agrupado conserva los encabezados y proyectos multidisciplina cuando corresponde. Diferenciar total unico y cantidades por grupo. |
| Estados de proyecto | Texto de enlace pendiente y estado deshabilitado si una futura importacion carece de destino; enlace externo e indicacion visual de apertura. | No mostrar pendiente en proyectos ya corregidos, pero conservar el comportamiento para datos incompletos futuros. |
| Conoceme: encabezado | `about_label`, `about_title`. | Sobre mi/CONOCEME como encabezado editorial de la seccion completa. |
| Biografia | `about_p1`, `about_p2`, `about_p3`, `about_p4`, con sus partes en `strong`. | Conservar los cuatro parrafos enteros: mudanzas y realidades del pais; exploracion digital; proposito de mejorar experiencias; incursiones en Product Design, estudios y aprendizaje. No reducirlos a un parrafo como About en la referencia. |
| Estadisticas | `stat_projects` con contador dinamico; `stat_disciplines` con contador dinamico; `stat_years` con valor actual 4; `stat_learning` con simbolo infinito. | Banda de cuatro datos sin tarjetas anidadas. Mantener etiquetas y valores actuales; no reinterpretar anos ni retirar el dato de aprendizaje. |
| Cita personal | `about_quote`, texto completo y enfasis en convergencia entre mundo digital y humano. | Cita tipografica visible junto a la biografia o despues de ella; no sustituir por copy de la plantilla. |
| Ficha personal | `info_studies`: Universidad de Lima; `info_degree`: Comunicaciones; `info_location`: Peru; `info_focus`: Product Design; etiquetas e iconos. | Lista editorial de cuatro filas, con iconos del nuevo sistema y contenido completo. Mantener valores y comportamiento actual entre idiomas; no inventar traducciones de datos. |
| Fotos | Todos los items de `pictures`: orden, archivo, texto alternativo por idioma y enlace a imagen original. | Grid integrado despues de biografia/datos; conservar apertura de imagen y no inventar leyendas que Notion no aporta. |
| Mas portafolios: encabezado | `port_label`, `port_title`, `port_sub`. | Mantener Mas trabajo/Mas Portafolios y descripcion completa. |
| Portafolio Product | `port1_title`, `port1_desc`, URL visible `iv-portafolio-1-1.webflow.io`, destino completo e icono. | Enlace editorial con titulo, descripcion completa y URL, no un boton generico sin contexto. |
| Portafolio Visual | `port2_title`, `port2_desc`, identificador visible Canva/Visual Design, destino completo e icono. | Segundo enlace con todo su contenido, misma jerarquia que Product. |
| Contacto: copy | `contact_label`, `contact_title`, `contact_p1`, `contact_p2`, `contact_p3`. | Conservar Hablemos/CONECTEMOS y los tres parrafos completos: proyecto/colaboracion, oportunidades y desafios, invitacion a escribir. Mantener los signos y simbolos del copy original. |
| WhatsApp | Nombre, `contact_wa_sub`, flecha e `https://wa.me/51987729841`. | Enlace icono+texto, con Escribeme directo y destino intacto. |
| LinkedIn | Nombre, `contact_li_sub`, flecha e `https://www.linkedin.com/in/israel-valencia/`. | Enlace icono+texto, con Conectemos profesionalmente y destino intacto. |
| Email | Nombre, `contact_mail_sub`, flecha y `mailto:israval2000@gmail.com`. | Enlace icono+texto, con Enviame un correo y destino intacto. |
| Footer | Copyright 2026 Israel Valencia / Portfolio; `footer_home`, `nav_projects`, `footer_contact`, `footer_made`, incluidos simbolos originales. | Footer completo adaptado a la nueva tipografia; no reemplazarlo por un cierre sin textos. |
| Documento y accesibilidad | Titulo del documento, charset, viewport, idioma, textos alternativos, nombres accesibles, foco y estados de controles. | Mantener identidad y metadata; verificar que la reorganizacion no rompa semantica, destinos ni lectura asistida. |
| Animaciones e iconografia actuales | Funciones de orientacion, foco, feedback de enlaces, flechas, iconos tematicos y contraste. | Reinterpretar con el nuevo sistema. El canvas de esfera/anillos/particulas, overlays oscuros, gradientes y tratamientos neon se sustituyen por rueda, fondo blanco y motion sobrio; no se agregan esos adornos a la nueva composicion. |

### 3.3. Composicion que resuelve contenido + rueda

- Escritorio: identidad/menu arriba; saludo, nombre, especialidad, introduccion y acciones en una franja compacta; rueda central amplia; textos de Disciplinas/Proyectos, filtros y ficha sin solaparse. No dividir el hero en una tarjeta de texto y otra de media.
- Movil: presentacion, acciones, rueda, filtros y ficha en flujo vertical. Priorizar legibilidad sobre forzar todos los textos dentro de un unico viewport. No ocultar contenido con `display: none` para ganar espacio.
- Debajo: Conoceme completo, estadisticas, cita, ficha personal y fotos; luego Mas Portafolios, Contacto y Footer. Esta secuencia conserva la relacion y orden de las secciones actuales.
- Preview del proyecto: nombre, anos y tags como primera lectura; descripcion completa en un panel DOM sin limite editorial de caracteres. El indice ofrece ademas acceso a todos los proyectos y sus contenidos sin depender de la rueda.

## 4. Contrato con Notion

Notion sigue gobernando los datos y contenido de perfil, proyectos, disciplinas y fotos. Los textos editoriales y controles ya presentes en la pagina actual tambien se conservan, aunque no sean propiedades de Notion; no se pierden por refrescar las databases. Fuentes:

- [Perfil y contenido](https://app.notion.com/p/029af8f94f1182f1a53101138f733f1c).
- [Proyectos](https://app.notion.com/p/353af8f94f11836eb47d817bf759c58a).
- [Disciplinas y orden](https://app.notion.com/p/ac4af8f94f11823ab210817de63e7818).
- [Fotos](https://app.notion.com/p/3f0af8f94f1180e8a8bed8d1bf6fd44b).

El snapshot local actual contiene 16 proyectos, 4 disciplinas visibles, 14 portadas y 3 fotos. Antes de implementar se volvera a consultar Notion para incorporar cambios. La web actual usa un snapshot, no sincronizacion automatica en vivo; este rediseno no implica agregarla ni exponer credenciales en el navegador.

Reglas:

- Opciones: Todos, Product Design, Branding, Visual y AI Vibecoding, en el orden de la database. Usar IDs de relaciones para filtrar, no coincidencias de nombres.
- Un proyecto con varias disciplinas aparece al seleccionar cualquiera de ellas. Llama Academy sigue perteneciendo a Product Design y AI Vibecoding.
- Todos muestra proyectos unicos, ordenados por la primera disciplina aplicable en el orden de la database; dentro de cada grupo conservar el orden importado. La rueda no duplica proyectos para aparentar mas resultados.
- Aquatica conserva su relacion Data and BI: aparece en Todos, al final, mientras esa disciplina no figure en la database visible de filtros. No excluirlo silenciosamente ni inventar un filtro.
- Contadores actuales: Product Design 9, Branding 3, Visual 5, AI Vibecoding 2. Se calculan desde los datos, no se fijan en el HTML. Su suma puede superar 16 por proyectos multidisciplina.
- Cada plano usa la portada real del item. Las imagenes se mantienen en archivos locales para evitar URLs temporales caducadas de Notion.
- Aquatica y Neoconsulting - Video IA no tienen portada en el snapshot actual: revisar nuevamente Notion. Si siguen sin ella, mostrar una ficha tipografica con su nombre, sin inventar una imagen ni ocultar el proyecto.
- Pagina con contenido: abrir el enlace del item de Notion. Pagina vacia: abrir la propiedad URL. Mantener la validacion de protocolos y la apertura segura de enlaces.
- Reebok Green y Llama Academy ya tienen URLs corregidas. No quedan enlaces pendientes en el snapshot actual.
- Mantener las traducciones y el filtro seleccionado al cambiar idioma.

## 5. Interacciones y animaciones propuestas

Estas son decisiones de implementacion; no valores medidos del sitio de referencia.

- Rueda con Three.js: planos con texturas, camara en perspectiva inclinada y seleccion por raycasting. Marcos estables; segun el ajuste posterior solicitado, la portada cubre toda la card con recorte centrado y sin deformacion.
- Arrastre horizontal con suavizado e inercia moderada. Umbral de movimiento para impedir que un arrastre abra un enlace. El clic o tap sin arrastre abre el destino correspondiente.
- Scroll vertical normal en toda la pagina. No capturar la rueda vertical del raton para girar el anillo. El arrastre y las flechas de rotacion ofrecen una interaccion explicita compatible con las secciones inferiores.
- En tactil, conservar el desplazamiento vertical con `touch-action: pan-y`; cancelar correctamente el gesto cuando el navegador toma el scroll.
- Hover: identificacion del proyecto, cursor de enlace, aumento suave de luminosidad y halo perimetral que se desvanece al salir. En movil, ficha persistente del proyecto seleccionado con enlace real; no depender del hover.
- Filtrado: reorganizar suavemente los proyectos, actualizar contador y limpiar una seleccion que ya no corresponda. Tres o dos resultados usan una disposicion abierta; uno usa una ficha frontal; cero tiene estado vacio.
- Menu: transicion de icono y aparicion breve de enlaces. Controles: objetivo inicial de 200-350 ms; reorganizacion de rueda: 500-700 ms. Ajustar tras observar el prototipo.
- Evitar rotacion automatica continua por defecto. No animar decoracion independiente de los proyectos.
- `prefers-reduced-motion`: sin inercia ni transiciones espaciales intensas, con alternativa de indice disponible.

## 6. Implementacion por fases

1. **Inventario y datos.** Guardar una linea base de TODOS los textos ES/EN, valores fijos, elementos dinamicos, assets, anclas y enlaces de la pagina actual. Refrescar las cuatro fuentes sin sobrescribir copy editorial local. Completar una matriz origen/destino/verificado para cada fila del mapa anterior.
2. **Base visual y apertura completa.** Definir tipografia, cabecera, espaciado y paleta blanca/negra/gris. Retirar solo la decoracion del hero y ubicar saludo, nombre, especialidad, introduccion, ambas acciones y senal de exploracion junto a la rueda.
3. **Prototipo de rueda.** Construir geometria, camara, texturas y encuadre con los proyectos reales. Verificar escritorio y movil antes de agregar pulido.
4. **Filtros y navegacion.** Compartir un estado de filtro entre rueda e indice; conservar encabezados e introducciones, aplicar orden de disciplinas, enlaces, previews con descripciones completas, arrastre y controles accesibles. Primer hito: apertura con su contenido completo, rueda y filtros plenamente funcionales.
5. **Secciones inferiores completas.** Adaptar los cuatro parrafos de biografia, cita, estadisticas, ficha personal, fotos, titulos/descripciones/URLs de portafolios, todos los textos y enlaces de contacto y footer. Desplazamiento vertical continuo y el orden definido en la estructura.
6. **Motion y rendimiento.** Ajustar suavizado, transiciones y estados de carga. Limitar pixel ratio, reutilizar texturas y liberar recursos. Pausar render cuando la rueda salga de pantalla o la pestana este oculta.
7. **Verificacion visual, funcional y editorial.** Probar filtros, proyectos multidisciplina, enlaces, idioma, teclado, tactil, reduced motion y fallback sin WebGL; revisar capturas y pixeles del canvas en varios tamanos. Comparar todos los textos y destinos con la linea base en ambos idiomas, no solo presencia de secciones.

Mantener HTML/CSS/JavaScript y la biblioteca Three.js existente; no hace falta migrar a React ni depender de Framer. Integrar la rueda en un archivo dedicado, por ejemplo `project-wheel.js`, y conservar el contrato de `portfolio-data.js`. Reutilizar la logica de datos y destinos de `portfolio.js`, separandola de la presentacion cuando sea necesario.

## 7. Criterios de aceptacion

- Se conservan todos los contenidos de la pagina actual y los datos/assets de Notion; ningun proyecto, copy o dato de contacto proviene de la plantilla.
- Cada fila del mapa de elementos tiene destino implementado y verificado. Ningun texto ES/EN desaparece o se resume por razones de layout. Conservar enfasis, signos, simbolos y valores fijos; los contadores dinamicos reflejan el snapshot actualizado.
- La apertura conserva saludo, nombre, especialidad, introduccion y ambas acciones. Conoceme conserva cuatro parrafos, cita, cuatro estadisticas y cuatro datos personales. Los dos portafolios mantienen descripcion y URL; Contacto mantiene sus tres parrafos y tres enlaces; Footer conserva todos sus textos y accesos.
- Nombre, descripcion completa, anos y todos los tags de cada proyecto estan disponibles en DOM. No basta con que existan en `portfolio-data.js` o dentro de una textura del canvas.
- Las anclas existentes y todos los enlaces siguen funcionando. Sin JavaScript hay un mensaje adecuado y el respaldo de contenidos se contempla sin depender de filtros de canvas.
- La rueda representa los proyectos unicos y conserva el orden por disciplinas. Filtrar coincide exactamente con las relaciones de Notion.
- Los enlaces de las paginas vacias abren URL; los demas abren el item. Un arrastre no dispara navegacion.
- Las fotos se muestran como grid y los contactos son utilizables. Se llega a ellos con scroll convencional.
- El canvas es visible, correctamente encuadrado y responde a la interaccion; todas las texturas esperadas cargan. Comprobar capturas y pixeles, no solo ausencia de errores de JavaScript.
- Revisar al menos 1440 x 900, 820 x 1180, 390 x 844 y 320 x 700: sin overflow, etiquetas cortadas, solapamientos ni controles que cambien de tamano.
- Navegacion por teclado con foco visible; menu con estado accesible; filtros con estado seleccionado; enlaces reales en la vista Indice. Las flechas permiten seleccionar/rotar y Enter abrir.
- Sin WebGL o con error de carga, queda una vista DOM utilizable. Reduced motion no impide acceder a ningun proyecto.
- No se pierde el filtro al cambiar idioma ni se siguen renderizando frames innecesarios fuera de la rueda.

## 8. Alcance del siguiente entregable

Primero: apertura con TODOS sus textos y acciones, rueda con portadas reales, encabezados de disciplinas/proyectos, filtro y destinos correctos, dentro de la nueva composicion. Despues: integracion completa de biografia, estadisticas, cita, ficha, fotos, portafolios, contacto y footer, seguida de verificacion editorial ES/EN y funcional. Los hitos pueden construirse por fases, pero el rediseno no se considera terminado hasta conservar cada elemento del inventario. No se propone recrear las paginas de detalle de Framer ni agregar un CMS o formulario nuevos.

## 9. Resultado de ejecucion

Las fases anteriores estan implementadas. Se preservaron las 51 claves de texto originales de cada idioma y todos los elementos del inventario. Hay rueda 3D, filtros, indice agrupado, ficha completa del proyecto, cabecera/menu, biografia/cita/estadisticas/datos personales, tres fotos, portafolios, contactos y footer.

Actualizacion de fuente respecto al snapshot de este plan: Aquatica fue eliminado en Notion, por lo que ahora hay 15 proyectos activos, 14 portadas y 19 apariciones en el indice agrupado. Las cantidades por disciplina no cambian. El estado anterior queda en .verification; no se reactiva contenido que el usuario retiro de la fuente.

Verificacion: 7 pruebas automatizadas aprobadas, cuatro tamanos de viewport, controles/teclado/arrastre, clic a URL externa, fallback sin WebGL y estados uno/cero proyectos. Preview local disponible; no se ha publicado externamente.
