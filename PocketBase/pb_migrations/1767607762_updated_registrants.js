/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4249019181")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tokenKey_zvwwicmcd0` ON `registrants2` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_08A8Q8T1A1` ON `registrants2` (`invite_id`)",
      "CREATE UNIQUE INDEX `idx_TFDniDcxyq` ON `registrants2` (`invite_code`)",
      "CREATE UNIQUE INDEX `idx_oCki1G50gf` ON `registrants2` (`password`)",
      "CREATE UNIQUE INDEX `idx_J1Rt2X40HU` ON `registrants2` (\n  `email`,\n  `event`\n)",
      "CREATE UNIQUE INDEX `idx_ptcU8QYEC7` ON `registrants2` (`email`) WHERE `email` != ''"
    ],
    "name": "registrants2"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4249019181")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tokenKey_zvwwicmcd0` ON `registrants` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_08A8Q8T1A1` ON `registrants` (`invite_id`)",
      "CREATE UNIQUE INDEX `idx_TFDniDcxyq` ON `registrants` (`invite_code`)",
      "CREATE UNIQUE INDEX `idx_oCki1G50gf` ON `registrants` (`password`)",
      "CREATE UNIQUE INDEX `idx_J1Rt2X40HU` ON `registrants` (\n  `email`,\n  `event`\n)",
      "CREATE UNIQUE INDEX `idx_ptcU8QYEC7` ON `registrants` (`email`) WHERE `email` != ''"
    ],
    "name": "registrants"
  }, collection)

  return app.save(collection)
})
