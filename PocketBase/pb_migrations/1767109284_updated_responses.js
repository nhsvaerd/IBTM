/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1433696524")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "select1843596689",
    "maxSelect": 1,
    "name": "attendance_response",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Attending",
      "Not Attending",
      "Uncertain"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1433696524")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "select1843596689",
    "maxSelect": 1,
    "name": "attendance",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Attending",
      "Not Attending",
      "Uncertain"
    ]
  }))

  return app.save(collection)
})
