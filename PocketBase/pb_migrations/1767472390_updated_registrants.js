/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4249019181")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tokenKey_zvwwicmcd0` ON `registrants` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_08A8Q8T1A1` ON `registrants` (`invite_id`)",
      "CREATE UNIQUE INDEX `idx_email_pbc_4249019181` ON `registrants` (`email`) WHERE `email` != ''",
      "CREATE UNIQUE INDEX `idx_TFDniDcxyq` ON `registrants` (`invite_code`)"
    ],
    "passwordAuth": {
      "identityFields": [
        "invite_id"
      ]
    }
  }, collection)

  // add field
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "date1323900893",
    "max": "",
    "min": "",
    "name": "checked_in_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4249019181")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tokenKey_zvwwicmcd0` ON `registrants` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_08A8Q8T1A1` ON `registrants` (`invite_id`)",
      "CREATE UNIQUE INDEX `idx_email_pbc_4249019181` ON `registrants` (`email`) WHERE `email` != ''"
    ],
    "passwordAuth": {
      "identityFields": [
        "email"
      ]
    }
  }, collection)

  // remove field
  collection.fields.removeById("date1323900893")

  return app.save(collection)
})
