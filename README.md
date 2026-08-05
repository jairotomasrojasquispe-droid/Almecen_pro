
# BRAHMCO TALLER PRO V4 - SISTEMA VENDIBLE S/2500+ 
## Arquitectura Limpia + Supabase + Electron .EXE + Tiempo Real

### ¿Que es .EXE?
Es tu sistema convertido en programa de Windows como Word o Excel. Doble click y abre sin navegador, sin Chrome, como programa instalado. Es MEJOR para vender porque el cliente siente que compro software profesional instalado, no una pagina web.

### ESTRUCTURA PROFESIONAL (Clean Architecture)
src/
├── domain/entities/Product.js -> Entidades puras (reglas negocio, isLow, faltante)
├── infrastructure/supabase/client.js -> Conexion unica a Supabase (capa infraestructura)
├── application/use-cases/ -> Casos de uso (crear producto, registrar movimiento) - aqui va logica
├── presentation/
│   ├── components/Layout.jsx -> Sidebar, navegacion
│   ├── pages/Dashboard.jsx -> Dashboard con realtime (useRealtime hook) - muestra que comprar
│   ├── pages/Productos.jsx -> CRUD productos con subida foto herramienta a Supabase Storage bucket 'productos'
│   ├── pages/Kardex.jsx -> Historial tiempo real con foto trabajador
│   ├── pages/Auth.jsx -> Login, Crear cuenta, Olvide contraseña, Cambiar contraseña (Supabase Auth)
│   ├── hooks/useRealtime.js -> Hook senior que suscribe a postgres_changes para tiempo real multi-dispositivo
│   └── styles/main.css

electron/main.js -> Convierte web en .EXE

supabase/migrations/001_schema.sql -> Tablas, RLS, Storage buckets

### PASO A PASO INSTALACION EN TU PC (y en PC trabajo)

1. REQUISITOS:
 - Node.js instalado (ya lo tienes)
 - Cuenta Supabase (ya la tienes)

2. CONFIGURAR SUPABASE (5 min):
 - Entra a supabase.com > tu proyecto > SQL Editor
 - Copia y pega el contenido de supabase/migrations/001_schema.sql y dale RUN
 - Ve a Storage y verifica que se crearon buckets 'productos' y 'trabajadores' (publicos)
 - Ve a Authentication > Settings > activa Email Auth
 - Ve a Project Settings > API > copia URL y anon key

3. INSTALAR EN TU PC:
 - Descomprime ZIP en C:\brahmco-pro
 - Abre VS Code en esa carpeta
 - Crea archivo .env en la raiz (copia de .env.example) y pega:
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_key
 - En terminal VS Code:
   npm install
   npm run dev
 - Abre http://localhost:5173 -> veras Login
 - Crea cuenta con Register -> entra con Login -> Dashboard

4. COMO INSTALAR EN PC DEL TRABAJO:
 - OPCION NUBE (recomendada para multi-dispositivo): 
   npm run build
   Luego sube carpeta dist a Vercel (vercel --prod) y te da link https://brahmco-taller.vercel.app
   En PC trabajo solo abres ese link, sin instalar nada, y ves datos en tiempo real
 - OPCION .EXE (para vender como programa instalado):
   npm run dist
   Te genera en carpeta dist_electron/ un instalador Brahmco Taller PRO Setup.exe
   Copia ese .exe a USB, llevalo a PC trabajo, doble click instalar, abre como programa

5. TIEMPO REAL MULTI-DISPOSITIVO:
 - Ya esta implementado con supabase.realtime
 - Si agregas producto en tu PC, en celular de jefe se actualiza solo sin F5
 - Dashboard muestra 🟢 Tiempo Real

6. CUENTAS:
 - Crear cuenta: /register (cualquiera puede, luego tu cambias rol en Supabase a admin/jefe)
 - Olvide contraseña: /forgot -> envia email de Supabase
 - Cambiar contraseña: /reset (usuario logueado) o desde perfil
 - Roles: edita en Supabase table profiles campo role = 'admin'|'jefe'|'almacenero'

### COMO VENDER A S/2500
- Muestras .EXE instalado, no web
- Enseñas: fotos de herramientas, foto de trabajador quien tiene herramienta, dashboard que dice que comprar, tiempo real
- Dices: incluye instalacion, capacitacion, 3 meses soporte
- Entregas: .EXE instalador + link nube + manual

### COMENTARIOS EN CODIGO
Todo el codigo tiene comentarios senior explicando cada widget y funcion

### SEGURIDAD
- RLS activado en Supabase
- Storage publico solo lectura, escritura solo autenticados
- Auth con Supabase (bcrypt, JWT, email confirmacion)

Listo para produccion.
