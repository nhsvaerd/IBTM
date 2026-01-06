/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_42490191812")

  // remove field
  collection.fields.removeById("select3497176377")

  // remove field
  collection.fields.removeById("json1582643657")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_42490191812")

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "select3497176377",
    "maxSelect": 1,
    "name": "attendance_response",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "attending",
      "not_attending",
      "undetermined"
    ]
  }))

  // add field
  collection.fields.addAt(9, new Field({
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
})
