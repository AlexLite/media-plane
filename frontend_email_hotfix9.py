from pathlib import Path

repls = {
    "Email is required": "Email обязателен",
    "Email is invalid": "Некорректный email",
    "Email updated successfully. Please sign in again.": "Электронная почта успешно обновлена. Пожалуйста, войдите снова.",
    "New email": "Новая электронная почта",
    "Email already exists. Please use a different one.": "Электронная почта уже существует. Используйте другой адрес.",
    "Email validation failed. Please try again.": "Не удалось подтвердить электронную почту. Попробуйте ещё раз.",
    "Unique code": "Уникальный код",
}

for name in ["core-MzsdXu98-CZNqN7xl.js", "translations-CvkTaVxM-DoZ3TC4t.js"]:
    path = Path("frontend-hotfix-email") / name
    text = path.read_text(encoding="utf-8", errors="ignore")
    for old, new in repls.items():
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")
