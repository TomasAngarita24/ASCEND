# Mobile (React Native + TypeScript)

Initial scaffold for the ASCEND mobile application.

The rest-timer feature is local to the mobile application. It does not require a backend endpoint and provides start, pause, resume, skip, and duration-adjustment controls. The active-workout screen starts the timer automatically when a set is marked as completed.

Authentication uses the backend API and stores access and refresh tokens through `react-native-keychain`, which uses the iOS Keychain and Android Keystore. The development API URL is configured in `src/config/api.ts`; update it when running on a physical device.
