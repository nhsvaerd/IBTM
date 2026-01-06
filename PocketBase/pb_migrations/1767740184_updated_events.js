/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4041782348")

  // update field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "bool775214973",
    "name": "is_private",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4041782348")

  // update field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "bool775214973",
    "name": "is_invite_only",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
})
