# Осмотрено — приложение (iOS, Android, веб)

Expo SDK 58 + Expo Router. Лента-свайпы осмотренных машин, избранное, карточка с глубоким отчётом, пропуск покупателя, продажа по ссылке.

```bash
cd mobile
npm install
npx expo start          # телефон: приложение Expo Go или development build
npx expo export --platform web --output-dir dist   # веб-сборка; на сайте лежит в /app
```

- Без `EXPO_PUBLIC_API_URL` всё работает на демо-данных (`src/api/mock.ts`). Эндпоинты — `../docs/openapi.yaml`.
- Разбор ссылок: на вебе — `/api/parse` сайта; в приложении — задать `EXPO_PUBLIC_PARSE_URL`.
- Сборка в магазины — через EAS: `npx eas-cli@latest build -p ios|android` (нужен аккаунт Expo).
- На iOS пропуск в приложении не продаётся (правила App Store, см. `../docs/LAUNCH.md`).
