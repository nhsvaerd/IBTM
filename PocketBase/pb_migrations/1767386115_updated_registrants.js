/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "date4059440156",
    "max": "",
    "min": "",
    "name": "access_revoked_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "select4119331924",
    "maxSelect": 1,
    "name": "revoked_reason",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "abuse",
      "spam",
      "policy",
      "other"
    ]
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1366981184",
    "max": 2000,
    "min": 0,
    "name": "revoked_reason_details",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // remove field
  collection.fields.removeById("date4059440156")

  // remove field
  collection.fields.removeById("select4119331924")

  // remove field
  collection.fields.removeById("text1366981184")

  return app.save(collection)
})
