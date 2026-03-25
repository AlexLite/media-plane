/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export default {
  sidebar: {
    projects: "Проекты",
    pages: "Страницы",
    new_work_item: "Новый рабочий элемент",
    home: "Главная",
    your_work: "Ваша работа",
    inbox: "Входящие",
    workspace: "Рабочие пространства",
    views: "Представления",
    analytics: "Аналитика",
    work_items: "Рабочие элементы",
    cycles: "Циклы",
    modules: "Модули",
    intake: "Предложения",
    drafts: "Черновики",
    favorites: "Избранное",
    pro: "Pro",
    upgrade: "Обновить",
    stickies: "Стикеры",
  },
  auth: {
    common: {
      email: {
        label: "Электронная почта",
        placeholder: "name@company.com",
        errors: {
          required: "Электронная почта обязательна",
          invalid: "Недействительный адрес электронной почты",
        },
      },
      password: {
        label: "Пароль",
        set_password: "Установить пароль",
        placeholder: "Введите пароль",
        confirm_password: {
          label: "Подтвердите пароль",
          placeholder: "Подтвердите пароль",
        },
        current_password: {
          label: "Текущий пароль",
        },
        new_password: {
          label: "Новый пароль",
          placeholder: "Введите новый пароль",
        },
        change_password: {
          label: {
            default: "Сменить пароль",
            submitting: "Смена пароля",
          },
        },
        errors: {
          match: "Пароли не совпадают",
          empty: "Пожалуйста, введите ваш пароль",
          length: "Длина пароля должна быть более 8 символов",
          strength: {
            weak: "Слабый пароль",
            strong: "Сильный пароль",
          },
        },
        submit: "Установить пароль",
        toast: {
          change_password: {
            success: {
              title: "Успех!",
              message: "Пароль успешно изменён.",
            },
            error: {
              title: "Ошибка!",
              message: "Что-то пошло не так. Пожалуйста, попробуйте снова.",
            },
          },
        },
      },
      unique_code: {
        label: "Уникальный код",
        placeholder: "123456",
        paste_code: "Вставьте код, отправленный на вашу электронную почту",
        requesting_new_code: "Запрос нового кода",
        sending_code: "Отправка кода",
      },
      already_have_an_account: "Уже есть аккаунт?",
      login: "Войти",
      create_account: "Создать аккаунт",
      new_to_plane: "Впервые в Plane?",
      back_to_sign_in: "Вернуться к входу",
      resend_in: "Отправить снова через {seconds} секунд",
      sign_in_with_unique_code: "Войти с уникальным кодом",
      forgot_password: "Забыли пароль?",
      sign_up_action: "Регистрация",
      sign_in_action: "Вход",
      no_auth_methods_available: "Нет доступных методов аутентификации",
      no_auth_methods_available_description:
        "Попросите администратора включить аутентификацию для вашего инстанса.",
    },
    landing: {
      work_in_all_dimensions: "Работайте во всех измерениях.",
      welcome_back_to_plane: "С возвращением в Plane.",
      create_your_plane_account: "Создайте аккаунт Plane.",
    },
    legal: {
      sign_up_prefix: "Создавая аккаунт, вы понимаете и соглашаетесь с",
      sign_in_prefix: "Входя в систему, вы понимаете и соглашаетесь с",
      our: "нашими",
      and: "и",
      terms_of_service: "Условиями использования",
      privacy_policy: "Политикой конфиденциальности",
    },
    footer: {
      join_teams_building_with_plane: "Присоединяйтесь к 10 000+ командам, которые строят с Plane",
    },
    sign_up: {
      header: {
        label: "Создайте аккаунт, чтобы начать управлять работой с вашей командой.",
        step: {
          email: {
            header: "Регистрация",
            sub_header: "",
          },
          password: {
            header: "Регистрация",
            sub_header: "Зарегистрируйтесь, используя комбинацию электронная почта-пароль.",
          },
          unique_code: {
            header: "Регистрация",
            sub_header:
              "Зарегистрируйтесь, используя уникальный код, отправленный на указанный выше адрес электронной почты.",
          },
        },
      },
      errors: {
        password: {
          strength: "Попробуйте установить сильный пароль для продолжения",
        },
      },
    },
    sign_in: {
      header: {
        label: "Войдите, чтобы начать управлять работой с вашей командой.",
        step: {
          email: {
            header: "Войти или зарегистрироваться",
            sub_header: "",
          },
          password: {
            header: "Войти или зарегистрироваться",
            sub_header: "Используйте комбинацию электронная почта-пароль для входа.",
          },
          unique_code: {
            header: "Войти или зарегистрироваться",
            sub_header:
              "Войдите, используя уникальный код, отправленный на указанный выше адрес электронной почты.",
          },
        },
      },
    },
    forgot_password: {
      title: "Сбросьте ваш пароль",
      description:
        "Введите подтвержденный адрес электронной почты вашего аккаунта, и мы отправим вам ссылку для сброса пароля.",
      email_sent: "Мы отправили ссылку для сброса на вашу электронную почту",
      send_reset_link: "Отправить ссылку для сброса",
      errors: {
        smtp_not_enabled:
          "Мы видим, что ваш администратор не включил SMTP, мы не сможем отправить ссылку для сброса пароля",
      },
      toast: {
        success: {
          title: "Письмо отправлено",
          message:
            "Проверьте ваши входящие для ссылки на сброс пароля. Если она не появится в течение нескольких минут, проверьте папку спама.",
        },
        error: {
          title: "Ошибка!",
          message: "Что-то пошло не так. Пожалуйста, попробуйте снова.",
        },
      },
    },
    reset_password: {
      title: "Установите новый пароль",
      description: "Обеспечьте безопасность вашего аккаунта с помощью сильного пароля",
    },
    set_password: {
      title: "Обеспечьте безопасность вашего аккаунта",
      description: "Установка пароля помогает вам безопасно входить в систему",
    },
    error_codes: {
      common: {
        sign_in_link: "Войти",
        now_suffix: "сейчас.",
      },
      instance_not_configured: {
        title: "Инстанс не настроен",
        message: "Инстанс не настроен. Обратитесь к администратору.",
      },
      invalid_email: {
        title: "Некорректный email",
        message: "Некорректный email. Попробуйте снова.",
      },
      email_required: {
        title: "Требуется email",
        message: "Укажите email. Попробуйте снова.",
      },
      signup_disabled: {
        title: "Регистрация отключена",
        message: "Регистрация отключена. Обратитесь к администратору.",
      },
      magic_link_login_disabled: {
        title: "Вход по магической ссылке отключен",
        message: "Вход по магической ссылке отключен. Обратитесь к администратору.",
      },
      password_login_disabled: {
        title: "Вход по паролю отключен",
        message: "Вход по паролю отключен. Обратитесь к администратору.",
      },
      user_account_deactivated: {
        title: "Учетная запись деактивирована",
        message: "Учетная запись деактивирована. Обратитесь к администратору.",
      },
      invalid_password: {
        title: "Неверный пароль",
        message: "Неверный пароль. Попробуйте снова.",
      },
      password_too_weak: {
        title: "Слабый пароль",
        message: "Используйте более надежный пароль.",
      },
      smtp_not_configured: {
        title: "SMTP не настроен",
        message: "SMTP не настроен. Обратитесь к администратору.",
      },
      authentication_failed: {
        title: "Ошибка аутентификации",
        message: "Ошибка аутентификации. Попробуйте снова.",
      },
      email_and_password_required: {
        title: "Требуются email и пароль",
        message: "Введите email и пароль. Попробуйте снова.",
      },
      email_and_code_required: {
        title: "Требуются email и код",
        message: "Введите email и код. Попробуйте снова.",
      },
      invalid_magic_code: {
        message: "Неверный код из письма. Попробуйте снова.",
      },
      expired_magic_code: {
        title: "Срок действия кода истек",
        message: "Срок действия кода истек. Запросите новый код.",
      },
      invalid_password_token: {
        title: "Неверный токен пароля",
        message: "Неверный токен сброса пароля.",
      },
      expired_password_token: {
        title: "Срок действия токена истек",
        message: "Срок действия токена сброса истек. Попробуйте снова.",
      },
      password_required: {
        title: "Требуется пароль",
        message: "Введите пароль. Попробуйте снова.",
      },
      incorrect_old_password: {
        title: "Неверный текущий пароль",
        message: "Неверный текущий пароль. Попробуйте снова.",
      },
      invalid_new_password: {
        title: "Некорректный новый пароль",
        message: "Некорректный новый пароль. Попробуйте снова.",
      },
      password_already_set: {
        title: "Пароль уже установлен",
        message: "Пароль уже установлен. Попробуйте снова.",
      },
      oauth_not_configured: {
        title: "OAuth не настроен",
        message: "OAuth не настроен. Обратитесь к администратору.",
      },
      google_not_configured: {
        title: "Google OAuth не настроен",
        message: "Google OAuth не настроен. Обратитесь к администратору.",
      },
      github_not_configured: {
        title: "GitHub OAuth не настроен",
        message: "GitHub OAuth не настроен. Обратитесь к администратору.",
      },
      gitlab_not_configured: {
        title: "GitLab OAuth не настроен",
        message: "GitLab OAuth не настроен. Обратитесь к администратору.",
      },
      google_oauth_provider_error: {
        title: "Ошибка провайдера Google OAuth",
        message: "Ошибка провайдера Google OAuth. Попробуйте снова.",
      },
      github_oauth_provider_error: {
        title: "Ошибка провайдера GitHub OAuth",
        message: "Ошибка провайдера GitHub OAuth. Попробуйте снова.",
      },
      gitlab_oauth_provider_error: {
        title: "Ошибка провайдера GitLab OAuth",
        message: "Ошибка провайдера GitLab OAuth. Попробуйте снова.",
      },
      admin_already_exists: {
        title: "Администратор уже существует",
        message: "Администратор уже существует. Попробуйте снова.",
      },
      admin_required_email_password_first_name: {
        title: "Требуются email, пароль и имя",
        message: "Введите email, пароль и имя. Попробуйте снова.",
      },
      invalid_admin_email: {
        title: "Некорректный email администратора",
        message: "Некорректный email администратора. Попробуйте снова.",
      },
      invalid_admin_password: {
        title: "Некорректный пароль администратора",
        message: "Некорректный пароль администратора. Попробуйте снова.",
      },
      admin_user_deactivated: {
        title: "Учетная запись администратора деактивирована",
        message: "Учетная запись администратора деактивирована.",
      },
      rate_limit_exceeded: {
        title: "Слишком много попыток",
        message: "Превышен лимит попыток. Попробуйте позже.",
      },
      user_already_exist: {
        title: "Пользователь уже существует",
        message_prefix: "Аккаунт уже зарегистрирован.",
      },
      user_does_not_exist: {
        title: "Пользователь не найден",
        message_prefix: "Аккаунт не найден.",
        create_one_link: "Создать аккаунт",
        message_suffix: "чтобы продолжить.",
      },
    },
    sign_out: {
      toast: {
        error: {
          title: "Ошибка!",
          message: "Не удалось выйти. Пожалуйста, попробуйте снова.",
        },
      },
    },
  },
} as const;
