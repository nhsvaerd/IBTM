/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_gxQzkf4GeP` ON `registrants` (`invite_code`)",
      "CREATE UNIQUE INDEX `idx_2DNj8yzmvC` ON `registrants` (\n  `email`,\n  `event`\n)",
      "CREATE UNIQUE INDEX `idx_yLCuPhmPGT` ON `registrants` (\n  `user`,\n  `event`\n)"
    ]
  }, collection)

  // update field
  collection.fields.addAt(5, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation2341486422",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "user",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_gxQzkf4GeP` ON `registrants` (`invite_code`)",
      "CREATE UNIQUE INDEX `idx_2DNj8yzmvC` ON `registrants` (\n  `email`,\n  `event`\n)",
      "CREATE UNIQUE INDEX `idx_yLCuPhmPGT` ON `registrants` (\n  `registered_user`,\n  `event`\n)"
    ]
  }, collection)

  // update field
  collection.fields.addAt(5, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation2341486422",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "registered_user",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
