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

---

## 🎯 Instrucciones para Futuras Sesiones
1. **Regla de Oro:** Siempre mantener la integridad de las funciones que ya funcionan. No alterar la estructura de colecciones de Firestore (`products`, `sales`, `customers`, `settings`).
2. **Despliegues:** Cada cambio a producción debe verificarse con `npm run build` antes de hacer `git push origin main`, el cual dispara el despliegue automático en Vercel.
3. **Cálculo de Deuda:** Siempre utilizar `calculateCustomerDebt` o asegurar el fallback a la función de cálculo dinámico para evitar desincronizaciones de balance en clientes.
