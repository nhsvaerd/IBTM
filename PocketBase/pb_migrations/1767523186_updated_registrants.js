/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4249019181")

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "bool1523858908",
    "name": "is_host",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4249019181")

  // remove field
  collection.fields.removeById("bool1523858908")

  return app.save(collection)
})
