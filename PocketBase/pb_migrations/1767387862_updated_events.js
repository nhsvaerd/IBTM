/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4041782348")

  // add field
  collection.fields.addAt(13, new Field({
    "hidden": false,
    "id": "date3500824919",
    "max": "",
    "min": "",
    "name": "read_until",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(14, new Field({
    "hidden": false,
    "id": "date4221960274",
    "max": "",
    "min": "",
    "name": "write_until",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4041782348")

  // remove field
  collection.fields.removeById("date3500824919")

  // remove field
  collection.fields.removeById("date4221960274")

  return app.save(collection)
})
