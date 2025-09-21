import js from "@eslint/js";
import globals from "globals";

export default [
    {
        languageOptions: {
            globals: { ...globals.browser, ...globals.es2022 },
            sourceType: "module",
        }
    },
    js.configs.recommended,
    {
        rules: {
            "no-undef": "error",         // опечатка в переменной Ч сразу ошибка
            "no-unused-vars": "warn",    // предупредит о неиспользуемых
            "eqeqeq": "error"            // всегда === вместо ==
        }
    }
];
