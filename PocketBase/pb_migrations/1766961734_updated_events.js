/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4041782348")

  // remove field
  collection.fields.removeById("json137995794")

  // remove field
  collection.fields.removeById("number3964511928")

  // remove field
  collection.fields.removeById("text3106812221")

  // remove field
  collection.fields.removeById("json241476314")

  // add field
  collection.fields.addAt(10, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_4042354073",
    "hidden": false,
    "id": "relation3475444733",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "host",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(11, new Field({
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

  // update field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3586931371",
    "max": 120,
    "min": 0,
    "name": "location_label",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4041782348")

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "json137995794",
    "maxSize": 0,
    "name": "custom_questions",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "number3964511928",
    "max": null,
    "min": null,
    "name": "admission_price",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3106812221",
    "max": 120,
    "min": 0,
    "name": "hosted_by",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "hidden": false,
    "id": "json241476314",
    "maxSize": 0,
    "name": "custom_attributes",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // remove field
  collection.fields.removeById("relation3475444733")

  // remove field
  collection.fields.removeById("relation3856069256")

  // update field
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3586931371",
    "max": 120,
    "min": 0,
    "name": "location_title",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})
