module.exports = {
  singleQuote: true,
  trailingComma: 'es5',
  importOrder: [
    '^react$',
    '<THIRD_PARTY_MODULES>',
    '@js/prompt-engine(.*)$',
    '@js/(.*)$',
    '^[./](?!css|svg|png|jpg|mp4|mov|webm)[^.]+$',
    '(.*).(css|svg|png|jpg|mp4|mov|webm)$',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
  plugins: [require('@trivago/prettier-plugin-sort-imports')],
};
