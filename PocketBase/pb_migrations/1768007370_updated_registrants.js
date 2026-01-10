/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_42490191812")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tokenKey_1xkldq5u5v` ON `registrants` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_email_1xkldq5u5v` ON `registrants` (`email`) WHERE `email` != ''",
      "CREATE UNIQUE INDEX `idx_aaHz7Xltda` ON `registrants` (`invite_id`)",
      "CREATE UNIQUE INDEX `idx_vKt2xsbkhT` ON `registrants` (\n  `registrant_email`,\n  `event`\n) WHERE registrant_email != '' ",
      "CREATE INDEX `idx_WqZCuRRHao` ON `registrants` (`event`)",
      "CREATE INDEX `idx_4FminYCPu8` ON `registrants` (`user`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_42490191812")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tokenKey_1xkldq5u5v` ON `registrants` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_email_1xkldq5u5v` ON `registrants` (`email`) WHERE `email` != ''",
      "CREATE UNIQUE INDEX `idx_aaHz7Xltda` ON `registrants` (`invite_id`)",
      "CREATE UNIQUE INDEX `idx_vKt2xsbkhT` ON `registrants` (\n  `registrant_email`,\n  `event`\n) WHERE 'registrant_email' != '' ",
      "CREATE INDEX `idx_WqZCuRRHao` ON `registrants` (`event`)",
      "CREATE INDEX `idx_4FminYCPu8` ON `registrants` (`user`)"
    ]
  }, collection)

  return app.save(collection)
})
