module.exports = {
  extends: [
    // add more generic rulesets here, such as:
    // 'eslint:recommended',
    "prettier",
    "plugin:@typescript-eslint/recommended",
  ],
  parserOptions: { parser: "@typescript-eslint/parser" },
  overrides: [
    {
      files: ["*.ts"],
    },
  ],
  root: true,
  rules: {
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-non-null-assertion": "off",
    "simple-import-sort/exports": "error",
    "simple-import-sort/imports": "error",
    "unused-imports/no-unused-imports": "error",
  },
  plugins: ["simple-import-sort", "@typescript-eslint", "unused-imports"],
  ignorePatterns: [
    "**/node_modules",
    "**/dist",
  ],
};
