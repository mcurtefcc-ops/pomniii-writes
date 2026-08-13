# pomniii.writes

Publica un texto propio en Instagram, con su tarjeta diseñada, **cuando tú se lo
pides por Telegram**.

```
le escribes /post al bot
   │
   ├─→  coge el siguiente texto del banco, en orden
   ├─→  monta la tarjeta 1080x1350
   ├─→  la publica en Instagram
   └─→  te devuelve la tarjeta y el enlace al post
```

Órdenes del bot:

| Orden | Qué hace |
|---|---|
| `/post` | Publica ahora el siguiente texto |
| `/probar` | Te manda la tarjeta **sin publicar** nada |
| `/saltar` | Descarta el siguiente sin publicarlo |
| `/estado` | Cuántos textos quedan |

Todo corre en GitHub Actions: no necesitas el ordenador encendido, y el token de
Instagram se renueva solo cada mes.

> **Tarda unos minutos.** El bot se consulta cada 5 minutos, que es el intervalo
> mínimo del cron de GitHub, y Actions además retrasa las tareas cuando hay cola.
> Ninguna orden se pierde —Telegram las guarda hasta que alguien las recoge—,
> pero entre el `/post` y el post pueden pasar de 5 a 20 minutos. Para respuesta
> instantánea haría falta un webhook con URL pública siempre encendida.

> **El bot solo te obedece a ti.** Cualquiera puede encontrarlo y escribirle,
> así que se comprueba el `chat_id` en cada orden y las de cualquier otro chat se
> ignoran. Sin esa comprobación, un desconocido podría publicar en tu Instagram.

### Otros dos modos, si los quieres

- **Post diario automático a una hora fija:** descomenta el cron de
  `proponer.yml`. Se lanza a las 06:00 y 07:00 UTC y un guardián en el código
  descarta la que no toca, para que salga a las 08:00 de España tanto en verano
  como en invierno.
- **Con aprobación por botones:** cambia el comando de `proponer.yml` por
  `proponer --respetar-hora` y descomenta el cron de `recoger.yml`. La tarjeta
  llega con `✅ Publicar` · `⏭ Saltar` · `🔄 Otra` · `🚫 No usar nunca` y no sale
  hasta que pulsas.

**La numeración del post no depende del texto.** El `#` que sale en la tarjeta
es un contador de publicaciones: el primero que salga será el `#0001` aunque
antes hayas descartado veinte textos, y si rechazas el texto del `#2000`, el
sustituto sale también como `#2000`. Por eso no se usa el id del texto.

---

## Antes de empezar: dos avisos honestos

**El nombre.** Pomni es un personaje de *The Amazing Digital Circus*, propiedad
de Glitch Productions. Usar su nombre en el @ te da alcance prestado entre fans
de la serie, pero también es lo único de este proyecto que alguien podría
reclamar: Glitch puede pedir el cierre por marca, o Instagram suspenderla por
suplantación si parece oficial. Por eso el logo, la tipografía y todos los
textos son originales y no se parecen a los de la serie, y por eso la bio no
dice ni insinúa que la cuenta sea oficial. Si la cuenta crece, plantéate migrar
a un nombre propio antes de que crecer sea justo lo que te la juegue.

**La cuenta la creas tú.** No puedo registrar cuentas ni introducir contraseñas.
El paso 1 es tuyo; el resto lo hace este repositorio.

---

## Paso 1 · Crear la cuenta (5 min, lo haces tú)

Regístrate en Instagram con el usuario `pomniii.writes` y monta el perfil así:

| Campo | Qué poner | Por qué |
|---|---|---|
| **Foto** | `assets/avatar_monograma_1000.png` | Es el único de los tres logos que sigue siendo legible a 32 px, el tamaño que Instagram usa en los comentarios. |
| **Nombre** | `Frases y poesía cada día` | **El campo que más importa.** El buscador de Instagram indexa el Nombre, no el @. Repetir aquí "pomniii" desperdicia lo único que te trae visitas nuevas por búsqueda. |
| **Bio** | ver abajo | |

```
Textos que se quedan un rato contigo.
Uno nuevo cada día.
Guarda el que necesites hoy ↓
```

Genera los logos con:

```bash
python -m src.cli logos
```

Te deja en `assets/` tres avatares (`monograma`, `plumin`, `punto`) por si
quieres cambiar. El plumín luce mucho más en las stories, donde hay sitio.

---

## Paso 2 · Convertirla en cuenta Profesional

