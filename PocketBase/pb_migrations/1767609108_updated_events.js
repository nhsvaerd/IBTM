/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4041782348")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_JjJzIuNrJF` ON `events` (`owning_host`)"
    ]
  }, collection)

  // remove field
  collection.fields.removeById("bool1542800728")

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_42490191812",
    "hidden": false,
    "id": "relation2103652596",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "owning_host",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4041782348")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  // add field
  collection.fields.addAt(14, new Field({
    "hidden": false,
    "id": "bool1542800728",
    "name": "field",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // remove field
  collection.fields.removeById("relation2103652596")

  return app.save(collection)
})
