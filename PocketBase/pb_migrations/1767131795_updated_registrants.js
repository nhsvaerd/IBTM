/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // update field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "bool3183637990",
    "name": "is_checked_in",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // update field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "bool3183637990",
    "name": "attendance_confirmed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
})
