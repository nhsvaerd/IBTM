/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "bool3458771407",
    "name": "is_host",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "bool3458771407",
    "name": "ishost",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
})
