/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1433696524")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_DKkm5L7ueT` ON `responses` (\n  `registrant`,\n  `event`\n)",
      "CREATE INDEX `idx_KeUo2WdS87` ON `responses` (`event`)",
      "CREATE INDEX `idx_68HHlQwCMq` ON `responses` (`attendance_response`)"
    ]
  }, collection)

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_4249019181",
    "hidden": false,
    "id": "relation1712544448",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "registrant",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1433696524")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  // remove field
  collection.fields.removeById("relation1712544448")

  return app.save(collection)
})
