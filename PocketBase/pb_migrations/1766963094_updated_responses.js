/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1433696524")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "json1582643657",
    "maxSize": 0,
    "name": "additional_responses",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1433696524")

  // remove field
  collection.fields.removeById("json1582643657")

  return app.save(collection)
})
