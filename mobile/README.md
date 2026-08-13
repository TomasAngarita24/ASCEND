# ASCEND Mobile

Aplicación móvil de ASCEND construida con React Native y TypeScript.

La autenticación usa la API del backend y almacena los tokens en `react-native-keychain`, que utiliza Android Keystore. La URL de desarrollo está en `src/config/api.ts` y debe apuntar a la dirección IP local del computador cuando se use un teléfono físico.

## Ejecutar en Android

Se necesita Android Studio con Android SDK Platform 34, Android SDK Build-Tools 34 y Android SDK Command-line Tools instalados. Configura `ANDROID_HOME` con la ruta del SDK o crea un archivo local `android/local.properties` con la propiedad `sdk.dir`.

1. Inicia PostgreSQL y el backend.
2. Conecta el teléfono y el computador a la misma red Wi-Fi.
3. Activa Opciones de desarrollador y Depuración USB en el teléfono.
4. Conecta el teléfono por USB y confirma que aparece al ejecutar `adb devices`.
5. Inicia el empaquetador con `npm start`.
6. En otra terminal, instala y abre la aplicación con `npm run android`.

Para que el teléfono pueda cargar el código de desarrollo por USB, ejecuta `adb reverse tcp:8081 tcp:8081` después de conectarlo. La API sigue usando la dirección IP definida en `src/config/api.ts`.
