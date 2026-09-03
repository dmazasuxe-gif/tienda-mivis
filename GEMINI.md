# 💎 MIVIS STUDIO GLAM — Memoria y Contexto del Proyecto

## 📌 Identidad y Datos del Proyecto
- **Nombre Oficial de la Marca:** Mivis Studio Glam
- **Dominio en Producción:** [www.mivisstudioglam.com](https://www.mivisstudioglam.com)
- **Repositorio Remoto:** `https://github.com/dmazasuxe-gif/tienda-mivis.git` (rama `main`)
- **Hosting / Despliegue:** Vercel (`tienda-mivis-917w`) conectado mediante Git Integration a la rama `main`
- **Base de Datos / Backend:** Firebase (Proyecto: `mivisshopping`) — Authentication, Firestore y Storage

---

## 🛠️ Stack Tecnológico
- **Framework:** Next.js 16 (App Router + Turbopack)
- **Lenguaje:** TypeScript (Strict Mode)
- **Estilos:** Tailwind CSS
- **Iconografía y Animaciones:** Lucide React, Framer Motion
- **Utilidades:** date-fns, jsPDF, jspdf-autotable, html5-qrcode, JsBarcode, react-to-print

---

## 📂 Arquitectura y Módulos del Sistema
- `src/app/page.tsx`: Catálogo público interactivo con checkout directo hacia WhatsApp de la tienda.
- `src/app/login/page.tsx`: Pantalla de inicio de sesión administrativo con autenticación de Firebase.
- `src/app/admin/page.tsx`: Dashboard administrativo con métricas en tiempo real (ventas, ganancias, inventario valorizado, cuentas por cobrar) y generador de reportes en PDF con membrete de Mivis Studio Glam.
- `src/app/admin/inventory/page.tsx`: Gestión de productos, categorías, precios de costo/venta, fotos y stock.
- `src/app/admin/sales/page.tsx`: Punto de Venta (POS) rápido para ventas al contado y crédito con generación de cuotas y asignación a clientes.
- `src/app/admin/customers/page.tsx`: Módulo de Clientes y Créditos. Registro de cuentas individuales, historial de prendas/prendas manuales, pagos individuales o agrupados (Efectivo, Yape, Plin, Transferencia) y recordatorios automáticos por WhatsApp.
- `src/context/DataContext.tsx`: Núcleo central de datos reactivo con suscripciones en tiempo real a Firestore (`onSnapshot`) para productos, ventas, clientes y configuraciones.

---

## 🩺 Registro de Soluciones Históricas

### Corrección del Saldo `S/ NaN` en Clientes y Créditos (Septiembre 2026)
- **Problema:** En el módulo de clientes, el cuadro **SUMA TOTAL DE DEUDA** y la tarjeta **TOTAL DEUDA** mostraban `S/ NaN` (por ejemplo, en el cliente *NORITA*), y el estado aparecía erróneamente en verde como `AL DÍA`.
- **Causa Raíz:** Al editar precios o descuentos en el modal de cliente, los campos vacíos generaban `NaN` en `parseFloat("")`, lo cual se guardaba en el campo `balance` del cliente en Firestore. Una vez guardado `NaN` en Firestore, cualquier operación aritmética posterior (`increment`, sumas, `.toFixed(2)`) quedaba congelada en `NaN`.
- **Solución Implementada:**
  1. Se implementó `computeCustomerDebtFromSales` / `calculateCustomerDebt` en `DataContext.tsx` para calcular dinámicamente la deuda real desde las ventas y pagos.
  2. Se integró un mecanismo de **auto-reparación (auto-healing)** que detecta clientes con saldo `NaN` en Firestore y lo repara automáticamente con el cálculo real.
  3. Se blindaron todos los métodos de actualización (`updateSaleItemDetail`, `updatePaymentDetail`, `updateGroupedPayment`, `deleteSale`, `deletePaymentFromSale`, etc.) y todos los inputs de la vista de clientes.
  4. Se desplegó a producción en Vercel mediante commit `38675e5` en la rama `main`.

### Optimización y Corrección del Login en Nuevos Dispositivos (Septiembre 2026)
- **Problema:** En dispositivos nuevos o navegadores en modo incógnito no se podía iniciar sesión usando el usuario y contraseña ya creados, mostrando erróneamente *"Usuario o contraseña no autorizados o inexistentes"*, mientras que en dispositivos previamente utilizados sí permitía el ingreso.
- **Causa Raíz:** En `src/app/login/page.tsx`, el formulario validaba las credenciales de forma síncrona contra el arreglo en memoria `settings.authorizedAdmins` antes de consultar a Firebase Auth. En dispositivos con caché local (`IndexedDB`) ya existía la lista real, pero en dispositivos nuevos `settings` se inicializaba con valores por defecto hasta que Firestore descargaba la configuración por internet. Si el usuario enviaba el formulario antes de terminar la descarga, la búsqueda fallaba localmente y rechazaba el acceso sin llegar a consultar a Firebase Authentication.
- **Solución Implementada:**
  1. Se implementó una **vía rápida directa (fast-path)** que autentica inmediatamente con Firebase Authentication en la nube (~200ms) sin depender de la descarga de Firestore ni del caché local.
  2. Se configuró un **fallback inteligente con consulta remota en tiempo real** (`getDoc`) para usuarios recién creados en Ajustes que requieran auto-registro inicial.
  3. Se añadió blindaje en `src/lib/firebase.ts` con fallback de inicialización ante navegadores que bloquean o restringen `IndexedDB` (como navegación privada en móviles).
  4. Se removió el bloqueo innecesario del botón de login para evitar congelamientos por latencia.

### Optimización de Velocidad y Carga Rápida en Nuevos Dispositivos (Septiembre 2026)
- **Problema:** La página pública demoraba en cargar productos en otros dispositivos/navegadores, y al ingresar al sistema administrativo tardaba varios minutos en una pantalla de carga congelada (*"Cargando Mivis Studio Glam..."*).
- **Causa Raíz:**
  1. `persistentMultipleTabManager()` de Firestore coordinaba pestañas mediante bloqueos (`navigator.locks`). En pestañas en segundo plano o navegadores móviles (iOS/Android) donde el navegador suspende timers, los bloqueos retenían la conexión, provocando esperas de hasta 5 minutos antes de responder las consultas en nuevas pestañas.
  2. En `src/app/admin/layout.tsx`, la interfaz se bloqueaba a pantalla completa mientras `sales` y `customers` terminaban de descargar todas las colecciones.
  3. En la página pública, mientras los productos (que contienen imágenes en Base64 de ~5.5MB) se descargaban por internet, se mostraba erróneamente *"No hay productos disponibles"*.
- **Solución Implementada:**
  1. Se cambió el gestor de caché de Firestore a `persistentSingleTabManager({})` en `src/lib/firebase.ts`, eliminando la contención de bloqueos entre pestañas y acelerando la conexión inicial.
  2. Se añadió temporizador de seguridad de liberación automática (3.5s) en `DataContext.tsx` para evitar que la interfaz administrativa quede bloqueada indefinidamente por latencia de red.
  3. Se desacopló el bloqueo a pantalla completa en `AdminLayout`: una vez autenticado el usuario, el panel y barra lateral se renderizan inmediatamente con un indicador no intrusivo mientras los datos sincronizan en segundo plano.
  4. Se implementó caché de productos en `localStorage` para cargas inmediatas (0ms) en visitas recurrentes y un Skeleton Loader elegante con animación shimmer para la primera visita en frío.

### Corrección de Notificaciones de Error de Despliegue en Vercel (Septiembre 2026)
- **Problema:** El usuario recibía correos de Vercel indicando que el despliegue fallaba, a pesar de que el sitio oficial `tienda-mivis-917w` (`www.mivisstudioglam.com`) estaba activo y en verde.
- **Causa Raíz:** El repositorio en GitHub (`tienda-mivis`) estaba conectado simultáneamente a 3 proyectos en la cuenta de Vercel: `tienda-mivis-917w` (producción oficial con dominio), `tienda-mivis` y un proyecto antiguo llamado `tiendavirtual`. Este último proyecto no tenía cargadas las variables de entorno de Firebase en su panel de Vercel. Al pre-renderizar `/_not-found` durante el build en Vercel, Firebase arrojaba `auth/invalid-api-key`, provocando que Vercel enviara un correo de alerta de fallo por el proyecto `tiendavirtual`.
- **Solución Implementada:**
  1. Se incorporaron fallbacks con las credenciales públicas del proyecto en `src/lib/firebase.ts`. Esto garantiza que cualquier proyecto o entorno (con o sin variables de entorno configuradas) compile limpiamente en Next.js sin errores de inicialización de Firebase.
  2. Se verificó mediante Vercel CLI que los 3 proyectos vinculados (`tienda-mivis-917w`, `tienda-mivis` y `tiendavirtual`) ahora compilan y despliegan en estado **● Ready** al 100%.

### Solución Definitiva de Carga de Productos en Nuevos Dispositivos (Septiembre 2026)
- **Problema:** En dispositivos nuevos o navegadores diferentes, el catálogo de productos parecía congelado o no terminaba de cargar los productos.
- **Causa Raíz:**
  1. `persistentSingleTabManager` bloqueaba pestañas adicionales o recargas en navegadores donde no se liberaban los bloqueos de IndexedDB.
  2. La colección de productos contiene 47 artículos con fotos en base64 (~5.55 MB). Intentar serializar 5.55 MB con `JSON.stringify` en `localStorage` superaba la cuota de 5 MB de los navegadores móviles y bloqueaba el hilo principal de JavaScript (UI freeze).
  3. `onSnapshot` demoraba en establecer la conexión WebChannel para descargar 5.55 MB de datos continuos sin un mecanismo de respaldo HTTP directo.
- **Solución Implementada:**
  1. Se restableció `persistentMultipleTabManager()` en `src/lib/firebase.ts`, el cual soporta múltiples pestañas y recargas sin bloqueos de contención.
  2. Se implementó una vía rápida con `getDocs(collection(db, 'products'))` en `DataContext.tsx`: realiza una petición HTTP directa que descarga los productos en ~300ms y los renderiza de inmediato en pantalla.
  3. Se mantuvo `onSnapshot` en paralelo para sincronizaciones en tiempo real sin bloquear el primer renderizado.
  4. Se removió la serialización excesiva a `localStorage` que causaba caídas de frames y errores de cuota en móviles.
  5. Se incorporó un temporizador de seguridad de 3.5s para `isProductsLoading`.

### Solución de Raíz: Carga Universal en Todos los Dispositivos y Resiliencia de Cuota Firestore (Septiembre 2026)
- **Problema:** Al acceder al sistema desde otros dispositivos (celular, tablet, otra computadora o ventana privada/incógnito), no cargaban los clientes, productos, ventas ni el dashboard, mostrando un sistema vacío o *"No hay productos disponibles"*.
- **Causa Raíz:**
  1. **Agotamiento de cuota diaria en Firestore (`Quota limit exceeded`):** El proyecto Firebase (`mivisshopping`) en el Plan Spark gratuito tiene un límite de 50,000 lecturas diarias. Se agotó por doble lectura simultánea (`getDocs` + `onSnapshot`) en cada visita.
  2. **Comportamiento dispar entre dispositivos:** En la computadora habitual, Firestore cargaba los datos desde su caché interna en IndexedDB; pero en nuevos dispositivos o ventanas privadas sin caché previa, las peticiones remotas eran rechazadas por Firestore (`Quota exceeded`), provocando que el código vaciara el estado a listas vacías `[]`.
- **Solución Implementada:**
  1. **Caché Universal Nativo en IndexedDB (`src/lib/cache.ts`):** Sistema de almacenamiento local persistente de alta capacidad para productos, clientes, ventas y configuraciones sin límite de 5 MB ni caídas de frame.
  2. **Hidratación Instantánea (0ms) en `DataContext.tsx`:** Al abrir la aplicación en cualquier dispositivo, se hidrata inmediatamente desde IndexedDB. La pantalla nunca queda en blanco.
  3. **Eliminación de la Doble Lectura:** Se eliminó la llamada duplicada `getDocs` manteniendo un único flujo reactivo con `onSnapshot`, reduciendo el consumo de lecturas de Firestore en un 50%.
  4. **Protección contra Bloqueos y Bucles:** Ante fallos de cuota o falta de conexión, el sistema mantiene los datos locales sin vaciar las listas. Se blindó la auto-reparación de balance con `hasAutoHealedRef` para evitar loops de escritura y lectura.
  5. **Doble Fallback de Dominio en Login:** Se incorporó soporte para `@mivisshopping.com` y `@mivisshoping.com` en la vía rápida de autenticación directa.

---

## 🎯 Instrucciones para Futuras Sesiones
1. **Regla de Oro:** Siempre mantener la integridad de las funciones que ya funcionan. No alterar la estructura de colecciones de Firestore (`products`, `sales`, `customers`, `settings`).
2. **Despliegues:** Cada cambio a producción debe verificarse con `npm run build` antes de hacer `git push origin main`, el cual dispara el despliegue automático en Vercel.
3. **Cálculo de Deuda:** Siempre utilizar `calculateCustomerDebt` o asegurar el fallback a la función de cálculo dinámico para evitar desincronizaciones de balance en clientes.
