# VK Captcha Solver

> ⚠️ Только для исследований. Обход CAPTCHA нарушает ToS VK. Используйте на свой риск.

---

## Пример использования

```ts
import { CaptchaSolver } from 'vk-captcha-solver';

const solver = new CaptchaSolver();

try {
  const successToken = await solver.solve('https://id.vk.com/not_robot_captcha?...');
  console.log('Токен успеха:', successToken);
} catch (error) {
  console.error('Не удалось решить капчу:', error);
}
```

---

## 🔑 ВАЖНО

❗ Полученный `success_token` **не работает сам по себе**.  
Вы **обязаны** отправить его **вместе с cookie `remixstlid`**, который можно получить с помощью запроса на главную страницу VK.

Без `remixstlid` — сервер VK отклонит токен, даже если он валидный.

---

## 💬 Issues & Pull Requests

Нашёл баг? Хочешь улучшить модуль?  
→ [**Создать Issue**](https://github.com/tripoloski-it/vk-captcha-solver/issues) — для ошибок и предложений.  
→ [**Отправить Pull Request**](https://github.com/tripoloski-it/vk-captcha-solver/pulls) — для доработок и фич.

Ваш вклад ускорит поддержку новых типов капчи и улучшит стабильность.

---

### Telegram: https://t.me/tripoloski_dev