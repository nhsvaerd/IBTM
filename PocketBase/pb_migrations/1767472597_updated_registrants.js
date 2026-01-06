/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4249019181")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tokenKey_zvwwicmcd0` ON `registrants` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_08A8Q8T1A1` ON `registrants` (`invite_id`)",
      "CREATE UNIQUE INDEX `idx_TFDniDcxyq` ON `registrants` (`invite_code`)",
      "CREATE UNIQUE INDEX `idx_email_pbc_4249019181` ON `registrants` (`email`) WHERE `email` != ''"
    ]
  }, collection)

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1579384326",
    "max": 0,
    "min": 0,
    "name": "name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4249019181")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tokenKey_zvwwicmcd0` ON `registrants` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_08A8Q8T1A1` ON `registrants` (`invite_id`)",
      "CREATE UNIQUE INDEX `idx_email_pbc_4249019181` ON `registrants` (`email`) WHERE `email` != ''",
      "CREATE UNIQUE INDEX `idx_TFDniDcxyq` ON `registrants` (`invite_code`)"
    ]
  }, collection)

  // remove field
  collection.fields.removeById("text1579384326")

  return app.save(collection)
})