La API de Instagram **no funciona con cuentas personales**. No hay forma de
saltárselo.

Hazlo **desde la app del móvil**: la web esconde la mitad de estas opciones.
Y en este orden, porque el asistente de Instagram te pedirá la página.

1. **Crea la página de Facebook** en `facebook.com/pages/create`. Nombre
   `pomniii.writes`, categoría *Escritor*. Puede quedarse vacía para siempre:
   no vas a publicar en ella, existe solo porque Meta obliga a que la API pase
   por una página.
2. En Instagram: *Configuración y privacidad → Tipo de cuenta y herramientas →
   Cambiar a cuenta profesional* → categoría *Escritor* → tipo **Empresa**.
   Creador también funciona, pero Empresa tiene el soporte más completo de la
   API y ninguna contrapartida para una cuenta de textos.
3. **Vincula las dos.** El asistente de conversión te lo ofrece. Si te lo
   saltaste: *Editar perfil → Página*. Y si ahí no sale, desde la página de
   Facebook: *Configuración → Instagram vinculado → Conectar cuenta*.

Comprueba la vinculación con la API, no con la interfaz, porque la app dice
que sí antes de que lo esté:

```
GET /{id-de-la-pagina}?fields=instagram_business_account
```

Si devuelve un número, está hecho. Si devuelve vacío, repite el paso 3.

> **El fallo más común:** la cuenta de Facebook con la que entras en
> `developers.facebook.com` tiene que ser **administradora de esa página**. Si
> creas la página con una cuenta y entras al Explorador con otra,
> `me/accounts` sale vacío y parece que has hecho algo mal.

---

## Paso 3 · Claves de Instagram

> **Meta tiene dos vías para esto y no son intercambiables.** Este proyecto
> usa la primera; se elige con `IG_MODO` en el `.env`.
>
> | `IG_MODO` | Vía | Token |
> |---|---|---|
> | `instagram` | **Instagram API con Instagram Login.** El token se genera desde el panel de la app. No necesita el Explorador de la API Graph. | 60 días, renovable |
> | `facebook` | Instagram API con Facebook Login. Necesita página vinculada y el Explorador. | No caduca |
>
> Si en el Explorador el desplegable *Usuario o página* dice **"No hay ninguna
> configuración disponible"**, es que tu app está montada con Instagram Login:
> usa `IG_MODO=instagram` y olvídate del Explorador.

### Vía recomendada: Instagram Login

1. En `developers.facebook.com` → tu app → **Casos de uso**, comprueba que
   tienes **Administrar mensajes y contenido en Instagram**.
2. Entra en ese caso de uso y **añade los permisos**. Los que trae por defecto
   son de lectura y mensajes: añade a mano el que publica, o no podrás postear.

   ```
   instagram_business_basic
   instagram_business_content_publish
   ```

3. **Roles de la aplicación → Roles → Testers de Instagram** → añade
   `pomniii.writes`. Después **acepta la invitación** desde la propia cuenta en
   `instagram.com/accounts/manage_access/` → pestaña *Invitaciones de tester*.
   Este segundo paso se salta todo el mundo, y sin él Meta responde
   *"el rol de desarrollador es insuficiente"*.
4. Vuelve al caso de uso → **2. Genera identificadores de acceso** →
   **Añadir cuenta**. Entra con la cuenta de Instagram y acepta.
5. Te muestra el token **una sola vez**. Cópialo a `IG_ACCESS_TOKEN`. En la
   misma ventana sale el id de la cuenta, que puedes poner en `IG_USER_ID` o
   dejar vacío: en este modo se deduce del token.

Si al autorizar sale `OAuthException: El historial de actividad futura de tu
cuenta fuera de las tecnologías de Meta está desactivado`, hay que activar ese
ajuste en el **Centro de cuentas** → *Tu información y permisos* → *Tu
actividad fuera de las tecnologías de Meta* → *Administrar actividad futura*.
Es un ajuste de privacidad real: al activarlo Meta vuelve a recibir tu
actividad de otras apps y webs. Puedes desactivarlo después de conseguir el
token, con la salvedad de que la renovación de los 60 días quizá vuelva a
pedirlo.

**Renovar el token** (cada 60 días, o antes):

```bash
python -m src.cli renovar
```

Imprime uno nuevo para pegar en el `.env` y en los secrets de GitHub. No lo
escribe solo a propósito: es una credencial y vive en dos sitios distintos.

### Vía alternativa: Facebook Login

