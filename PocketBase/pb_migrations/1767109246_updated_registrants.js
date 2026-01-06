/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // remove field
  collection.fields.removeById("select1048251387")

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "bool3183637990",
    "name": "attendance_confirmed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "select1048251387",
    "maxSelect": 1,
    "name": "attendance_status",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Accepted",
      "Unsure",
      "Declined",
      "Confirmed"
    ]
  }))

  // remove field
  collection.fields.removeById("bool3183637990")

  return app.save(collection)
})
