/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // update collection data
  unmarshal({
    "createRule": "",
    "deleteRule": "",
    "indexes": [
      "CREATE UNIQUE INDEX `idx_gxQzkf4GeP` ON `registrants` (`invite_code`)",
      "CREATE UNIQUE INDEX `idx_2DNj8yzmvC` ON `registrants` (\n  `email`,\n  `event`\n)",
      "CREATE UNIQUE INDEX `idx_yLCuPhmPGT` ON `registrants` (\n  `registered_user`,\n  `event`\n)"
    ],
    "listRule": "",
    "updateRule": "",
    "viewRule": ""
  }, collection)

  // remove field
  collection.fields.removeById("date2535835892")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // update collection data
  unmarshal({
    "createRule": null,
    "deleteRule": null,
    "indexes": [],
    "listRule": null,
    "updateRule": null,
    "viewRule": null
  }, collection)

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "date2535835892",
    "max": "",
    "min": "",
    "name": "responded_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
})