En [developers.facebook.com](https://developers.facebook.com) → *Mis apps* →
*Crear app* → tipo **Business**. Dentro, añade el producto **Instagram**.

Abre el **Graph API Explorer**, selecciona tu app y pide estos permisos:

```
instagram_basic  instagram_content_publish  pages_show_list  pages_read_engagement
```

Ahora saca los dos valores:

**`IG_USER_ID`** — el id numérico de tu cuenta (no el @):

```
GET /me/accounts                                → copia el id de tu página
GET /{id-de-la-pagina}?fields=instagram_business_account
```

**`IG_ACCESS_TOKEN`** — aquí hay un detalle que ahorra mucho trabajo. El token
que da el Explorer caduca en 1 hora, y el "de larga duración" caduca en 60
días. Pero si conviertes el de larga duración en **token de página**, ese no
caduca nunca:

```
1) GET /oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id={app-id}&client_secret={app-secret}
     &fb_exchange_token={token-corto-del-explorer}
   → devuelve el token de usuario de 60 días

2) GET /{id-de-la-pagina}?fields=access_token
     &access_token={token-de-60-dias}
   → devuelve el token de PÁGINA, que no expira
```

Usa el del paso 2 como `IG_ACCESS_TOKEN` y no tendrás que renovarlo cada dos
meses. Si te saltas este truco, funcionará igual pero se te caerá en 60 días.

---

## Paso 4 · Bot de Telegram (2 min)

1. En Telegram, habla con **@BotFather** → `/newbot` → ponle nombre.
2. Te da un token tipo `1234:AAE...`. Ese es `TELEGRAM_TOKEN`.
3. Busca tu bot, pulsa **Empezar** y escríbele cualquier cosa.
4. Averigua tu chat:

```bash
python -m src.cli chatid
```

Ese número es `TELEGRAM_CHAT_ID`.

---

## Paso 5 · Hosting de la imagen

Instagram no acepta que le subas un archivo: solo una URL pública que sus
servidores puedan descargar. Saca una clave gratis (sin tarjeta) en
[api.imgbb.com](https://api.imgbb.com/) → `IMGBB_API_KEY`.

---

## Paso 6 · Ponerlo en la nube

Sube el repositorio a GitHub y en *Settings → Secrets and variables → Actions*
crea estos **secrets**:

| Secret | Para qué |
|---|---|
| `IG_ACCESS_TOKEN` | publicar en Instagram |
| `IMGBB_API_KEY` | colgar la imagen en una URL pública |
| `TELEGRAM_TOKEN` | mandarte el aviso |
| `TELEGRAM_CHAT_ID` | a qué chat |
| `IG_USER_ID` | opcional en modo `instagram`: se deduce del token |
| `GH_PAT` | **para que el token se renueve solo** (ver abajo) |

Opcionalmente, dos **variables**: `GRAPH_VERSION` (por defecto `v23.0`) e
`IG_MODO` (por defecto `instagram`).

### El `GH_PAT`, que es el que hace que esto dure

El token de Instagram caduca a los 60 días. `renovar.yml` lo renueva el día 1 de
cada mes, pero renovar devuelve una cadena **nueva**, y un workflow no puede
escribir secrets con el token que GitHub le da por defecto. Hace falta uno tuyo:

1. *Settings → Developer settings → Personal access tokens → **Fine-grained***
2. **Repository access:** solo este repositorio
3. **Permissions → Secrets:** `Read and write`
4. Guárdalo como secret `GH_PAT`

Sin él todo funciona igual, pero **a los 60 días la cuenta se queda muda** y
tendrás que generar un token nuevo a mano. El workflow te avisa por Telegram
cuando eso pase.

Luego entra en la pestaña *Actions* y actívalas. Con eso ya está: los dos
workflows se encargan del resto.

> **Hazlo público si puedes.** En repositorios públicos los minutos de Actions
> son ilimitados; en privados tienes 2.000 al mes y esta configuración gasta
> unos 1.200. No hay nada secreto en el código: las claves viven en Secrets.
> Si lo quieres privado, sube el intervalo de `recoger.yml` a `*/30`.

---

## El día a día

Abres Telegram, escribes `/post`, y en unos minutos está publicado. Nada más.

Si quieres ver antes qué va a salir, `/probar` te manda la tarjeta sin publicar
nada, y `/saltar` descarta ese texto y pasa al siguiente.

Lo único que conviene hacer de vez en cuando es **podar el banco**: mirar los
textos que no te gustan y marcarlos para que no salgan nunca.

```bash
python -m src.cli descartar 0007 0031 0244
```

Cada orden nueva del bot hay que registrarla una vez para que aparezca en el
menú del `/` de Telegram:

```bash
python -m src.cli comandos
```

---

## Comandos

```bash
python -m src.cli escuchar               # atiende las órdenes del bot (/post...)
python -m src.cli comandos               # registra el menú de órdenes del bot
python -m src.cli estado                 # cuántos textos quedan, próximo número
python -m src.cli verificar              # comprueba que las claves funcionan
python -m src.cli probar 0001 0042       # genera tarjetas en local, sin publicar
python -m src.cli descartar 0007 0031    # marca textos para no usarlos nunca
python -m src.cli automatico             # publica el siguiente post ahora mismo
python -m src.cli logos                  # genera los avatares y sellos de marca
python -m src.cli chatid                 # averigua tu TELEGRAM_CHAT_ID
python -m src.cli renovar                # renueva el token y lo imprime
```

Modo con aprobación por botones (si vuelves a él):

```bash
python -m src.cli proponer               # manda la propuesta con botones
python -m src.cli recoger                # lee los botones y actúa
```

Renovar el token guardándolo solo (es lo que corre en la nube):

```bash
python -m herramientas.renovar_token
```

Instalación local (solo si quieres probar en el ordenador):

```bash
pip install -r requirements.txt
copy .env.example .env
```

---

## Los textos

Viven en `data/lotes/*.json`. Se publican **en orden**, empezando por el
`#0001`, y ninguno se repite hasta agotar el banco entero.

Cada texto lleva una **voz**, y las cuatro van entrelazadas para que dos días
seguidos nunca suenen igual:

| Voz | Registro |
|---|---|
| `directa` | Frases cortas y con filo. La que más se comparte. |
| `literaria` | Metáfora e imagen, tono de libro. |
| `nocturna` | Melancólica, estética triste-bonita. La que más comentarios genera. |
| `intima` | Primera persona, como una carta. La que más mensajes privados trae. |

Para añadir más, crea `data/lotes/lote_002.json` con la misma forma. Los ids
tienen que seguir la numeración y no repetirse: el cargador aborta si detecta
un id duplicado, porque un id repetido rompería el registro de "ya publicado".

La tarjeta respeta los saltos de línea (`\n`) tal cual, y atenúa todo el texto
menos la última frase, para que el remate destaque.

---

## Diseño de la tarjeta

1080×1350 (4:5, el formato que más pantalla ocupa en el feed). Se dibuja al
doble de tamaño y se reduce al final, que es la forma barata de conseguir
bordes limpios.

Se toca todo desde `config.json`: paleta, lema, tipografías y estilo de logo
(`monograma`, `plumin` o `punto`).

Las tipografías son libres (licencia OFL) y van dentro del repositorio en
`assets/fonts`, con su licencia al lado. No se usan las de Windows (Georgia,
Segoe Script) porque son de Microsoft y no se pueden redistribuir: los
servidores de GitHub son Ubuntu y allí no existen. Quedan configuradas como
alternativa local. Si se borran:

```bash
python -m herramientas.descargar_fuentes
```

---

## Lo que puede fallar

- **El cron de GitHub llega tarde.** Las tareas programadas de Actions no son
  puntuales: pueden retrasarse entre 5 y 30 minutos si hay cola. Por eso el
  guardián de la hora usa una ventana de 2 horas en vez de una hora exacta.
- **Nadie revisa el texto antes de que salga.** Es la contrapartida del modo
  automático, y es una decisión consciente: los 480 textos están escritos y
  revisados, pero si añades lotes nuevos, léelos antes. Si prefieres una red de
  seguridad, vuelve al modo con aprobación.
- **El token caduca a los 60 días** y se renueva solo el día 1 de cada mes,
  siempre que tengas el `GH_PAT`. Sin él, la cuenta se queda muda a los dos
  meses.
- **Si desactivas la "actividad fuera de las tecnologías de Meta"** después de
  conseguir el token, es posible que la renovación falle por eso. Si un día
  recibes el aviso de que no se pudo renovar, mira ahí primero.
- **Instagram limita a 25 publicaciones al día** por cuenta vía API. Con un post
  diario sobra de largo.
- **Si la publicación falla**, te llega el aviso por Telegram con el enlace al
  detalle del error, y el texto **no** se marca como usado: al día siguiente se
  vuelve a intentar con el mismo.
