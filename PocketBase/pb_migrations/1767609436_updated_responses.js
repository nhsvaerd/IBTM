/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1433696524")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_KeUo2WdS87` ON `responses` (`event`)",
      "CREATE INDEX `idx_68HHlQwCMq` ON `responses` (`attendance_response`)",
      "CREATE UNIQUE INDEX `idx_9sVBNJSdBs` ON `responses` (`registrant`)"
    ]
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_42490191812",
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
    "indexes": [
      "CREATE INDEX `idx_KeUo2WdS87` ON `responses` (`event`)",
      "CREATE INDEX `idx_68HHlQwCMq` ON `responses` (`attendance_response`)"
    ]
  }, collection)

  // remove field
  collection.fields.removeById("relation1712544448")

  return app.save(collection)
})
