# Reglas y Memoria del Workspace: MIVIS STUDIO GLAM

- Proyecto: MIVIS STUDIO GLAM (tienda virtual y sistema de gestión integral).
- Repositorio: https://github.com/dmazasuxe-gif/tienda-mivis.git
- Despliegue en producción: Vercel (conectado a rama main) -> www.mivisstudioglam.com
- Backend: Firebase (mivisshopping) con Firestore, Auth y Storage.

## Principios Clave:
1. NUNCA romper código o flujos existentes que ya funcionan en producción.
2. Los saldos de clientes y cuentas por cobrar deben calcularse de forma segura usando `calculateCustomerDebt` para evitar errores de tipo `NaN`.
3. Todos los inputs monetarios deben sanitizarse con fallback numérico a 0.
4. Antes de cada despliegue a producción, validar compilación local con `npm run build`.
