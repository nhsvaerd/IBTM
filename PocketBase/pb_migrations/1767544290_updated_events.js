/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4041782348")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_nweBbe8NyN` ON `events` (`host`)"
    ]
  }, collection)

  // add field
  collection.fields.addAt(15, new Field({
    "hidden": false,
    "id": "bool1542800728",
    "name": "field",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4041782348")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  // remove field
  collection.fields.removeById("bool1542800728")

  return app.save(collection)
})
