module.exports = {
  env: { browser: true, es2020: true },

  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:prettier/recommended",
    "prettier",
    "plugin:react/recommended",
    "plugin:promise/recommended",
    "plugin:sonarjs/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],

  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module", project: "tsconfig.json" },

  plugins: [
    "react-refresh",
    "prettier",
    "promise",
    "sonarjs",
    "@typescript-eslint"
  ],

  rules: {
    "react-refresh/only-export-components": "warn",
    "array-callback-return": "error",
    "class-methods-use-this": "error",
    "@typescript-eslint/no-shadow": "error",
    "no-template-curly-in-string": "error",
    "block-scoped-var": "error",
    "curly": ["error", "all"],
    "no-caller": "error",
    "no-array-constructor": "error",
    "complexity": ["warn", 4],
    "no-alert": "error",
    "no-console": "error",
    "no-continue": "error",
    "no-constructor-return": "error",
    "max-depth": ["error", 10],
    "consistent-return": "error",
    "implicit-arrow-linebreak": "off",
    "init-declarations": "error",
    "no-extend-native": "error",
    "no-eval": "error",
    "no-eq-null": "error",
    "no-empty-function": "error",
    "prefer-const": "error",
    "prefer-destructuring": "error",
    "prefer-object-spread": "error",
    "prefer-promise-reject-errors": "error",
    "prefer-regex-literals": "error",
    "prefer-rest-params": "error",
    "prefer-spread": "error",
    "prefer-template": "error",
    "max-lines": "error",
    "max-lines-per-function": "error",
    "max-nested-callbacks": "error",
    "max-params": "error",
    "max-statements": "error",
    "max-statements-per-line": "error",
    "no-implicit-coercion": "error",
    "no-labels": "error",
    "no-implied-eval": "error",
    "no-invalid-this": "error",
    "no-lone-blocks": "error",
    "no-multi-spaces": "error",
    "no-multi-str": "error",
    "no-implicit-globals": "error",
    "func-style": "error",
    "no-new": "error",
    "no-new-func": "error",
    "no-new-wrappers": "error",
    "no-new-symbol": "error",
    "no-new-object": "error",
    "@typescript-eslint/no-use-before-define": "error",
    "jsx-quotes": "error",
    "require-atomic-updates": "error",
    "symbol-description": "error",
    "wrap-iife": "error",
    "yoda": "error",
    "no-underscore-dangle": "error",
    "no-mixed-operators": "error",
    "no-negated-condition": "error",
    "multiline-comment-style": "error",
    "no-param-reassign": "error",
    "no-path-concat": "error",
    "default-case": "error",
    "default-case-last": "error",
    "default-param-last": "error",
    "no-return-assign": "error",
    "dot-notation": "error",
    "no-multi-assign": "error",
    "no-return-await": "error",
    "no-proto": "error",
    "no-self-compare": "error",
    "no-script-url": "error",
    "no-sequences": "error",
    "no-throw-literal": "error",
    "no-unused-expressions": "error",
    "no-useless-call": "error",
    "no-useless-concat": "error",
    "no-useless-return": "error",
    "no-useless-constructor": "error",
    "radix": "error",
    "no-undefined": "error",
    "no-undef-init": "error",
    "no-var": "error",
    "no-void": "error",
    "comma-style": "error",
    "comma-spacing": "error",
    "eol-last": "error",
    "key-spacing": "error",
    "keyword-spacing": "error",
    "new-parens": "error",
    "no-bitwise": "error",
    "no-lonely-if": "error",
    "no-multiple-empty-lines": "error",
    "no-nested-ternary": "error",
    "no-loop-func": "error",
    "no-floating-decimal": "error",
    "no-extra-bind": "error",
    "no-fallthrough": "error",
    "no-inner-declarations": "error",
    "no-invalid-regexp": "error",
    "no-irregular-whitespace": "error",
    "no-loss-of-precision": "error",
    "no-tabs": "error",
    "@typescript-eslint/no-redeclare": "error",
    "no-regex-spaces": "error",
    "no-shadow-restricted-names": "error",
    "no-setter-return": "error",
    "no-sparse-arrays": "error",
    "no-this-before-super": "error",
    "no-trailing-spaces": "error",
    "no-unneeded-ternary": "error",
    "no-unmodified-loop-condition": "error",
    "no-whitespace-before-property": "error",
    "object-curly-newline": "error",
    "constructor-super": "error",
    "object-curly-spacing": ["error", "always"],
    "semi-spacing": "error",
    "semi-style": "error",
    "space-before-blocks": "error",
    "space-in-parens": "error",
    "space-infix-ops": "error",
    "space-unary-ops": "error",
    "spaced-comment": ["error", "always"],
    "switch-colon-spacing": "error",
    "arrow-body-style": ["error", "as-needed"],
    "arrow-parens": ["error", "as-needed"],
    "arrow-spacing": "error",
    "generator-star-spacing": ["error", "after"],
    "no-useless-computed-key": "error",
    "no-useless-rename": "error",
    "no-plusplus": "error",
    "object-shorthand": ["error", "always"],
    "prefer-arrow-callback": "error",
    "rest-spread-spacing": ["error","never"],
    "template-curly-spacing": "error",
    "@typescript-eslint/semi": ["error", "always"],
    "@typescript-eslint/member-delimiter-style": "error",
    "@typescript-eslint/member-ordering": "warn",
    "@typescript-eslint/brace-style": ["error", "1tbs"],
    "@typescript-eslint/indent": "off",
    "@typescript-eslint/func-call-spacing": ["error", "never"],
    "@typescript-eslint/unbound-method": "off",
    "@typescript-eslint/no-useless-constructor": "error",
    "@typescript-eslint/prefer-for-of": "warn",
    "@typescript-eslint/no-parameter-properties": "error",
    "@typescript-eslint/no-unnecessary-type-arguments": "warn",
    "@typescript-eslint/prefer-function-type": "warn",
    "@typescript-eslint/prefer-readonly": "warn",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/camelcase": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "react/no-deprecated": "error",
    "react/no-array-index-key": "error",
    "react/no-danger": "error",
    "react/button-has-type": "error",
    "react/no-multi-comp": "off",
    "react/no-this-in-sfc": "error",
    "react/jsx-no-literals": "off",
    "react/jsx-no-useless-fragment": "error",
    "react/jsx-pascal-case": "error",
    "react/jsx-boolean-value": "error",
    "react/jsx-no-target-blank": "error",
    "react/prefer-es6-class": "off",
    "react/prefer-read-only-props": "error",
    "react/no-string-refs": "error",
    "react-hooks/exhaustive-deps": "error",
    "react/react-in-jsx-scope": "off",

    "prettier/prettier": [
      "error",
      {
        "endOfLine": "lf"
      }
    ],

    "max-len": [
      "error",
      {
        "code": 120
      }
    ],

    "no-duplicate-imports": [
      "warn",
      {
        "includeExports": true
      }
    ],

    "no-else-return": [
      "error",
      {
        "allowElseIf": false
      }
    ],

    "padding-line-between-statements": [
      "error",
      {
        "blankLine": "always",
        "prev": "expression",
        "next": [
          "return",
          "export",
          "if",
          "throw",
          "try",
          "switch"
        ]
      },
      
      {
        "blankLine": "always",
        "prev": "*",
        "next": [
          "multiline-const",
          "multiline-expression"
        ]
      },

      {
        "blankLine": "never",
        "prev": "singleline-const",
        "next": "singleline-const"
      }
    ],

    "lines-between-class-members": [
      "error",
      "always",
      {
        "exceptAfterSingleLine": true
      }
    ],

    "array-bracket-newline": [
      "error",
      {
        "multiline": true
      }
    ],

    "space-before-function-paren": [
      "error",
      {
        "anonymous": "always",
        "named": "never",
        "asyncArrow": "always"
      }
    ],

    "@typescript-eslint/no-extra-parens": [
      "off",
      "all",
      {
        "ignoreJSX": "multi-line"
      }
    ],

    "@typescript-eslint/ban-types": [
      "error",
      {
        "extendDefaults": true,
        "types": {
          "{}": false
        }
      }
    ],

    "@typescript-eslint/quotes": [
      "error",
      "double",
      {
        "avoidEscape": true
      }
    ],

    "react/jsx-filename-extension": [
      "error",
      {
        "extensions": [
          ".tsx"
        ]
      }
    ],

    "react/jsx-curly-brace-presence": [
      "error",
      {
        "props": "never",
        "children": "never"
      }
    ],
  },
}
