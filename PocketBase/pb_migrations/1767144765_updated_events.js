/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4041782348")

  // remove field
  collection.fields.removeById("relation3856069256")

  // add field
  collection.fields.addAt(12, new Field({
    "hidden": false,
    "id": "json3856069256",
    "maxSize": 0,
    "name": "additional_questions",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4041782348")

  // add field
  collection.fields.addAt(9, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3908775312",
    "hidden": false,
    "id": "relation3856069256",
    "maxSelect": 999,
    "minSelect": 0,
    "name": "additional_questions",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // remove field
  collection.fields.removeById("json3856069256")

  return app.save(collection)
})
