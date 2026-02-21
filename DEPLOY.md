# 🚀 Guía de Despliegue en Producción y Dominio Propio

Para que **MivisShoping** sea una página funcional accesible desde cualquier lugar del mundo sin depender de tu red local, sigue estos 3 pasos maestros.

## 1. Subir el Código a la Nube (GitHub)

La forma más profesional y segura es usar GitHub.

1. Crea una cuenta en [GitHub](https://github.com/).
2. Crea un nuevo repositorio llamado `tienda-mivis`.
3. Abre una terminal en tu carpeta `tiendavirtual` y ejecuta:

```bash
git init
git add .
git commit -m "🚀 Proyecto listo para producción"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/tienda-mivis.git
git push -u origin main
```

## 2. Desplegar en Vercel (Gratis y Ultra Rápido)

Vercel es el hogar natural de Next.js y ofrece certificados SSL (HTTPS) automáticos.

1. Entra en [Vercel.com](https://vercel.com/) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New"** > **"Project"**.
3. Importa el repositorio `tienda-mivis` que acabas de subir.
4. **IMPORTANTE:** En la sección **"Environment Variables"**, copia y pega los valores de tu archivo `.env.local` (clave por clave: `NEXT_PUBLIC_FIREBASE_API_KEY`, etc.).
5. Dale a **"Deploy"**. En 2 minutos estarás en línea con una URL como `tienda-mivis.vercel.app`.

## 3. Conectar tu Dominio Propio (Ej: mivisshoping.com)

Si ya tienes un dominio comprado (en GoDaddy, Namecheap o Google):

1. En el panel de Vercel de tu proyecto, ve a **Settings** > **Domains**.
2. Escribe tu dominio (ej: `www.mivisshoping.com`) y haz clic en **Add**.
3. Vercel te dará unos registros **A** o **CNAME**.
4. Ve al panel de control de tu proveedor de dominios y pega esos registros en la sección **DNS**.
5. ¡Listo! En unas horas tu tienda será accesible desde tu propio dominio con total seguridad.

---
**Nota de Seguridad:** Una vez que la página sea pública, recuerda configurar las "Security Rules" en tu panel de Firebase para proteger tu base de datos contra accesos no autorizados.
