/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // remove field
  collection.fields.removeById("bool4084266552")

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "date2535835892",
    "max": "",
    "min": "",
    "name": "responded_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // update field
  collection.fields.addAt(5, new Field({
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

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "bool4084266552",
    "name": "confirmedattendance",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // remove field
  collection.fields.removeById("date2535835892")

  // update field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "select1048251387",
    "maxSelect": 1,
    "name": "response",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Attending",
      "Uncertain",
      "Not attending"
    ]
  }))

  return app.save(collection)
})
