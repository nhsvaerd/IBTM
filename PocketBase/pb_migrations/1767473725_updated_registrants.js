/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4249019181")

  // update collection data
  unmarshal({
    "authRule": "  access_revoked_at = \"\""
  }, collection)

  // update field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "[a-z0-9]{10}",
    "hidden": false,
    "id": "text3930158919",
    "max": 10,
    "min": 10,
    "name": "invite_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // update field
  collection.fields.addAt(2, new Field({
    "cost": 0,
    "hidden": true,
    "id": "password901924565",
    "max": 40,
    "min": 16,
    "name": "password",
    "pattern": "",
    "presentable": false,
    "required": true,
    "system": true,
    "type": "password"
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1864495378",
    "max": 50,
    "min": 6,
    "name": "invite_code",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4249019181")

  // update collection data
  unmarshal({
    "authRule": ""
  }, collection)

  // update field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "[a-z0-9]{8}",
    "hidden": false,
    "id": "text3930158919",
    "max": 8,
    "min": 8,
    "name": "invite_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // update field
  collection.fields.addAt(2, new Field({
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

  // update field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1864495378",
    "max": 50,
    "min": 30,
    "name": "invite_code",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})
