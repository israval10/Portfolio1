# Portfolio de Israel Valencia

Sitio estatico con fichas independientes en `/proyectos/<id>/`. La portada, el texto y los archivos de las fichas se obtienen de la base de proyectos de Notion. Si una pagina no tiene bloques y su propiedad `URL` contiene un enlace, la card abre ese enlace externo.

## Sincronizacion automatica

1. Crea una integracion interna de Notion con permiso **Read content** y comparte con ella las bases **Proyectos** y **Disciplinas**. La integracion tambien debe poder leer las paginas de los proyectos y sus archivos.
2. En GitHub, abre `israval10/Portfolio1` > Settings > Secrets and variables > Actions. Agrega el token como secreto `NOTION_TOKEN`. No lo guardes en el repositorio ni lo pegues en una pagina web.
3. Opcional pero recomendado: en Vercel, crea un Deploy Hook para `main` y guarda su URL como secreto `VERCEL_DEPLOY_HOOK` en GitHub. La integracion Git de Vercel tambien puede desplegar el commit generado.
4. Publica `automation/sync-notion.yml` como `.github/workflows/sync-notion.yml` usando una credencial de GitHub con permiso `workflow`. La credencial actual del checkout no tiene ese permiso, por lo que el workflow aun no esta activo en GitHub.
5. Ejecuta una vez **Sync projects from Notion** desde la pestana Actions. Despues correra cada hora. GitHub puede demorar ejecuciones programadas y desactivar el workflow en repositorios publicos sin actividad durante 60 dias.

La tarea consulta la API oficial de Notion, pagina resultados y bloques, guarda portadas y archivos locales para evitar URL temporales, genera las fichas, actualiza el inventario de proyectos y crea un commit solo si algo cambio. Si una pagina queda vacia, la card vuelve a usar su propiedad `URL` y su ruta anterior redirige a ella. Los fallos de acceso a Notion detienen la tarea sin reemplazar las paginas actuales.

El contenido inicial de las fichas se genero a partir de la lectura disponible en `notion-seed.json`. Algunas imagenes y PDFs internos de Notion solo se incorporaran tras la primera sincronizacion autenticada. Las fichas siempre incluyen el enlace a la pagina original.

## Desarrollo

```sh
npm ci
npm run build:projects
npm test
python3 -m http.server 4174
```

Con `NOTION_TOKEN` configurado en el entorno, `npm run sync:notion` trae el contenido actualizado. El token nunca llega al navegador ni se escribe en los archivos generados.
