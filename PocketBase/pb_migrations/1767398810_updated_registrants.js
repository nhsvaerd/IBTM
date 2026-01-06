/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_gxQzkf4GeP` ON `registrants1` (`invite_code`)",
      "CREATE UNIQUE INDEX `idx_2DNj8yzmvC` ON `registrants1` (\n  `email`,\n  `event`\n)",
      "CREATE UNIQUE INDEX `idx_yLCuPhmPGT` ON `registrants1` (\n  `user`,\n  `event`\n)"
    ],
    "name": "registrants1"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_gxQzkf4GeP` ON `registrants` (`invite_code`)",
      "CREATE UNIQUE INDEX `idx_2DNj8yzmvC` ON `registrants` (\n  `email`,\n  `event`\n)",
      "CREATE UNIQUE INDEX `idx_yLCuPhmPGT` ON `registrants` (\n  `user`,\n  `event`\n)"
    ],
    "name": "registrants"
  }, collection)

  return app.save(collection)
})
