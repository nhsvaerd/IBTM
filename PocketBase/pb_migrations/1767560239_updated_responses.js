/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1433696524")

  // remove field
  collection.fields.removeById("relation1712544448")

  // update field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "select1843596689",
    "maxSelect": 1,
    "name": "attendance_response",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "attending",
      "not_attending",
      "undecided"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1433696524")

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_4042354073",
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
})
