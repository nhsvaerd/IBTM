/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_42490191812")

  // update field
  collection.fields.addAt(15, new Field({
    "cost": 0,
    "hidden": true,
    "id": "password901924565",
    "max": 64,
    "min": 8,
    "name": "password",
    "pattern": "",
    "presentable": false,
    "required": true,
    "system": true,
    "type": "password"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_42490191812")

  // update field
  collection.fields.addAt(15, new Field({
    "cost": 0,
    "hidden": true,
    "id": "password901924565",
    "max": 0,
    "min": 8,
    "name": "password",
    "pattern": "",
    "presentable": false,
    "required": true,
    "system": true,
    "type": "password"
  }))

  return app.save(collection)
})
